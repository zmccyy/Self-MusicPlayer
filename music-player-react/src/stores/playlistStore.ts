import { create } from 'zustand'
import type { Playlist } from '../types/playlist'
import type { Song } from '../types/song'
import {
  addTracksToPlaylist,
  createPlaylist as createPlaylistApi,
  deletePlaylist as deletePlaylistApi,
  deleteTrack,
  fetchPlaylists,
  fetchTracks,
  removeTrackFromPlaylist,
  updatePlaylist as updatePlaylistApi,
  updateTrack,
} from '../api/client'

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

  removeSong: (songId: string) => Promise<void>
  updateSong: (
    songId: string,
    patch: { name?: string; artist?: string; album?: string; genre?: string; year?: number },
  ) => Promise<void>
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
        const [songs, playlists] = await Promise.all([fetchTracks(), fetchPlaylists()])
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
      const playlist = await createPlaylistApi(name, category || '')
      set({ playlists: [...get().playlists, playlist] })
      return playlist
    },

    updatePlaylist: async (id, data) => {
      const playlist = await updatePlaylistApi(id, {
        name: data.name,
        description: data.category,
      })
      set({
        playlists: get().playlists.map((p) => (p.id === id ? playlist : p)),
      })
    },

    deletePlaylist: async (id) => {
      await deletePlaylistApi(id)
      const nextPlaylists = get().playlists.filter((p) => p.id !== id)
      const nextCurrent = get().currentPlaylistId === id ? 'all' : get().currentPlaylistId
      set({ playlists: nextPlaylists, currentPlaylistId: nextCurrent })
      localStorage.setItem('playlistId', nextCurrent)
    },

    addSongToPlaylist: async (playlistId, songId) => {
      await addTracksToPlaylist(playlistId, [songId])
      set({
        playlists: get().playlists.map((p) => {
          if (p.id !== playlistId) return p
          if (p.songs.includes(songId)) return p
          return { ...p, songs: [...p.songs, songId] }
        }),
      })
    },

    removeSongFromPlaylist: async (playlistId, songId) => {
      await removeTrackFromPlaylist(playlistId, songId)
      set({
        playlists: get().playlists.map((p) => {
          if (p.id !== playlistId) return p
          return { ...p, songs: p.songs.filter((id) => id !== songId) }
        }),
      })
    },

    removeSong: async (songId) => {
      await deleteTrack(songId)
      set({
        songs: get().songs.filter((s) => s.id !== songId),
        // 后端级联删除了歌单关联，本地同步移除
        playlists: get().playlists.map((p) =>
          p.songs.includes(songId) ? { ...p, songs: p.songs.filter((id) => id !== songId) } : p,
        ),
      })
    },

    updateSong: async (songId, patch) => {
      // Song 领域字段（name）→ API 字段（title）
      const song = await updateTrack(songId, {
        title: patch.name,
        artist: patch.artist,
        album: patch.album,
        genre: patch.genre,
        year: patch.year,
      })
      set({ songs: get().songs.map((s) => (s.id === songId ? song : s)) })
    },
  }
})
