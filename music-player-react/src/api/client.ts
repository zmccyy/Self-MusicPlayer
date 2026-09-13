/**
 * Typed client for the music-player backend (server/).
 * All paths are same-origin (`/api/...`) — in dev Vite proxies to the server,
 * in production the server hosts the built frontend itself.
 */

export interface ApiTrack {
  id: string
  title: string
  artist: string
  album: string | null
  albumArtist: string | null
  genre: string | null
  year: number | null
  trackNo: number | null
  discNo: number | null
  duration: number
  format: string | null
  fileSize: number
  bitrate: number | null
  sampleRate: number | null
  hasCover: boolean
  hasLyric: boolean
  source: 'local' | 'netease'
  remoteId: string | null
  createdAt: string
  url: string
  coverUrl: string | null
}

export interface ApiPlaylist {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  trackCount: number
  trackIds: string[]
}

import type { Song } from '../types/song'
import type { Playlist } from '../types/playlist'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, init)
  } catch {
    throw new ApiError(0, '无法连接到音乐服务，请确认后端已启动')
  }
  if (!res.ok) {
    let message = `请求失败 (HTTP ${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // keep default message
    }
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as T
}

function json(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  }
}

export function trackToSong(track: ApiTrack): Song {
  return {
    id: track.id,
    name: track.title,
    artist: track.artist,
    album: track.album ?? '未知专辑',
    duration: track.duration,
    url: track.url,
    cover: track.coverUrl,
    addedAt: Date.parse(track.createdAt) || 0,
    source: track.source === 'netease' ? 'online' : 'local',
    year: track.year,
    genre: track.genre,
  }
}

export function playlistFromApi(playlist: ApiPlaylist): Playlist {
  return {
    id: playlist.id,
    name: playlist.name,
    category: playlist.description,
    songs: playlist.trackIds,
    createdAt: Date.parse(playlist.createdAt) || undefined,
    updatedAt: Date.parse(playlist.updatedAt) || undefined,
  }
}

// ---------- tracks ----------

export async function fetchTracks(query = ''): Promise<Song[]> {
  const search = query ? `?query=${encodeURIComponent(query)}` : ''
  const data = await request<{ tracks: ApiTrack[] }>(`/api/tracks${search}`)
  return data.tracks.map(trackToSong)
}

export async function uploadTracks(files: File[]): Promise<{ added: Song[]; errors: string[] }> {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  const data = await request<{ added: ApiTrack[]; errors: { fileName: string; error: string }[] }>(
    '/api/tracks',
    { method: 'POST', body: form },
  )
  return {
    added: data.added.map(trackToSong),
    errors: data.errors.map((e) => `${e.fileName}: ${e.error}`),
  }
}

export async function deleteTrack(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/tracks/${id}`, { method: 'DELETE' })
}

export interface ScanResult {
  scanned: number
  added: number
  skipped: number
  failed: number
  errors: { fileName: string; error: string }[]
}

export async function scanLibrary(dirPath: string): Promise<ScanResult> {
  return request<ScanResult>(
    '/api/library/scan',
    json({ method: 'POST', body: JSON.stringify({ path: dirPath }) }),
  )
}

export async function updateTrack(
  id: string,
  patch: { title?: string; artist?: string; album?: string; genre?: string; year?: number },
): Promise<Song> {
  const data = await request<{ track: ApiTrack }>(`/api/tracks/${id}`, json({ method: 'PATCH', body: JSON.stringify(patch) }))
  return trackToSong(data.track)
}

export interface LyricPayload {
  trackId: string
  lyric: string | null
  translation: string | null
  source: string
}

export async function fetchTrackLyric(trackId: string): Promise<LyricPayload> {
  return request<LyricPayload>(`/api/tracks/${trackId}/lyric`)
}

export async function saveTrackLyric(
  trackId: string,
  content: string,
  source = 'manual',
  translation?: string | null,
): Promise<void> {
  await request(
    `/api/tracks/${trackId}/lyric`,
    json({
      method: 'POST',
      body: JSON.stringify({ content, source, translation: translation ?? undefined }),
    }),
  )
}

// ---------- playlists ----------

export async function fetchPlaylists(): Promise<Playlist[]> {
  const data = await request<{ playlists: ApiPlaylist[] }>('/api/playlists')
  return data.playlists.map(playlistFromApi)
}

export async function createPlaylist(name: string, description = ''): Promise<Playlist> {
  const data = await request<{ playlist: ApiPlaylist }>(
    '/api/playlists',
    json({ method: 'POST', body: JSON.stringify({ name, description }) }),
  )
  return playlistFromApi(data.playlist)
}

export async function updatePlaylist(
  id: string,
  patch: { name?: string; description?: string },
): Promise<Playlist> {
  const data = await request<{ playlist: ApiPlaylist }>(
    `/api/playlists/${id}`,
    json({ method: 'PATCH', body: JSON.stringify(patch) }),
  )
  return playlistFromApi(data.playlist)
}

export async function deletePlaylist(id: string): Promise<void> {
  await request(`/api/playlists/${id}`, { method: 'DELETE' })
}

export async function addTracksToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
  await request(
    `/api/playlists/${playlistId}/tracks`,
    json({ method: 'POST', body: JSON.stringify({ trackIds }) }),
  )
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
  await request(`/api/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' })
}

export async function reorderPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
  await request(
    `/api/playlists/${playlistId}/tracks/order`,
    json({ method: 'PUT', body: JSON.stringify({ trackIds }) }),
  )
}

// ---------- netease proxy ----------

export interface OnlineSong {
  id: string
  name: string
  artists: string
  album: string | null
  duration: number
  coverUrl: string | null
}

export async function searchNetease(keyword: string, limit = 20): Promise<OnlineSong[]> {
  const data = await request<{ songs: OnlineSong[] }>(
    `/api/netease/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`,
  )
  return data.songs
}

export interface NeteaseLyrics {
  songId: string
  lrc: string | null
  translation: string | null
}

export async function fetchNeteaseLyrics(songId: string): Promise<NeteaseLyrics> {
  return request<NeteaseLyrics>(`/api/netease/lyrics/${songId}`)
}
