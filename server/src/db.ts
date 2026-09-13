import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { COVER_DIR, DB_FILE, DATA_DIR, MUSIC_DIR } from './config.js';

export interface TrackRow {
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
  fileName: string;
  fileSize: number;
  bitrate: number | null;
  sampleRate: number | null;
  hasCover: 0 | 1;
  hasLyric: 0 | 1;
  source: 'local' | 'netease';
  remoteId: string | null;
  /** SHA-1 of file content, used to skip duplicate imports. */
  checksum: string | null;
  createdAt: string;
}

export interface PlaylistRow {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '未知艺术家',
  album TEXT,
  album_artist TEXT,
  genre TEXT,
  year INTEGER,
  track_no INTEGER,
  disc_no INTEGER,
  duration REAL NOT NULL DEFAULT 0,
  format TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  bitrate INTEGER,
  sample_rate INTEGER,
  has_cover INTEGER NOT NULL DEFAULT 0,
  has_lyric INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'local',
  remote_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (playlist_id, track_id)
);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_order ON playlist_tracks(playlist_id, position);

CREATE TABLE IF NOT EXISTS lyrics (
  track_id TEXT PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'embedded'
);
`;

/**
 * Additive migrations for databases created before a column existed.
 * Each entry runs at most once; failures (column already present) are ignored.
 */
const MIGRATIONS: string[] = [
  'ALTER TABLE tracks ADD COLUMN checksum TEXT',
];

function runMigrations(conn: DatabaseSync): void {
  for (const sql of MIGRATIONS) {
    try {
      conn.exec(sql);
    } catch {
      // Column already exists — nothing to do.
    }
  }
}

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(MUSIC_DIR, { recursive: true });
  fs.mkdirSync(COVER_DIR, { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  runMigrations(db);
  return db;
}

/** Thin query helpers on top of node:sqlite with positional parameters. */

export function queryAll<T>(sql: string, ...params: (string | number | null)[]): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[];
}

export function queryOne<T>(sql: string, ...params: (string | number | null)[]): T | undefined {
  return getDb().prepare(sql).get(...params) as unknown as T | undefined;
}

/** Map a raw tracks row (snake_case columns) to the camelCase TrackRow shape. */
export function mapTrackRow(row: Record<string, unknown>): TrackRow {
  return {
    id: String(row.id),
    title: String(row.title),
    artist: String(row.artist),
    album: (row.album as string) ?? null,
    albumArtist: (row.album_artist as string) ?? null,
    genre: (row.genre as string) ?? null,
    year: (row.year as number) ?? null,
    trackNo: (row.track_no as number) ?? null,
    discNo: (row.disc_no as number) ?? null,
    duration: Number(row.duration ?? 0),
    format: (row.format as string) ?? null,
    fileName: String(row.file_name),
    fileSize: Number(row.file_size ?? 0),
    bitrate: (row.bitrate as number) ?? null,
    sampleRate: (row.sample_rate as number) ?? null,
    hasCover: row.has_cover === 1 ? 1 : 0,
    hasLyric: row.has_lyric === 1 ? 1 : 0,
    source: row.source === 'netease' ? 'netease' : 'local',
    remoteId: (row.remote_id as string) ?? null,
    checksum: (row.checksum as string) ?? null,
    createdAt: String(row.created_at),
  };
}

/** queryAll + mapTrackRow shorthand for `SELECT * FROM tracks` style queries. */
export function queryTrackRows(sql: string, ...params: (string | number | null)[]): TrackRow[] {
  return queryAll<Record<string, unknown>>(sql, ...params).map(mapTrackRow);
}

export function runSql(sql: string, ...params: (string | number | null)[]): { changes: number } {
  const result = getDb().prepare(sql).run(...params);
  return { changes: Number(result.changes) };
}

/** Run fn inside a transaction; rolls back on throw. */
export function inTransaction(fn: () => void): void {
  const conn = getDb();
  conn.exec('BEGIN');
  try {
    fn();
    conn.exec('COMMIT');
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}

/** Only for tests: drop the cached connection. */
export function closeDb(): void {
  db?.close();
  db = null;
}
