import { create } from 'zustand'
import type { Playlist } from '../types/playlist'
import type { Song } from '../types/song'
import {
  addSongToPlaylist as addSongToPlaylistFromDB,
  deletePlaylist as deletePlaylistFromDB,
  getAllPlaylists,
  getAllSongs,
  removeSongFromPlaylist as removeSongFromPlaylistFromDB,
  upsertPlaylist as upsertPlaylistFromDB,
} from '../services/storageService'

type PlaylistId = string | 'all'

type PlaylistState = {
  isLoading: boolean
  songs: Song[]
  playlists: Playlist[]
  currentPlaylistId: PlaylistId

  loadAll: () => Promise<void>
  setCurrentPlaylistId: (id: PlaylistId) => void

  createPlaylist: (name: string, category?: string) => Promise<Playlist>
  updatePlaylist: (id: string, data: Partial<Pick<Playlist, 'name' | 'category'>>) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>

  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>
}

function readCurrentPlaylistId(): PlaylistId {
  const v = localStorage.getItem('playlistId')
  return v ? (v as PlaylistId) : 'all'
}

export const usePlaylistStore = create<PlaylistState>((set, get) => {
  return {
    isLoading: false,
    songs: [],
    playlists: [],
    currentPlaylistId: readCurrentPlaylistId(),

    loadAll: async () => {
      set({ isLoading: true })
      try {
        const [songs, playlists] = await Promise.all([getAllSongs(), getAllPlaylists()])
        set({ songs, playlists })
      } finally {
        set({ isLoading: false })
      }
    },

    setCurrentPlaylistId: (id) => {
      localStorage.setItem('playlistId', id)
      set({ currentPlaylistId: id })
    },

    createPlaylist: async (name, category) => {
      const playlist: Playlist = {
        id: Date.now().toString(),
        name,
        category: category || '',
        songs: [],
      }
      await upsertPlaylistFromDB(playlist)
      set({ playlists: [...get().playlists, playlist] })
      return playlist
    },

    updatePlaylist: async (id, data) => {
      const state = get()
      const existing = state.playlists.find((p) => p.id === id)
      if (!existing) return
      const next: Playlist = {
        ...existing,
        ...data,
        updatedAt: Date.now(),
      }
      await upsertPlaylistFromDB(next)
      set({
        playlists: state.playlists.map((p) => (p.id === id ? next : p)),
      })
    },

    deletePlaylist: async (id) => {
      const state = get()
      await deletePlaylistFromDB(id)
      const nextPlaylists = state.playlists.filter((p) => p.id !== id)
      const nextCurrent = state.currentPlaylistId === id ? 'all' : state.currentPlaylistId
      set({ playlists: nextPlaylists, currentPlaylistId: nextCurrent })
      localStorage.setItem('playlistId', nextCurrent)
    },

    addSongToPlaylist: async (playlistId, songId) => {
      await addSongToPlaylistFromDB(playlistId, songId)
      set({
        playlists: get().playlists.map((p) => {
          if (p.id !== playlistId) return p
          if (p.songs.includes(songId)) return p
          return { ...p, songs: [...p.songs, songId] }
        }),
      })
    },

    removeSongFromPlaylist: async (playlistId, songId) => {
      await removeSongFromPlaylistFromDB(playlistId, songId)
      set({
        playlists: get().playlists.map((p) => {
          if (p.id !== playlistId) return p
          return { ...p, songs: p.songs.filter((id) => id !== songId) }
        }),
      })
    },
  }
})
