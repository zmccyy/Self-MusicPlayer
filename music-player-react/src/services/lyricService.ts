import type { Lyric, LyricSource } from '../types/lyric'
import { LrcParser } from '../utils/lrcParser'
import { fetchTrackLyric, saveTrackLyric } from '../api/client'

function findActiveLyricIndex(lines: Lyric['lines'], currentTimeSeconds: number) {
  if (!lines.length) return -1

  const currentMs = currentTimeSeconds * 1000
  // 从后往前找：更快且符合“当前时间已经超过该行”语义
  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentMs >= lines[i].time) return i
  }
  return -1
}

/** 歌词正文由后端存储（嵌入式/上传/手动/在线匹配统一入口），前端负责 LRC 解析。 */
export async function getLyricBySongId(songId: string): Promise<Lyric | null> {
  if (!songId) return null
  const payload = await fetchTrackLyric(songId)
  if (!payload.lyric) return null
  const lines = LrcParser.parse(payload.lyric, payload.translation)
  const source: LyricSource =
    payload.source === 'embedded' || payload.source === 'external' ? payload.source : 'manual'
  return {
    id: `lyric_${songId}`,
    songId,
    lines,
    source,
    translationText: payload.translation,
  }
}

export async function saveLyric(lyric: Lyric): Promise<void> {
  const text = LrcParser.serialize(lyric.lines)
  await saveTrackLyric(lyric.songId, text, lyric.source, lyric.translationText ?? null)
}

export { findActiveLyricIndex }
