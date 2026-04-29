const VALID_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  // 部分浏览器可能不返回标准的 flac/aac mime，这里保留作兜底
  'audio/flac',
  'audio/aac',
  'audio/mp3',
  'audio/x-m4a',
]

const VALID_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.mp4']

function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : ''
}

export function isSupportedAudioFile(file: File): boolean {
  const ext = getFileExtension(file.name)
  if (VALID_AUDIO_EXTENSIONS.includes(ext)) return true

  // 保持与原生实现的“mime/子串匹配”思路接近
  const mime = file.type || ''
  if (!mime) return false

  return VALID_AUDIO_MIME_TYPES.some((type) => {
    const parts = type.split('/')
    const sub = parts[1]
    return mime === type || (sub ? mime.includes(sub) : false)
  })
}

export function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio()
    audio.onloadedmetadata = () => resolve(audio.duration)
    audio.onerror = () => resolve(0)
    audio.src = url
  })
}
