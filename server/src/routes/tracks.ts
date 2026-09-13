import crypto, { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import type { Request, Response } from 'express';
import { COVER_DIR, MAX_UPLOAD_BYTES, MUSIC_DIR, mimeForExtension } from '../config.js';
import { inTransaction, mapTrackRow, queryOne, queryTrackRows, runSql, type TrackRow } from '../db.js';
import { ApiError, asyncHandler, DuplicateImportError } from '../lib/http.js';
import { fileExtension, isSupportedAudioFile, parseAudioFile } from '../services/metadata.js';

export interface TrackDto {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  albumArtist: string | null;
  genre: string | null;
  year: number | null;
  trackNo: number | null;
  discNo: number | null;
  duration: number;
  format: string | null;
  fileSize: number;
  bitrate: number | null;
  sampleRate: number | null;
  hasCover: boolean;
  hasLyric: boolean;
  source: 'local' | 'netease';
  remoteId: string | null;
  createdAt: string;
  url: string;
  coverUrl: string | null;
}

export function toTrackDto(row: TrackRow): TrackDto {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    albumArtist: row.albumArtist,
    genre: row.genre,
    year: row.year,
    trackNo: row.trackNo,
    discNo: row.discNo,
    duration: row.duration,
    format: row.format,
    fileSize: row.fileSize,
    bitrate: row.bitrate,
    sampleRate: row.sampleRate,
    hasCover: row.hasCover === 1,
    hasLyric: row.hasLyric === 1,
    source: row.source,
    remoteId: row.remoteId,
    createdAt: row.createdAt,
    url: `/api/tracks/${row.id}/stream`,
    coverUrl: row.hasCover === 1 ? `/api/tracks/${row.id}/cover` : null,
  };
}

const SORTABLE_FIELDS: Record<string, string> = {
  title: 'title',
  artist: 'artist',
  album: 'album',
  duration: 'duration',
  createdAt: 'created_at',
  trackNo: 'track_no',
};

const upload = multer({
  storage: multer.diskStorage({}),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 50 },
});

export function getTrackRow(id: string): TrackRow {
  const row = queryOne<Record<string, unknown>>('SELECT * FROM tracks WHERE id = ?', id);
  if (!row) throw new ApiError(404, `Track not found: ${id}`);
  return mapTrackRow(row);
}

function sha1File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export const tracksRouter = Router();

tracksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    const sortField = typeof req.query.sort === 'string' ? req.query.sort : 'createdAt';
    const sortDir = req.query.dir === 'asc' ? 'ASC' : req.query.dir === 'desc' ? 'DESC' : 'DESC';
    const column = SORTABLE_FIELDS[sortField] ?? 'created_at';

    let sql = 'SELECT * FROM tracks';
    const params: string[] = [];
    if (query) {
      sql += ' WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?';
      const like = `%${query}%`;
      params.push(like, like, like);
    }
    sql += ` ORDER BY ${column} ${sortDir}, title ASC`;

    res.json({ tracks: queryTrackRows(sql, ...params).map(toTrackDto) });
  }),
);

tracksRouter.post(
  '/',
  upload.array('files'),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw new ApiError(400, 'No files uploaded (field name must be "files")');
    }

    const added: TrackDto[] = [];
    const errors: { fileName: string; error: string }[] = [];

    for (const file of files) {
      try {
        if (!isSupportedAudioFile(file.originalname)) {
          throw new Error(
            `不支持的音频格式: ${path.extname(file.originalname) || file.originalname}`,
          );
        }
        added.push(await importFile(file.path, file.originalname));
      } catch (err) {
        errors.push({
          fileName: file.originalname,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        await fsp.rm(file.path, { force: true }).catch(() => {});
      }
    }

    res.status(added.length > 0 ? 201 : 400).json({ added, errors });
  }),
);

/** Copy a parsed audio file into the library and persist its metadata. */
export async function importFile(sourcePath: string, originalName: string): Promise<TrackDto> {
  const checksum = await sha1File(sourcePath);
  if (queryOne<{ id: string }>('SELECT id FROM tracks WHERE checksum = ?', checksum)) {
    throw new DuplicateImportError('曲库中已存在相同内容的文件');
  }
  const parsed = await parseAudioFile(sourcePath, path.basename(originalName));
  const id = crypto.randomUUID();
  const ext = fileExtension(originalName) || fileExtension(sourcePath);
  const fileName = `${id}${ext}`;
  const targetPath = path.join(MUSIC_DIR, fileName);
  // copyFile (not rename): the source may live on another drive.
  await fsp.copyFile(sourcePath, targetPath);
  const stat = await fsp.stat(targetPath);

  if (parsed.cover) {
    const coverExt = parsed.cover.mime.includes('png') ? 'png' : 'jpg';
    await fsp.writeFile(path.join(COVER_DIR, `${id}.${coverExt}`), parsed.cover.data);
  }

  const now = new Date().toISOString();
  inTransaction(() => {
    runSql(
      `INSERT INTO tracks (
        id, title, artist, album, album_artist, genre, year, track_no, disc_no,
        duration, format, file_name, file_size, bitrate, sample_rate,
        has_cover, has_lyric, source, remote_id, checksum, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local', NULL, ?, ?)`,
      id,
      parsed.title ?? path.basename(originalName),
      parsed.artist ?? '未知艺术家',
      parsed.album,
      parsed.albumArtist,
      parsed.genre,
      parsed.year,
      parsed.trackNo,
      parsed.discNo,
      parsed.duration,
      ext.replace('.', ''),
      fileName,
      stat.size,
      parsed.bitrate,
      parsed.sampleRate,
      parsed.cover ? 1 : 0,
      parsed.lyrics ? 1 : 0,
      checksum,
      now,
    );
    if (parsed.lyrics) {
      runSql('INSERT INTO lyrics (track_id, content, source) VALUES (?, ?, ?)', id, parsed.lyrics, 'embedded');
    }
  });

  return toTrackDto(getTrackRow(id));
}

tracksRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ track: toTrackDto(getTrackRow(String(req.params.id))) });
  }),
);

tracksRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = getTrackRow(String(req.params.id));
    const body = (req.body ?? {}) as Record<string, unknown>;
    const next = {
      title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : row.title,
      artist: typeof body.artist === 'string' && body.artist.trim() ? body.artist.trim() : row.artist,
      album: typeof body.album === 'string' ? body.album.trim() || null : row.album,
      genre: typeof body.genre === 'string' ? body.genre.trim() || null : row.genre,
      year: typeof body.year === 'number' ? Math.round(body.year) : row.year,
    };
    runSql(
      'UPDATE tracks SET title = ?, artist = ?, album = ?, genre = ?, year = ? WHERE id = ?',
      next.title,
      next.artist,
      next.album,
      next.genre,
      next.year,
      row.id,
    );
    res.json({ track: toTrackDto(getTrackRow(row.id)) });
  }),
);

tracksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = getTrackRow(String(req.params.id));
    await removeTrackCompletely(row.id);
    res.json({ ok: true });
  }),
);

/** Remove a track row plus its audio/cover/lyric artifacts. */
export async function removeTrackCompletely(id: string): Promise<void> {
  const row = getTrackRow(id);
  runSql('DELETE FROM tracks WHERE id = ?', row.id);
  await fsp.rm(path.join(MUSIC_DIR, row.fileName), { force: true }).catch(() => {});
  for (const ext of ['.jpg', '.png']) {
    await fsp.rm(path.join(COVER_DIR, `${row.id}${ext}`), { force: true }).catch(() => {});
  }
}

tracksRouter.get(
  '/:id/stream',
  (req: Request, res: Response, next: (err?: unknown) => void) => {
    const row = getTrackRow(String(req.params.id));
    const filePath = path.join(MUSIC_DIR, row.fileName);
    if (!fs.existsSync(filePath)) {
      next(new ApiError(410, `Audio file missing for track ${row.id}`));
      return;
    }
    res.setHeader('Content-Type', mimeForExtension(fileExtension(row.fileName) || row.format || ''));
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(filePath, { acceptRanges: true }, (err) => {
      if (err && !res.headersSent) next(err);
    });
  },
);

tracksRouter.get(
  '/:id/cover',
  asyncHandler(async (req, res) => {
    const row = getTrackRow(String(req.params.id));
    if (row.hasCover !== 1) throw new ApiError(404, 'Track has no embedded cover');
    for (const ext of ['.jpg', '.png']) {
      const coverPath = path.join(COVER_DIR, `${row.id}${ext}`);
      if (fs.existsSync(coverPath)) {
        res.setHeader('Content-Type', ext === '.png' ? 'image/png' : 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        res.sendFile(coverPath);
        return;
      }
    }
    throw new ApiError(404, 'Cover file missing');
  }),
);

tracksRouter.get(
  '/:id/lyric',
  asyncHandler(async (req, res) => {
    const row = getTrackRow(String(req.params.id));
    const content = queryOne<{ content: string; translation: string | null; source: string }>(
      'SELECT content, translation, source FROM lyrics WHERE track_id = ?',
      row.id,
    );
    res.json({
      trackId: row.id,
      lyric: content?.content ?? null,
      translation: content?.translation ?? null,
      source: content?.source ?? 'none',
    });
  }),
);

tracksRouter.post(
  '/:id/lyric',
  asyncHandler(async (req, res) => {
    const row = getTrackRow(String(req.params.id));
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    if (!content.trim()) throw new ApiError(400, 'lyric content is required');
    const translation =
      typeof req.body?.translation === 'string' && req.body.translation.trim()
        ? req.body.translation
        : null;
    const source =
      req.body?.source === 'manual' || req.body?.source === 'external' ? req.body.source : 'manual';
    runSql(
      'INSERT OR REPLACE INTO lyrics (track_id, content, translation, source) VALUES (?, ?, ?, ?)',
      row.id,
      content,
      translation,
      source,
    );
    runSql('UPDATE tracks SET has_lyric = 1 WHERE id = ?', row.id);
    res.status(201).json({ ok: true, trackId: row.id, source, hasTranslation: translation !== null });
  }),
);
