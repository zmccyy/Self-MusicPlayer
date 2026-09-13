import * as SliderPrimitive from '@radix-ui/react-slider'

type Props = {
  index: number
  frequencyHz: number
  valueDb: number
  onChange: (nextDb: number) => void
}

/** 单个频段：竖向滑条 + 频点标签（10 段横排网格用） */
export function FrequencyBand({ index, frequencyHz, valueDb, onChange }: Props) {
  const label = frequencyHz >= 1000 ? `${frequencyHz / 1000}k` : `${frequencyHz}`

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border-soft bg-surface px-1 py-2">
      <span className="text-[10px] tabular-nums text-text-primary">
        {valueDb > 0 ? '+' : ''}
        {valueDb.toFixed(1)}
      </span>
      <SliderPrimitive.Root
        orientation="vertical"
        min={-12}
        max={12}
        step={0.5}
        value={[valueDb]}
        onValueChange={([v]) => onChange(v ?? 0)}
        aria-label={`均衡器第 ${index + 1} 段`}
        className="relative flex h-28 w-6 touch-none select-none flex-col items-center"
      >
        <SliderPrimitive.Track className="relative w-1 grow overflow-hidden rounded-full bg-surface-strong">
          <SliderPrimitive.Range className="absolute w-full rounded-full bg-gradient-to-t from-emerald-500 to-teal-400" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-3 w-4 rounded-sm bg-white shadow-[0_0_8px_rgba(16,185,129,0.5)] outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent/50" />
      </SliderPrimitive.Root>
      <span className="text-[10px] font-medium text-text-secondary">{label}</span>
    </div>
  )
}
