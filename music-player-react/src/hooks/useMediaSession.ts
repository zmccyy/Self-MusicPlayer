import { useEffect } from 'react'
import { usePlayerStore } from '../stores/playerStore'

export function useMediaSession() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const seek = usePlayerStore((s) => s.seek)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (!('MediaMetadata' in window)) return

    const action = navigator.mediaSession

    action.setActionHandler('play', () => {
      if (!isPlaying) togglePlay()
    })
    action.setActionHandler('pause', () => {
      if (isPlaying) togglePlay()
    })
    action.setActionHandler('previoustrack', () => prev())
    action.setActionHandler('nexttrack', () => next())

    action.setActionHandler('seekbackward', (details) => {
      const offset = typeof details?.seekOffset === 'number' ? details.seekOffset : 10
      seek(Math.max(0, currentTime - offset))
    })

    action.setActionHandler('seekforward', (details) => {
      const offset = typeof details?.seekOffset === 'number' ? details.seekOffset : 10
      seek(currentTime + offset)
    })

    return () => {
      // 清理 handler：避免旧闭包导致的状态错配
      action.setActionHandler('play', null)
      action.setActionHandler('pause', null)
      action.setActionHandler('previoustrack', null)
      action.setActionHandler('nexttrack', null)
      action.setActionHandler('seekbackward', null)
      action.setActionHandler('seekforward', null)
    }
  }, [currentTime, isPlaying, next, prev, seek, togglePlay])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (!('MediaMetadata' in window)) return
    if (!currentSong) return

    const artwork =
      currentSong.cover && typeof currentSong.cover === 'string'
        ? [
            {
              src: currentSong.cover,
              sizes: '96x96',
              type: currentSong.cover.startsWith('data:') ? 'image/*' : 'image/*',
            },
          ]
        : []

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.name,
      artist: currentSong.artist,
      album: currentSong.album || '',
      artwork,
    })
  }, [currentSong])
}
