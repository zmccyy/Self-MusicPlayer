import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Server root (server/ directory). */
export const SERVER_ROOT = path.resolve(__dirname, '..');

/** Directory that holds all runtime data (audio files, covers, sqlite db). */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(SERVER_ROOT, 'data');

export const MUSIC_DIR = path.join(DATA_DIR, 'music');
export const COVER_DIR = path.join(DATA_DIR, 'covers');
export const DB_FILE = path.join(DATA_DIR, 'music-player.db');

/** Where the built frontend lives in production (served statically). */
export const FRONTEND_DIST_DIR = path.resolve(SERVER_ROOT, '..', 'music-player-react', 'dist');

export const PORT = Number(process.env.PORT ?? 3799);

/** Max upload size per request, in bytes (200 MB). */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.ogg',
  '.oga',
  '.opus',
  '.flac',
  '.aac',
  '.m4a',
  '.mp4',
  '.webm',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.webm': 'audio/webm',
};

export function mimeForExtension(ext: string): string {
  return MIME_BY_EXTENSION[ext.toLowerCase()] ?? 'application/octet-stream';
}
