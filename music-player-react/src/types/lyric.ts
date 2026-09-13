export type LyricLine = {
  time: number // 毫秒
  text: string
  /** 翻译行（如有），跟随原文行显示 */
  translation?: string
}

export type LyricSource = 'embedded' | 'external' | 'manual'

export type Lyric = {
  id: string
  songId: string
  lines: LyricLine[]
  source: LyricSource
  /** 翻译 LRC 原文（用于编辑/保存往返） */
  translationText?: string | null
}
