import { usePlayerStore } from '../../stores/playerStore'

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
    <div className="flex min-w-[220px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-xs tabular-nums text-slate-400">{timeText(currentTime)}</span>

      <input
        className="w-full accent-emerald-400"
        type="range"
        min={0}
        max={max}
        step={0.01}
        value={Math.min(currentTime, max)}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="进度条"
      />

      <span className="text-xs tabular-nums text-slate-400">{timeText(duration)}</span>
    </div>
  )
}
