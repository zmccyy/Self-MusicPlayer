export type SongSource = 'local' | 'online'

export type Song = {
  id: string
  name: string
  artist: string
  album: string
  duration: number
  url: string
  cover: string | null
  addedAt: number
  source?: SongSource
}
