type Props = {
  index: number
  frequencyHz: number
  valueDb: number
  onChange: (nextDb: number) => void
}

export function FrequencyBand({ index, frequencyHz, valueDb, onChange }: Props) {
  return (
    <label className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-400">
          {index + 1}. {frequencyHz >= 1000 ? `${frequencyHz / 1000}kHz` : `${frequencyHz}Hz`}
        </span>
        <span className="tabular-nums text-slate-200">{valueDb.toFixed(1)} dB</span>
      </div>
      <input
        className="accent-emerald-400"
        type="range"
        min={-12}
        max={12}
        step={0.1}
        value={valueDb}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`均衡器第 ${index + 1} 段`}
      />
    </label>
  )
}
