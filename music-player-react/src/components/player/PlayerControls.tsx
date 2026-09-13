import { motion } from 'motion/react'
import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import type { PlayMode } from '../../types/player'
import { Tooltip, EqualizerBars } from '../ui'

function playModeIcon(mode: PlayMode) {
  switch (mode) {
    case 'shuffle':
      return Shuffle
    case 'repeat':
      return Repeat
    case 'single':
      return Repeat1
    default:
      return Repeat // order 模式：顺序播放也用列表图标族
  }
}

const CTRL_BTN =
  'flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition ' +
  'hover:bg-surface-hover hover:text-text-primary active:scale-95'

export function PlayerControls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const playMode = usePlayerStore((s) => s.playMode)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const togglePlayMode = usePlayerStore((s) => s.togglePlayMode)

  const ModeIcon = playModeIcon(playMode)

  return (
    <div className="flex items-center gap-1">
      <Tooltip content="播放模式">
        <button className={CTRL_BTN} onClick={togglePlayMode} type="button" aria-label="播放模式">
          <ModeIcon className="h-4 w-4" />
        </button>
      </Tooltip>

      <Tooltip content="上一曲">
        <button className={CTRL_BTN} onClick={prev} type="button" aria-label="上一曲">
          <SkipBack className="h-4.5 w-4.5 fill-current" />
        </button>
      </Tooltip>

      <motion.button
        whileTap={{ scale: 0.92 }}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 text-text-on-accent shadow-lg shadow-emerald-500/25 transition hover:brightness-110"
        onClick={togglePlay}
        type="button"
        aria-label="播放/暂停"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        )}
      </motion.button>

      <Tooltip content="下一曲">
        <button className={CTRL_BTN} onClick={next} type="button" aria-label="下一曲">
          <SkipForward className="h-4.5 w-4.5 fill-current" />
        </button>
      </Tooltip>

      {/* 播放中呼吸的均衡器动画条 */}
      <div className="ml-1 w-6">
        {isPlaying ? (
          <EqualizerBars />
        ) : (
          <div className="flex h-3.5 items-end gap-0.5 opacity-30" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-full w-0.5 rounded-sm bg-text-muted" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
