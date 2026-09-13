import { Router } from 'express';
import { ApiError, asyncHandler } from '../lib/http.js';

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
