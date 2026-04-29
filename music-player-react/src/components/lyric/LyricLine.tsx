import type { LyricLine as LyricLineType } from '../../types/lyric'

type Props = {
  line: LyricLineType
  index: number
  isActive: boolean
  onSeek: (timeSeconds: number) => void
}

export function LyricLine({ line, index, isActive, onSeek }: Props) {
  return (
    <div
      className="cursor-pointer select-none rounded-lg px-2 py-1 text-sm text-slate-300 transition hover:bg-white/8"
      data-line-index={index}
      onClick={() => onSeek(line.time / 1000)}
      style={{
        background: isActive
          ? 'linear-gradient(90deg, rgba(16,185,129,0.2), rgba(20,184,166,0.08))'
          : undefined,
      }}
    >
      {line.text || ''}
    </div>
  )
}
