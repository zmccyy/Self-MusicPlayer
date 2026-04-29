import { usePlayerStore } from '../../stores/playerStore'

export function VolumeControl() {
  const volume = usePlayerStore((s) => s.volume)
  const isMuted = usePlayerStore((s) => s.isMuted)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const toggleMute = usePlayerStore((s) => s.toggleMute)

  const displayVolume = isMuted ? 0 : volume

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1">
      <button
        className="btn btn-ghost"
        type="button"
        onClick={toggleMute}
        aria-label="静音/取消静音"
      >
        {isMuted ? '已静音' : '音量'}
      </button>
      <input
        className="w-28 accent-emerald-400"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={displayVolume}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="音量"
      />
    </div>
  )
}
