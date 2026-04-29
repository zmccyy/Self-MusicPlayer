import { create } from 'zustand'
import type { PlayMode } from '../types/player'
import { PLAY_MODES } from '../types/player'
import type { Song } from '../types/song'
import { audioService } from '../services/audioService'
import { formatTime } from '../utils/formatTime'

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num))
}

type PlayerState = {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  playMode: PlayMode
  currentSong: Song | null
  currentIndex: number
  playlist: Song[]

  // actions
  setPlaylist: (songs: Song[]) => void
  play: (index: number) => void
  pause: () => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  seek: (timeSeconds: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  togglePlayMode: () => void

  // UI helpers
  getCurrentTimeText: () => string
  getDurationText: () => string
}

const DEFAULT_VOLUME = 0.8
const DEFAULT_PLAY_MODE: PlayMode = 'order'

function readNumber(key: string, fallback: number) {
  const v = localStorage.getItem(key)
  if (v === null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function readPlayMode(): PlayMode {
  const v = localStorage.getItem('playMode')
  if (!v) return DEFAULT_PLAY_MODE
  return PLAY_MODES.includes(v as PlayMode) ? (v as PlayMode) : DEFAULT_PLAY_MODE
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  const volume = readNumber('volume', DEFAULT_VOLUME)
  const playMode = readPlayMode()

  audioService.init({
    onTimeUpdate: (timeSeconds) => set({ currentTime: timeSeconds }),
    onLoadedMetadata: (durationSeconds) => set({ duration: durationSeconds }),
    onVolumeChange: (_volume, isMuted) => set({ isMuted }),
    onEnded: () => {
      const state = get()
      if (state.playMode === 'single') {
        audioService.seek(0)
        if (state.currentSong) {
          audioService.play(state.currentSong.url)
          set({ isPlaying: true })
        }
      } else {
        state.next()
      }
    },
  })

  // 初始化音量（以“未静音”为默认）
  audioService.setPlaybackVolume(volume, false)

  return {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume,
    isMuted: false,
    playMode,
    currentSong: null,
    currentIndex: -1,
    playlist: [],

    setPlaylist: (songs) => {
      audioService.pause()
      set({
        playlist: songs,
        currentIndex: songs.length ? 0 : -1,
        currentSong: songs.length ? songs[0] : null,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
      })
    },

    play: (index) => {
      const state = get()
      if (!state.playlist.length) return
      if (index < 0 || index >= state.playlist.length) return

      const song = state.playlist[index]
      set({
        currentIndex: index,
        currentSong: song,
        isPlaying: true,
      })

      audioService.setPlaybackVolume(state.volume, state.isMuted)
      audioService.play(song.url)
    },

    pause: () => {
      audioService.pause()
      set({ isPlaying: false })
    },

    togglePlay: () => {
      const state = get()
      if (!state.playlist.length) return

      if (state.currentIndex === -1) {
        get().play(0)
        return
      }

      if (state.isPlaying) {
        get().pause()
      } else if (state.currentSong) {
        audioService.setPlaybackVolume(state.volume, state.isMuted)
        audioService.togglePlay()
        set({ isPlaying: true })
      }
    },

    next: () => {
      const state = get()
      if (!state.playlist.length) return

      let nextIndex: number
      if (state.playMode === 'shuffle') {
        nextIndex = Math.floor(Math.random() * state.playlist.length)
      } else if (state.playMode === 'single') {
        nextIndex = state.currentIndex
      } else {
        nextIndex = state.currentIndex + 1
        if (nextIndex >= state.playlist.length) nextIndex = 0
      }

      get().play(nextIndex)
    },

    prev: () => {
      const state = get()
      if (!state.playlist.length) return

      let prevIndex: number
      if (state.playMode === 'shuffle') {
        prevIndex = Math.floor(Math.random() * state.playlist.length)
      } else {
        prevIndex = state.currentIndex - 1
        if (prevIndex < 0) prevIndex = state.playlist.length - 1
      }

      get().play(prevIndex)
    },

    seek: (timeSeconds) => {
      const state = get()
      if (!state.duration) {
        audioService.seek(timeSeconds)
        set({ currentTime: timeSeconds })
        return
      }
      const t = clamp(timeSeconds, 0, state.duration)
      audioService.seek(t)
      set({ currentTime: t })
    },

    setVolume: (volume) => {
      const state = get()
      const v = clamp(volume, 0, 1)
      const nextIsMuted = state.isMuted && v > 0 ? false : state.isMuted

      localStorage.setItem('volume', String(v))
      audioService.setPlaybackVolume(v, nextIsMuted)
      set({ volume: v, isMuted: nextIsMuted })
    },

    toggleMute: () => {
      const state = get()
      const nextMuted = !state.isMuted
      audioService.setPlaybackVolume(state.volume, nextMuted)
      set({ isMuted: nextMuted })
    },

    togglePlayMode: () => {
      const state = get()
      const currentModeIndex = PLAY_MODES.indexOf(state.playMode)
      const nextMode = PLAY_MODES[(currentModeIndex + 1) % PLAY_MODES.length]
      localStorage.setItem('playMode', nextMode)
      set({ playMode: nextMode })
      // 保持对齐原生实现：同步 data 属性（供后续样式/组件使用）
      document.body.setAttribute('data-play-mode', nextMode)
    },

    getCurrentTimeText: () => formatTime(get().currentTime),
    getDurationText: () => formatTime(get().duration),
  }
})
