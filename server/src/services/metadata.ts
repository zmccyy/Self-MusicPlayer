import { parseFile, type IAudioMetadata } from 'music-metadata';
import { SUPPORTED_AUDIO_EXTENSIONS } from '../config.js';

export interface ParsedAudio {
  title: string | null;
  artist: string | null;
  album: string | null;
  albumArtist: string | null;
  genre: string | null;
  year: number | null;
  trackNo: number | null;
  discNo: number | null;
  duration: number;
  bitrate: number | null;
  sampleRate: number | null;
  /** Cover image bytes with mime type, if the file embeds one. */
  cover: { data: Buffer; mime: string } | null;
  /** Embedded lyrics (USLT/lyrics tag), if present. */
  lyrics: string | null;
}

function firstOf(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Extract common metadata + embedded lyrics from an audio file. */
export async function parseAudioFile(filePath: string, fileName: string): Promise<ParsedAudio> {
  const meta: IAudioMetadata = await parseFile(filePath, { duration: true });
  const common = meta.common;
  const coverPicture = common.picture?.[0];

  const baseName = fileName.replace(/\.[^.]+$/, '');
  // Split "Artist - Title" style file names when tags are missing.
  const dashParts = baseName.includes(' - ') ? baseName.split(' - ') : null;

  return {
    title: firstOf(common.title) ?? (dashParts ? dashParts.slice(1).join(' - ').trim() : baseName),
    artist:
      firstOf(common.artist) ??
      firstOf(common.albumartist) ??
      dashParts?.[0]?.trim() ??
      '未知艺术家',
    album: firstOf(common.album),
    albumArtist: firstOf(common.albumartist),
    genre: firstOf(common.genre),
    year: toNumber(common.year),
    trackNo: toNumber(common.track?.no),
    discNo: toNumber(common.disk?.no),
    duration: meta.format.duration ?? 0,
    bitrate: meta.format.bitrate != null ? Math.round(meta.format.bitrate / 1000) : null,
    sampleRate: meta.format.sampleRate ?? null,
    cover:
      coverPicture && coverPicture.data
        ? { data: Buffer.from(coverPicture.data), mime: coverPicture.format || 'image/jpeg' }
        : null,
    lyrics: firstOf(common.lyrics?.map((tag) => tag.text).filter((t): t is string => Boolean(t))),
  };
}

export function isSupportedAudioFile(fileName: string): boolean {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0) return false;
  return SUPPORTED_AUDIO_EXTENSIONS.has(fileName.slice(dot).toLowerCase());
}

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : '';
}
