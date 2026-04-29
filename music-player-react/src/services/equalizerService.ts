import {
  EQ_BAND_FREQUENCIES_HZ,
  EQ_PRESETS,
  type EQPreset,
  type EQPresetId,
} from '../constants/equalizerPresets'

export const EQ_BAND_COUNT = EQ_BAND_FREQUENCIES_HZ.length

type AudioContextCtor = typeof AudioContext | (new () => AudioContext)

/**
 * 音效均衡器 WebAudio 服务：
 * - 基于同一个 HTMLAudioElement（由 audioService 提供）
 * - 6 段 PEQ（peaking）滤波链
 * - 支持 enable/disable（disable 时旁路直连 destination）
 */
export class EqualizerService {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private filters: BiquadFilterNode[] = []
  private masterGain: GainNode | null = null

  private enabled = false
  private gainsDb: number[] = new Array(EQ_BAND_COUNT).fill(0)

  isSupported(): boolean {
    if (typeof window === 'undefined') return false
    const Ctor = (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext) as
      | AudioContextCtor
      | undefined
    return Boolean(Ctor)
  }

  init(audioEl: HTMLAudioElement) {
    if (this.audioContext) return
    if (!this.isSupported()) return

    const Ctor = (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext) as
      | AudioContextCtor
      | undefined
    if (!Ctor) return

    const ctx = new Ctor()
    this.audioContext = ctx

    this.sourceNode = ctx.createMediaElementSource(audioEl)
    this.masterGain = ctx.createGain()
    this.masterGain.gain.value = 1
    this.masterGain.connect(ctx.destination)

    // 初始化滤波器链路：source -> filters -> master -> destination
    const Q = 1
    this.filters = EQ_BAND_FREQUENCIES_HZ.map((freqHz, idx) => {
      const f = ctx.createBiquadFilter()
      f.type = 'peaking'
      f.frequency.value = freqHz
      f.Q.value = Q
      f.gain.value = this.gainsDb[idx] ?? 0
      return f
    })

    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1])
    }
    this.filters[this.filters.length - 1].connect(this.masterGain)

    // 默认按“已加载均衡器预设”旁路到 destination
    this.disable()
  }

  getBandFrequenciesHz(): number[] {
    return [...EQ_BAND_FREQUENCIES_HZ]
  }

  getEnabled(): boolean {
    return this.enabled
  }

  getGainsDb(): number[] {
    return [...this.gainsDb]
  }

  setGainsDb(next: number[]) {
    const safe = next.slice(0, EQ_BAND_COUNT)
    while (safe.length < EQ_BAND_COUNT) safe.push(0)
    this.gainsDb = safe
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].gain.value = safe[i] ?? 0
    }
  }

  setPreset(presetId: EQPresetId) {
    const preset = EQ_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    this.setGainsDb(preset.gainsDb)
  }

  enable() {
    if (!this.audioContext || !this.sourceNode || this.filters.length === 0 || !this.masterGain)
      return
    this.enabled = true

    // 建链之前先断开旧连接，避免重复连接导致的音频图混乱。
    try {
      this.sourceNode.disconnect()
    } catch {
      // 某些浏览器在未连接时 disconnect 可能抛错，不影响逻辑。
    }

    void this.audioContext.resume()
    this.sourceNode.connect(this.filters[0])
  }

  disable() {
    if (!this.audioContext || !this.sourceNode || !this.masterGain) return
    this.enabled = false

    try {
      this.sourceNode.disconnect()
    } catch {
      // ignore
    }
    this.sourceNode.connect(this.masterGain)
  }

  applyPresetByName(preset: EQPreset) {
    this.setGainsDb(preset.gainsDb)
  }

  /**
   * 尝试读取本地均衡器状态并应用（如果存在）。
   * 由 UI 在挂载时调用即可。
   */
  hydrateFromStorage() {
    try {
      const enabledRaw = localStorage.getItem('eqEnabled')
      const presetId = (localStorage.getItem('eqPresetId') || 'flat') as EQPresetId
      const gainsRaw = localStorage.getItem('eqGainsDb')
      if (enabledRaw !== null) this.enabled = enabledRaw === 'true'

      if (gainsRaw) {
        const parsed = JSON.parse(gainsRaw) as unknown
        if (Array.isArray(parsed)) {
          const arr = parsed.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0))
          this.setGainsDb(arr)
        }
      } else {
        this.setPreset(presetId)
      }
    } catch {
      // ignore storage errors
    }
  }

  persistToStorage() {
    try {
      localStorage.setItem('eqEnabled', String(this.enabled))
      const preset = EQ_PRESETS.find((p) => p.gainsDb.join(',') === this.gainsDb.join(','))
      if (preset) localStorage.setItem('eqPresetId', preset.id)
      else localStorage.setItem('eqPresetId', 'flat')
      localStorage.setItem('eqGainsDb', JSON.stringify(this.gainsDb))
    } catch {
      // ignore
    }
  }
}

export const equalizerService = new EqualizerService()
