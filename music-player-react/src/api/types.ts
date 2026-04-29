import type { SongSource } from '../types/song'

export type ApiSearchProvider = 'netease' | 'qq'

export type RemoteSong = {
  id: string
  name: string
  artist: string
  album?: string
  duration?: number
  url: string
  cover?: string | null
}

export type ProviderSearchResponse = RemoteSong[] | { songs: RemoteSong[] }

export type ApiSong = {
  source: SongSource
  provider: ApiSearchProvider
}
