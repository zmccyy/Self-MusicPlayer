export type LyricLine = {
  time: number // 毫秒
  text: string
}

export type LyricSource = 'embedded' | 'external' | 'manual'

export type Lyric = {
  id: string
  songId: string
  lines: LyricLine[]
  source: LyricSource
}
