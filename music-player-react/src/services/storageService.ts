import Dexie, { type Table } from 'dexie'
import type { Playlist } from '../types/playlist'
import type { Song } from '../types/song'
import type { Lyric } from '../types/lyric'

/**
 * 本地存储（IndexedDB）访问层
 *
 * 与你现有原生实现对齐：
 * - DB 名：MusicPlayerDB
 * - version：2
 * - stores：
 *   - songs: id, name, artist
 *   - playlists: id, name
 *   - lyrics: songId（阶段2再接入）
 */
class MusicPlayerDB extends Dexie {
  songs!: Table<Song, string>
  playlists!: Table<Playlist, string>
  lyrics!: Table<Lyric, string>

  constructor() {
    super('MusicPlayerDB')
    this.version(3).stores({
      songs: 'id,name,artist',
      playlists: 'id,name',
      lyrics: 'id,songId',
    })
  }
}

export const storageService = new MusicPlayerDB()

export async function getAllSongs(): Promise<Song[]> {
  return storageService.table<Song, string>('songs').toArray()
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  return storageService.table<Playlist, string>('playlists').toArray()
}

export async function upsertSong(song: Song): Promise<void> {
  await storageService.table<Song, string>('songs').put(song)
}

export async function upsertPlaylist(playlist: Playlist): Promise<void> {
  await storageService.table<Playlist, string>('playlists').put(playlist)
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  await storageService.table<Playlist, string>('playlists').delete(playlistId)
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  const playlist = await storageService.table<Playlist, string>('playlists').get(playlistId)
  if (!playlist) return
  if (!playlist.songs.includes(songId)) {
    playlist.songs.push(songId)
    await storageService.table<Playlist, string>('playlists').put(playlist)
  }
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  const playlist = await storageService.table<Playlist, string>('playlists').get(playlistId)
  if (!playlist) return
  playlist.songs = playlist.songs.filter((id) => id !== songId)
  await storageService.table<Playlist, string>('playlists').put(playlist)
}
