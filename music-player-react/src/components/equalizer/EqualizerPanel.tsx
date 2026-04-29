import { useEffect, useState } from 'react'
import { audioService } from '../../services/audioService'
import { equalizerService } from '../../services/equalizerService'
import {
  EQ_BAND_FREQUENCIES_HZ,
  EQ_PRESETS,
  type EQPreset,
  type EQPresetId,
} from '../../constants/equalizerPresets'
import { FrequencyBand } from './FrequencyBand'
import { PresetSelector } from './PresetSelector'

type PresetValue = EQPresetId | 'custom'

function gainsEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    // sliders 带有浮点数，做 0.1dB 粒度比较
    if (Math.round(a[i] * 10) !== Math.round(b[i] * 10)) return false
  }
  return true
}

export function EqualizerPanel() {
  const [enabled, setEnabled] = useState(false)
  const [presetValue, setPresetValue] = useState<PresetValue>('flat')
  const [gainsDb, setGainsDb] = useState<number[]>(() =>
    new Array(EQ_BAND_FREQUENCIES_HZ.length).fill(0),
  )

  useEffect(() => {
    equalizerService.init(audioService.getAudioElement())
    equalizerService.hydrateFromStorage()

    const nextEnabled = equalizerService.getEnabled()
    const nextGains = equalizerService.getGainsDb()
    setEnabled(nextEnabled)
    setGainsDb(nextGains)

    // 结合 storage/preset，选择当前 preset 下拉值
    const storedPresetId = (localStorage.getItem('eqPresetId') || 'flat') as EQPresetId
    const preset = EQ_PRESETS.find((p) => p.id === storedPresetId)
    if (preset && gainsEqual(preset.gainsDb, nextGains)) setPresetValue(storedPresetId)
    else setPresetValue('custom')

    if (nextEnabled) equalizerService.enable()
    else equalizerService.disable()
  }, [])

  const toggleEnabled = (next: boolean) => {
    setEnabled(next)
    if (next) equalizerService.enable()
    else equalizerService.disable()
    equalizerService.persistToStorage()
  }

  const onPresetChange = (nextPreset: PresetValue) => {
    setPresetValue(nextPreset)
    if (nextPreset === 'custom') return

    const preset = EQ_PRESETS.find((p) => p.id === nextPreset) as EQPreset
    const nextGains = preset.gainsDb
    setGainsDb(nextGains)
    equalizerService.setPreset(preset.id)
    equalizerService.persistToStorage()
  }

  const onBandChange = (index: number, nextDb: number) => {
    const next = [...gainsDb]
    next[index] = nextDb
    setGainsDb(next)
    equalizerService.setGainsDb(next)

    // 若已启用，实时生效；否则仅更新“下次启用时”的效果值
    equalizerService.persistToStorage()

    const match = EQ_PRESETS.find((p) => gainsEqual(p.gainsDb, next))?.id ?? 'custom'
    setPresetValue(match)
  }

  return (
    <div className="w-full rounded-2xl border border-white/15 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          音效均衡器
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => toggleEnabled(e.target.checked)}
          />
          启用
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <PresetSelector value={presetValue} onChange={onPresetChange} />

        <div className="grid gap-3">
          {EQ_BAND_FREQUENCIES_HZ.map((freqHz, idx) => (
            <FrequencyBand
              key={freqHz}
              index={idx}
              frequencyHz={freqHz}
              valueDb={gainsDb[idx] ?? 0}
              onChange={(nextDb) => onBandChange(idx, nextDb)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
