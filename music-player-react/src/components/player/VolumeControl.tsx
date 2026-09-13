import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { Slider, Tooltip } from '../ui'

export function VolumeControl() {
  const volume = usePlayerStore((s) => s.volume)
  const isMuted = usePlayerStore((s) => s.isMuted)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const toggleMute = usePlayerStore((s) => s.toggleMute)

  const displayVolume = isMuted ? 0 : volume
  const Icon = isMuted || displayVolume === 0 ? VolumeX : displayVolume < 0.5 ? Volume1 : Volume2

  return (
    <div className="flex items-center gap-2">
      <Tooltip content={isMuted ? '取消静音' : '静音'}>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
          type="button"
          onClick={toggleMute}
          aria-label="静音/取消静音"
        >
          <Icon className="h-4 w-4" />
        </button>
      </Tooltip>
      <Slider
        className="w-24"
        min={0}
        max={1}
        step={0.01}
        value={[displayVolume]}
        onValueChange={([v]) => setVolume(v ?? 0)}
        aria-label="音量"
      />
    </div>
  )
}
