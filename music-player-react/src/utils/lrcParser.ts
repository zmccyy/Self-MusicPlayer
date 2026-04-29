export type LyricLine = {
  time: number // milliseconds
  text: string
}

/**
 * LRC 歌词解析器
 * 支持标准 LRC 格式，包括 [mm:ss.xx] 和 [mm:ss] 时间标签
 */
export class LrcParser {
  static parse(lrcText: string): LyricLine[] {
    if (!lrcText || typeof lrcText !== 'string') return []

    const lines = lrcText.trim().split(/\r?\n/)
    const lyricLines: LyricLine[] = []

    // 匹配 [mm:ss.xx] 或 [mm:ss] 格式
    const timeTagRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const times: number[] = []
      let lastIndex = 0

      let match: RegExpExecArray | null
      while ((match = timeTagRegex.exec(trimmed)) !== null) {
        const minutes = parseInt(match[1], 10)
        const seconds = parseInt(match[2], 10)
        const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0').substring(0, 3), 10) : 0
        const timeMs = minutes * 60000 + seconds * 1000 + milliseconds
        times.push(timeMs)
        lastIndex = timeTagRegex.lastIndex
      }

      const text = trimmed.substring(lastIndex).trim()

      if (times.length > 0) {
        times.forEach((time) => {
          lyricLines.push({ time, text: text || '' })
        })
      } else if (trimmed.startsWith('[') && trimmed.includes(']')) {
        // 可能是 [ar:xxx] [ti:xxx] 等元数据，跳过
        continue
      } else if (text) {
        // 无时间标签的纯文本行：忽略（保持与原逻辑一致）
        continue
      }
    }

    lyricLines.sort((a, b) => a.time - b.time)
    return lyricLines
  }

  /**
   * 将歌词对象序列化为 LRC 格式文本
   */
  static serialize(lines: LyricLine[]): string {
    if (!Array.isArray(lines) || lines.length === 0) return ''

    return lines
      .map((line) => {
        const mins = Math.floor(line.time / 60000)
        const secs = Math.floor((line.time % 60000) / 1000)
        const ms = line.time % 1000

        const timeStr =
          ms > 0
            ? `[${mins.toString().padStart(2, '0')}:${secs
                .toString()
                .padStart(2, '0')}.${Math.floor(ms / 10)
                .toString()
                .padStart(2, '0')}]`
            : `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`

        return `${timeStr}${line.text || ''}`
      })
      .join('\n')
  }
}
