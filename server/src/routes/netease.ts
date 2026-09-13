import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import fsp from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Router } from 'express';
import { ApiError, asyncHandler } from '../lib/http.js';
import { importFile, removeTrackCompletely } from './tracks.js';

const NETEASE_BASE = 'https://music.163.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export interface NetEaseSearchSong {
  /** NetEase song id, used for streaming/lyrics lookups. */
  id: string;
  name: string;
  artists: string;
  album: string | null;
  /** Duration in seconds. */
  duration: number;
  coverUrl: string | null;
  /** 0 = free, 1 = free trial, 8 = VIP-only. */
  fee: number;
}

async function neteaseFetch(pathname: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(pathname, NETEASE_BASE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Referer: `${NETEASE_BASE}/`,
      Cookie: 'appver=2.9.7; platform=PC;',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new ApiError(502, `NetEase upstream failed: HTTP ${res.status}`);
  return res.json();
}

interface RawNeteaseSong {
  id?: number | string;
  name?: string;
  duration?: number;
  fee?: number;
  artists?: { name?: string }[];
  album?: { name?: string; picUrl?: string; artist?: { img1v1Url?: string } };
}

function normalizeSong(raw: RawNeteaseSong): NetEaseSearchSong | null {
  if (raw.id == null || !raw.name) return null;
  const artists = (raw.artists ?? [])
    .map((a) => a?.name)
    .filter((n): n is string => Boolean(n))
    .join(' / ');
  return {
    id: String(raw.id),
    name: raw.name,
    artists: artists || '未知艺术家',
    album: raw.album?.name ?? null,
    duration: typeof raw.duration === 'number' ? Math.round(raw.duration / 1000) : 0,
    coverUrl:
      raw.album?.picUrl ??
      raw.album?.artist?.img1v1Url ??
      (raw.artists?.[0] as unknown as { img1v1Url?: string } | undefined)?.img1v1Url ??
      null,
    fee: typeof raw.fee === 'number' ? raw.fee : -1,
  };
}

export const neteaseRouter = Router();

neteaseRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    if (!keyword) throw new ApiError(400, 'keyword is required');

    const data = (await neteaseFetch('/api/search/get', {
      s: keyword,
      type: '1',
      limit: String(limit),
      offset: '0',
    })) as { result?: { songs?: RawNeteaseSong[]; songCount?: number } };

    const songs = (data.result?.songs ?? [])
      .map(normalizeSong)
      .filter((s): s is NetEaseSearchSong => s !== null);
    res.json({ songs, total: data.result?.songCount ?? songs.length });
  }),
);

neteaseRouter.get(
  '/lyrics/:songId',
  asyncHandler(async (req, res) => {
    const songId = String(req.params.songId);
    if (!/^\d+$/.test(songId)) throw new ApiError(400, 'songId must be numeric');
    const data = (await neteaseFetch('/api/song/lyric', {
      id: songId,
      lv: '1',
      kv: '1',
      tv: '-1',
    })) as { lrc?: { lyric?: string }; tlyric?: { lyric?: string } };
    res.json({
      songId,
      lrc: data.lrc?.lyric ?? null,
      translation: data.tlyric?.lyric ?? null,
    });
  }),
);

/**
 * Redirect to NetEase's public song URL. The upstream 302s to the real audio
 * file (or a short placeholder clip for VIP-only tracks); the browser follows
 * the redirect itself so Range requests keep working end to end.
 */
neteaseRouter.get(
  '/stream/:songId',
  (req, res) => {
    const songId = String(req.params.songId);
    if (!/^\d+$/.test(songId)) throw new ApiError(400, 'songId must be numeric');
    res.redirect(302, `${NETEASE_BASE}/song/media/outer/url?id=${encodeURIComponent(songId)}`);
  },
);

/** Minimum plausible full-song size; VIP placeholder clips are far smaller. */
const MIN_DOWNLOAD_BYTES = 300 * 1024;

neteaseRouter.post(
  '/download/:songId',
  asyncHandler(async (req, res) => {
    const songId = String(req.params.songId);
    if (!/^\d+$/.test(songId)) throw new ApiError(400, 'songId must be numeric');
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '未知歌曲';
    const artists = typeof req.body?.artists === 'string' ? req.body.artists.trim() : '未知艺术家';
    const durationSec = typeof req.body?.durationSec === 'number' ? req.body.durationSec : 0;

    // Follow the outer-URL redirect chain server-side and stream to a temp file.
    const target = await fetch(`${NETEASE_BASE}/song/media/outer/url?id=${encodeURIComponent(songId)}`, {
      headers: { 'User-Agent': UA, Referer: `${NETEASE_BASE}/` },
      redirect: 'follow',
      signal: AbortSignal.timeout(60_000),
    });
    if (!target.ok) {
      throw new ApiError(502, `上游返回 HTTP ${target.status}（歌曲可能为 VIP 或已下架）`);
    }
    const contentType = target.headers.get('content-type') ?? '';
    if (!contentType.includes('audio') && !contentType.includes('octet-stream')) {
      throw new ApiError(502, `上游返回了非音频内容（${contentType.split(';')[0]}），歌曲可能为 VIP`);
    }

    const tmpDir = fsp.mkdtemp(path.join(os.tmpdir(), 'netease-dl-'));
    const tmpPath = path.join(await tmpDir, `${songId}.mp3`);
    try {
      await pipeline(
        Readable.fromWeb(target.body as import('node:stream/web').ReadableStream),
        fs.createWriteStream(tmpPath),
      );
      const stat = await fsp.stat(tmpPath);
      if (stat.size < MIN_DOWNLOAD_BYTES) {
        throw new ApiError(502, '下载内容过小，可能只是 VIP 试听片段，已放弃入库');
      }
      const track = await importFile(tmpPath, `${artists} - ${name}.mp3`);
      // VIP 试听片段码率很高但只有 ~30s：用搜索结果中的时长做交叉验证。
      if (durationSec > 0 && track.duration > 0 && track.duration < durationSec * 0.5) {
        await removeTrackCompletely(track.id);
        throw new ApiError(502, '上游只提供了试听片段（时长不足），该歌曲可能为 VIP，已放弃入库');
      }
      res.status(201).json({ track });
    } finally {
      await fsp.rm(tmpPath, { force: true }).catch(() => {});
      await fsp.rm(await tmpDir, { force: true, recursive: true }).catch(() => {});
    }
  }),
);
