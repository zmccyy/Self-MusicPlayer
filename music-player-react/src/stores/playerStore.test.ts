import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayerStore } from './playerStore'
import { audioService } from '../services/audioService'
import type { Song } from '../types/song'

const song: Song = {
  id: 'song-1',
  name: '测试歌曲',
  artist: '测试歌手',
  album: '测试专辑',
  duration: 180,
  url: 'blob:test-song',
  cover: null,
  addedAt: Date.now(),
  source: 'local',
}

describe('usePlayerStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.removeAttribute('data-play-mode')
    usePlayerStore.setState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      isMuted: false,
      playMode: 'order',
      currentSong: null,
      currentIndex: -1,
      playlist: [],
    })
    vi.restoreAllMocks()
  })

  it('恢复播放时不应重新从头加载当前歌曲', () => {
    const playSpy = vi.spyOn(audioService, 'play').mockImplementation(() => {})
    const togglePlaySpy = vi.spyOn(audioService, 'togglePlay').mockImplementation(() => {})
    vi.spyOn(audioService, 'pause').mockImplementation(() => {})
    vi.spyOn(audioService, 'setPlaybackVolume').mockImplementation(() => {})

    const state = usePlayerStore.getState()
    state.setPlaylist([song])
    state.play(0)
    playSpy.mockClear()
    togglePlaySpy.mockClear()

    state.pause()
    usePlayerStore.getState().togglePlay()

    expect(togglePlaySpy).toHaveBeenCalledTimes(1)
    expect(playSpy).not.toHaveBeenCalled()
    expect(usePlayerStore.getState().isPlaying).toBe(true)
  })
})
