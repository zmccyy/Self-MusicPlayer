import type { ApiSearchProvider, RemoteSong } from '../api/types'
import type { Song } from '../types/song'
import { searchNetease } from '../api/netease'
import { searchQQ } from '../api/qq'

export type SearchSongsParams = {
  keyword: string
  limit?: number
  providers?: ApiSearchProvider | 'both'
}

function remoteToSong(remote: RemoteSong, provider: ApiSearchProvider): Song {
  return {
    id: `${provider}:${remote.id}`,
    name: remote.name,
    artist: remote.artist,
    album: remote.album || '',
    duration: remote.duration ?? 0,
    url: remote.url,
    cover: remote.cover ?? null,
    addedAt: Date.now(),
    source: 'online',
  }
}

export async function searchSongs(params: SearchSongsParams): Promise<Song[]> {
  const keyword = params.keyword.trim()
  if (!keyword) return []

  const limit = params.limit ?? 12

  const providers: ApiSearchProvider[] =
    params.providers === 'both' || params.providers == null ? ['netease', 'qq'] : [params.providers]

  const results: Song[] = []
  const errors: unknown[] = []

  const settled = await Promise.allSettled(
    providers.map(async (p) => {
      const remotes =
        p === 'netease' ? await searchNetease(keyword, limit) : await searchQQ(keyword, limit)
      return { provider: p, remotes }
    }),
  )

  for (const s of settled) {
    if (s.status === 'fulfilled') {
      const { provider, remotes } = s.value
      results.push(...remotes.map((r) => remoteToSong(r, provider)))
    } else {
      errors.push(s.reason)
    }
  }

  // 简单去重：保留第一个出现的 id
  const seen = new Set<string>()
  const deduped: Song[] = []
  for (const song of results) {
    if (seen.has(song.id)) continue
    seen.add(song.id)
    deduped.push(song)
  }

  if (!deduped.length && errors.length) {
    // 让 UI 能展示“配置/网络/接口”问题
    const msg = errors
      .map((e) => (e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e)))
      .join(' | ')
    throw new Error(msg || '第三方搜索失败')
  }

  return deduped
}
