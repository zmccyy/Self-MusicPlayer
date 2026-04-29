import type { ProviderSearchResponse, RemoteSong } from './types'

function normalizeString(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return ''
}

function normalizeArtist(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.map(normalizeString).filter(Boolean).join(' / ')
  if (v && typeof v === 'object') {
    const obj = v as any
    if ('name' in obj) return normalizeString(obj.name)
    if ('artists' in obj) return normalizeArtist(obj.artists)
  }
  return ''
}

function normalizeCover(v: unknown): string | null {
  const s = typeof v === 'string' ? v : ''
  return s ? s : null
}

function normalizeDuration(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function normalizeRemoteSong(item: any): RemoteSong | null {
  const id = normalizeString(item?.id ?? item?.songId ?? item?.trackId)
  const name = normalizeString(item?.name ?? item?.title ?? item?.songName)
  const artist = normalizeArtist(item?.artist ?? item?.artists)
  const album = normalizeString(item?.album ?? item?.albumName)
  const duration = normalizeDuration(item?.duration ?? item?.timeLength)

  const url = normalizeString(
    item?.url ?? item?.playUrl ?? item?.streamUrl ?? item?.mp3Url ?? item?.audioUrl,
  )
  if (!id || !name || !artist || !url) return null

  return {
    id,
    name,
    artist,
    album: album || undefined,
    duration,
    url,
    cover: normalizeCover(item?.cover ?? item?.picUrl ?? item?.albumPic),
  }
}

function getSearchEndpoint(): string | null {
  const local = localStorage.getItem('qq.searchEndpoint')
  if (local) return local
  const env = import.meta.env.VITE_QQ_SEARCH_ENDPOINT
  if (typeof env === 'string' && env.trim()) return env
  return null
}

export async function searchQQ(keyword: string, limit: number): Promise<RemoteSong[]> {
  const endpoint = getSearchEndpoint()
  if (!endpoint) return []

  const url = new URL(endpoint)
  url.searchParams.set('keyword', keyword)
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`QQ search failed: ${res.status}`)

  const json = (await res.json()) as ProviderSearchResponse
  const items = Array.isArray(json) ? json : json.songs

  return items.map(normalizeRemoteSong).filter((x): x is RemoteSong => Boolean(x))
}
