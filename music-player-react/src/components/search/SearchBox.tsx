import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  fetchTracks,
  neteaseStreamUrl,
  neteaseTempSongId,
  saveNeteaseTrack,
  searchNetease,
  type OnlineSong,
} from '../../api/client'
import type { Song } from '../../types/song'
import { usePlaylistStore } from '../../stores/playlistStore'
import { usePlayerStore } from '../../stores/playerStore'
import { SearchResults } from './SearchResults'
import { formatTime } from '../../utils/formatTime'

type Mode = 'library' | 'online'

/** 搜索：本地曲库 + NetEase 在线搜索（试听/收藏入库）。 */
export function SearchBox() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('library')

  const [keyword, setKeyword] = useState('')

  const [results, setResults] = useState<Song[]>([])
  const [onlineResults, setOnlineResults] = useState<OnlineSong[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const setCurrentPlaylistId = usePlaylistStore((s) => s.setCurrentPlaylistId)
  const loadAll = usePlaylistStore((s) => s.loadAll)

  const waitForSongInPlayer = async (songId: string, timeoutMs: number) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const st = usePlayerStore.getState()
      if (st.playlist.some((s) => s.id === songId)) return st
      await new Promise((r) => window.setTimeout(r, 50))
    }
    return null
  }

  const playFromLibrary = async (song: Song) => {
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
  }

  const playOnline = (song: OnlineSong) => {
    usePlayerStore.getState().enqueueAndPlay({
      id: neteaseTempSongId(song.id),
      name: song.name,
      artist: song.artists,
      album: song.album ?? '未知专辑',
      duration: song.duration,
      url: neteaseStreamUrl(song.id),
      cover: song.coverUrl,
      addedAt: Date.now(),
      source: 'online',
    })
  }

  const saveOnline = async (song: OnlineSong) => {
    setSavingId(song.id)
    setErrorText(null)
    try {
      const saved = await saveNeteaseTrack(song.id, {
        name: song.name,
        artists: song.artists,
        durationSec: song.duration,
      })
      await loadAll()
      // 队列中的临时在线曲目替换为正式曲目
      usePlayerStore.getState().replaceSong(neteaseTempSongId(song.id), saved)
      setOnlineResults((prev) => prev.filter((s) => s.id !== song.id))
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : '收藏失败')
    } finally {
      setSavingId(null)
    }
  }

  const onSearch = async () => {
    const kw = keyword.trim()
    if (!kw) return

    setIsLoading(true)
    setErrorText(null)

    try {
      if (mode === 'library') {
        const songs = await fetchTracks(kw)
        setResults(songs)
        if (songs.length === 0) setErrorText('本地曲库中没有匹配的歌曲')
      } else {
        const songs = await searchNetease(kw, 20)
        setOnlineResults(songs)
        if (songs.length === 0) setErrorText('没有找到在线歌曲')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '搜索失败'
      setErrorText(msg)
      setResults([])
      setOnlineResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setResults([])
    setOnlineResults([])
    setErrorText(null)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn btn-ghost" type="button" aria-label="搜索" title="搜索">
          搜索
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[760px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl">
          <Dialog.Title className="text-base font-medium text-slate-100">搜索</Dialog.Title>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              {(
                [
                  ['library', '曲库'],
                  ['online', '在线（NetEase）'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    mode === value
                      ? 'flex-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-300'
                      : 'flex-1 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-white'
                  }
                  onClick={() => switchMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-400/50 placeholder:text-slate-500 focus:ring-2"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void onSearch()
                }}
                placeholder={mode === 'library' ? '搜索歌名 / 歌手 / 专辑' : '例如：周杰伦 晴天'}
                autoFocus
              />
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

            {mode === 'library' ? (
              <SearchResults
                results={results}
                isLoading={isLoading}
                errorText={null}
                onSelectSong={(s) => void playFromLibrary(s)}
              />
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {onlineResults.map((song) => (
                  <div
                    key={song.id}
                    data-online-row
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.06]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{song.name}</span>
                        {song.fee !== 0 ? (
                          <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                            VIP
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-xs text-slate-400">
                        {song.artists}
                        {song.album ? ` · ${song.album}` : ''}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatTime(song.duration || 0)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost min-h-8 px-3 py-1 text-xs"
                      onClick={() => playOnline(song)}
                    >
                      播放
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary min-h-8 px-3 py-1 text-xs"
                      disabled={savingId === song.id}
                      onClick={() => void saveOnline(song)}
                    >
                      {savingId === song.id ? '下载中...' : '收藏'}
                    </button>
                  </div>
                ))}
              </div>
            )}
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
