type AudioServiceCallbacks = {
  onTimeUpdate?: (timeSeconds: number) => void
  onLoadedMetadata?: (durationSeconds: number) => void
  onEnded?: () => void
  onVolumeChange?: (volume: number, isMuted: boolean) => void
}

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num))
}

/**
 * Audio API 封装：负责“播放控制 + 音频事件回调”
 * 状态（是否播放、播放模式、当前歌曲等）由 zustand store 管理。
 */
export class AudioService {
  private audio: HTMLAudioElement
  private initialized = false
  private callbacks: AudioServiceCallbacks = {}

  constructor() {
    this.audio = new Audio()
    this.audio.preload = 'metadata'
  }

  /**
   * 给音效/音频处理层（如均衡器）使用：
   * 允许基于同一个 HTMLAudioElement 构建 WebAudio 图。
   */
  getAudioElement(): HTMLAudioElement {
    return this.audio
  }

  init(callbacks: AudioServiceCallbacks) {
    if (this.initialized) {
      this.callbacks = callbacks
      return
    }

    this.callbacks = callbacks

    this.audio.addEventListener('timeupdate', () => {
      this.callbacks.onTimeUpdate?.(this.audio.currentTime || 0)
    })

    this.audio.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0
      this.callbacks.onLoadedMetadata?.(duration)
    })

    this.audio.addEventListener('ended', () => {
      this.callbacks.onEnded?.()
    })

    this.audio.addEventListener('volumechange', () => {
      const volume = typeof this.audio.volume === 'number' ? this.audio.volume : 0
      // 这里用“音量为 0 且被静音”作为 isMuted 信号（与原生实现一致）
      const isMuted = this.audio.muted || volume === 0
      this.callbacks.onVolumeChange?.(volume, isMuted)
    })

    this.initialized = true
  }

  play(url: string) {
    this.audio.src = url
    // play() 可能被浏览器策略拦截，这里不抛错导致应用崩溃
    void this.audio.play().catch(() => {})
  }

  pause() {
    this.audio.pause()
  }

  togglePlay(url?: string) {
    if (url) this.play(url)
    else void this.audio.play().catch(() => {})
  }

  seek(timeSeconds: number) {
    this.audio.currentTime = Math.max(0, timeSeconds)
  }

  setPlaybackVolume(volume: number, isMuted: boolean) {
    const v = clamp(volume, 0, 1)
    this.audio.muted = isMuted
    this.audio.volume = isMuted ? 0 : v
  }

  get currentTime() {
    return this.audio.currentTime || 0
  }

  get duration() {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0
  }

  get volume() {
    return this.audio.volume || 0
  }

  get muted() {
    return this.audio.muted
  }
}

export const audioService = new AudioService()
