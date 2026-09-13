import { usePlayerStore } from '../../stores/playerStore'
import { Slider } from '../ui'

export function ProgressBar() {
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const seek = usePlayerStore((s) => s.seek)

  const safeDuration = duration > 0 ? duration : 0
  const max = safeDuration || 1

  const timeText = (t: number) => {
    const mins = Math.floor(t / 60)
    const secs = Math.floor(t % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex min-w-[220px] flex-1 items-center gap-3">
      <span className="text-xs tabular-nums text-text-secondary">{timeText(currentTime)}</span>

      <Slider
        className="flex-1"
        min={0}
        max={max}
        step={0.01}
        value={[Math.min(currentTime, max)]}
        onValueChange={([v]) => seek(v ?? 0)}
        aria-label="进度条"
      />

      <span className="text-xs tabular-nums text-text-secondary">{timeText(duration)}</span>
    </div>
  )
}
