import type { Lyric } from '../types/lyric'
import { storageService } from './storageService'

function findActiveLyricIndex(lines: Lyric['lines'], currentTimeSeconds: number) {
  if (!lines.length) return -1

  const currentMs = currentTimeSeconds * 1000
  // 从后往前找：更快且符合“当前时间已经超过该行”语义
  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentMs >= lines[i].time) return i
  }
  return -1
}

export async function getLyricBySongId(songId: string): Promise<Lyric | null> {
  if (!songId) return null
  const lyric = await storageService
    .table<Lyric, string>('lyrics')
    .where('songId')
    .equals(songId)
    .first()
  return lyric || null
}

export async function saveLyric(lyric: Lyric): Promise<void> {
  await storageService.table<Lyric, string>('lyrics').put(lyric)
}

export { findActiveLyricIndex }
