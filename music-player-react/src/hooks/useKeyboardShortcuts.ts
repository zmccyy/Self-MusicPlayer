import { useEffect } from 'react'
import { usePlayerStore } from '../stores/playerStore'

/** 全局键盘快捷键：空格=播放/暂停，←→=±5s，↑↓=音量，M=静音。输入框聚焦时不生效。 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return
        }
      }

      const store = usePlayerStore.getState()
      if (!store.currentSong && e.code !== 'Space') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          store.togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          store.seek(Math.max(0, store.currentTime - 5))
          break
        case 'ArrowRight':
          e.preventDefault()
          store.seek(store.currentTime + 5)
          break
        case 'ArrowUp':
          e.preventDefault()
          store.setVolume(Math.min(1, store.volume + 0.05))
          break
        case 'ArrowDown':
          e.preventDefault()
          store.setVolume(Math.max(0, store.volume - 0.05))
          break
        case 'KeyM':
          e.preventDefault()
          store.toggleMute()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
