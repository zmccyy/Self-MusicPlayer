import crypto from 'node:crypto';
import { Router } from 'express';
import { inTransaction, queryAll, queryOne, queryTrackRows, runSql, type PlaylistRow } from '../db.js';
import { ApiError, asyncHandler } from '../lib/http.js';
import { toTrackDto } from './tracks.js';

export interface PlaylistDto {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  trackCount: number;
  /** Track ids in play order, so clients can render without extra round trips. */
  trackIds: string[];
}

function playlistFromRaw(row: Record<string, unknown>): PlaylistRow {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPlaylistRow(row: PlaylistRow): PlaylistDto {
  const trackIds = queryAll<{ track_id: string }>(
    'SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
    row.id,
  ).map((r) => r.track_id);
  return { ...row, trackCount: trackIds.length, trackIds };
}

function getPlaylistRow(id: string): PlaylistRow {
  const row = queryOne<Record<string, unknown>>('SELECT * FROM playlists WHERE id = ?', id);
  if (!row) throw new ApiError(404, `Playlist not found: ${id}`);
  return playlistFromRaw(row);
}

function orderedTracks(playlistId: string) {
  return queryTrackRows(
    `SELECT t.* FROM tracks t
     JOIN playlist_tracks pt ON pt.track_id = t.id
     WHERE pt.playlist_id = ?
     ORDER BY pt.position ASC`,
    playlistId,
  ).map(toTrackDto);
}

/** Re-pack consecutive positions 0..n-1 from a list of track ids. */
function writeOrder(playlistId: string, trackIds: string[]): void {
  const now = new Date().toISOString();
  inTransaction(() => {
    runSql('DELETE FROM playlist_tracks WHERE playlist_id = ?', playlistId);
    trackIds.forEach((trackId, position) => {
      runSql(
        'INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)',
        playlistId,
        trackId,
        position,
        now,
      );
    });
    runSql('UPDATE playlists SET updated_at = ? WHERE id = ?', now, playlistId);
  });
}

export const playlistsRouter = Router();

playlistsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = queryAll<Record<string, unknown>>('SELECT * FROM playlists ORDER BY created_at ASC');
    res.json({ playlists: rows.map(playlistFromRaw).map(mapPlaylistRow) });
  }),
);

playlistsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) throw new ApiError(400, 'Playlist name is required');
    const description = typeof req.body?.description === 'string' ? req.body.description : '';
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    runSql(
      'INSERT INTO playlists (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      id,
      name,
      description,
      now,
      now,
    );
    res.status(201).json({ playlist: mapPlaylistRow(getPlaylistRow(id)) });
  }),
);

playlistsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const playlist = getPlaylistRow(String(req.params.id));
    res.json({ playlist: mapPlaylistRow(playlist), tracks: orderedTracks(playlist.id) });
  }),
);

playlistsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = getPlaylistRow(String(req.params.id));
    const name =
      typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : row.name;
    const description =
      typeof req.body?.description === 'string' ? req.body.description : row.description;
    runSql(
      'UPDATE playlists SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      name,
      description,
      new Date().toISOString(),
      row.id,
    );
    res.json({ playlist: mapPlaylistRow(getPlaylistRow(row.id)) });
  }),
);

playlistsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = getPlaylistRow(String(req.params.id));
    runSql('DELETE FROM playlists WHERE id = ?', row.id);
    res.json({ ok: true });
  }),
);

playlistsRouter.post(
  '/:id/tracks',
  asyncHandler(async (req, res) => {
    const playlist = getPlaylistRow(String(req.params.id));
    const trackIds = Array.isArray(req.body?.trackIds) ? (req.body.trackIds as string[]) : [];
    if (trackIds.length === 0) throw new ApiError(400, 'trackIds must be a non-empty array');

    let position =
      queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM playlist_tracks WHERE playlist_id = ?', playlist.id)
        ?.n ?? 0;
    const now = new Date().toISOString();
    let addedCount = 0;
    for (const trackId of trackIds) {
      if (!queryOne('SELECT 1 FROM tracks WHERE id = ?', trackId)) {
        throw new ApiError(404, `Track not found: ${trackId}`);
      }
      const result = runSql(
        'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)',
        playlist.id,
        trackId,
        position,
        now,
      );
      if (result.changes > 0) position += 1;
      addedCount += result.changes;
    }
    runSql('UPDATE playlists SET updated_at = ? WHERE id = ?', now, playlist.id);
    res.status(201).json({ added: addedCount, tracks: orderedTracks(playlist.id) });
  }),
);

playlistsRouter.delete(
  '/:id/tracks/:trackId',
  asyncHandler(async (req, res) => {
    const playlist = getPlaylistRow(String(req.params.id));
    const result = runSql(
      'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?',
      playlist.id,
      String(req.params.trackId),
    );
    if (result.changes === 0) throw new ApiError(404, 'Track not in playlist');

    const remaining = queryAll<{ track_id: string }>(
      'SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
      playlist.id,
    ).map((r) => r.track_id);
    writeOrder(playlist.id, remaining);
    res.json({ ok: true, tracks: orderedTracks(playlist.id) });
  }),
);

playlistsRouter.put(
  '/:id/tracks/order',
  asyncHandler(async (req, res) => {
    const playlist = getPlaylistRow(String(req.params.id));
    const trackIds = Array.isArray(req.body?.trackIds) ? (req.body.trackIds as string[]) : [];
    if (trackIds.length === 0) throw new ApiError(400, 'trackIds must be a non-empty array');
    const current = new Set(
      queryAll<{ track_id: string }>(
        'SELECT track_id FROM playlist_tracks WHERE playlist_id = ?',
        playlist.id,
      ).map((r) => r.track_id),
    );
    for (const trackId of trackIds) {
      if (!current.has(trackId)) throw new ApiError(400, `Track ${trackId} is not in this playlist`);
    }
    writeOrder(playlist.id, trackIds);
    res.json({ ok: true, tracks: orderedTracks(playlist.id) });
  }),
);
