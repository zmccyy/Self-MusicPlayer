import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { fetchTracks } from '../../api/client'
import type { Song } from '../../types/song'
import { usePlaylistStore } from '../../stores/playlistStore'
import { usePlayerStore } from '../../stores/playerStore'
import { SearchResults } from './SearchResults'

/** 本地曲库搜索：直接查询后端曲库并播放结果。 */
export function SearchBox() {
  const [open, setOpen] = useState(false)

  const [keyword, setKeyword] = useState('')

  const [results, setResults] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const setCurrentPlaylistId = usePlaylistStore((s) => s.setCurrentPlaylistId)

  const waitForSongInPlayer = async (songId: string, timeoutMs: number) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const st = usePlayerStore.getState()
      if (st.playlist.some((s) => s.id === songId)) return st
      await new Promise((r) => window.setTimeout(r, 50))
    }
    return null
  }

  const onSelectSong = async (song: Song) => {
    setErrorText(null)
    setIsLoading(true)
    try {
      const st = await waitForSongInPlayer(song.id, 500)
      if (st) {
        const idx = st.playlist.findIndex((s) => s.id === song.id)
        if (idx >= 0) {
          st.play(idx)
          return
        }
      }
      // 当前歌单里没有这首歌：切回“全部音乐”再播放
      setCurrentPlaylistId('all')
      const fallback = await waitForSongInPlayer(song.id, 2000)
      const idx = fallback?.playlist.findIndex((s) => s.id === song.id) ?? -1
      if (fallback && idx >= 0) {
        fallback.play(idx)
      } else {
        usePlayerStore.getState().setPlaylist([song])
        usePlayerStore.getState().play(0)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '播放失败'
      setErrorText(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const onSearch = async () => {
    const kw = keyword.trim()
    if (!kw) return

    setIsLoading(true)
    setErrorText(null)

    try {
      const songs = await fetchTracks(kw)
      setResults(songs)
      if (songs.length === 0) setErrorText('本地曲库中没有匹配的歌曲')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '搜索失败'
      setErrorText(msg)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn btn-ghost" type="button" aria-label="搜索曲库" title="搜索曲库">
          搜索
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[760px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl">
          <Dialog.Title className="text-base font-medium text-slate-100">搜索曲库</Dialog.Title>

          <div className="mt-4 flex flex-col gap-3">
            <label className="text-sm">
              <div className="mb-1 text-slate-400">搜索关键词</div>
              <input
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-400/50 placeholder:text-slate-500 focus:ring-2"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void onSearch()
                }}
                placeholder="搜索歌名 / 歌手 / 专辑"
                autoFocus
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void onSearch()}
                disabled={isLoading || !keyword.trim()}
              >
                {isLoading ? '搜索中...' : '搜索'}
              </button>
            </div>

            {errorText ? <div className="text-sm text-red-300">{errorText}</div> : null}

            <SearchResults
              results={results}
              isLoading={isLoading}
              errorText={null}
              onSelectSong={(s) => void onSelectSong(s)}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <button className="btn btn-secondary" type="button">
                关闭
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
