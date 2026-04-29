import { usePlayerStore } from '../../stores/playerStore'
import type { PlayMode } from '../../types/player'

function playModeToLabel(mode: PlayMode) {
  switch (mode) {
    case 'order':
      return '顺序'
    case 'shuffle':
      return '随机'
    case 'repeat':
      return '列表循环'
    case 'single':
      return '单曲循环'
    default:
      return mode
  }
}

export function PlayerControls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const playMode = usePlayerStore((s) => s.playMode)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const togglePlayMode = usePlayerStore((s) => s.togglePlayMode)

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
      <button className="btn btn-secondary" onClick={prev} type="button" aria-label="上一曲">
        上一曲
      </button>

      <button className="btn btn-primary" onClick={togglePlay} type="button" aria-label="播放/暂停">
        {isPlaying ? '暂停' : '播放'}
      </button>

      <button className="btn btn-secondary" onClick={next} type="button" aria-label="下一曲">
        下一曲
      </button>

      <button
        className="btn btn-ghost"
        onClick={togglePlayMode}
        type="button"
        aria-label="播放模式"
      >
        {playModeToLabel(playMode)}
      </button>
    </div>
  )
}
