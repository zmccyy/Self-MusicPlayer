import type { EQPresetId } from '../../constants/equalizerPresets'
import { EQ_PRESETS } from '../../constants/equalizerPresets'

type PresetValue = EQPresetId | 'custom'

type Props = {
  value: PresetValue
  onChange: (next: PresetValue) => void
}

export function PresetSelector({ value, onChange }: Props) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text-secondary">预设</span>
      <select
        className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-sm text-text-primary"
        value={value}
        onChange={(e) => onChange(e.target.value as PresetValue)}
        aria-label="选择均衡器预设"
      >
        <option value="custom">自定义</option>
        {EQ_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  )
}
