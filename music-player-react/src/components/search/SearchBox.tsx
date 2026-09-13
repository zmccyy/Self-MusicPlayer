import { useState } from 'react'
import { Search } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Modal, Input, Button, Badge } from '../ui'
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
      // 先把队列里的临时在线曲目替换为正式曲目（保持播放不中断），
      // 再刷新曲库 —— 顺序很重要，否则曲库刷新会把临时歌曲挤出队列。
      usePlayerStore.getState().replaceSong(neteaseTempSongId(song.id), saved)
      await loadAll()
      setOnlineResults((prev) => prev.filter((s) => s.id !== song.id))
      toast.success(`《${saved.name}》已收藏入曲库`)
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
    <>
      <Button variant="ghost" aria-label="搜索" title="搜索" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4" />
        搜索
      </Button>

      <Modal open={open} onOpenChange={setOpen} title="搜索" width="w-[720px]" showClose={false}>
        <div className="flex flex-col gap-3">
          <div className="flex gap-1 rounded-xl border border-border-soft bg-surface p-1">
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
                    ? 'flex-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-500'
                    : 'flex-1 rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary'
                }
                onClick={() => switchMode(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              className="flex-1"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onSearch()
              }}
              placeholder={mode === 'library' ? '搜索歌名 / 歌手 / 专辑' : '例如：周杰伦 晴天'}
              autoFocus
            />
            <Button
              variant="primary"
              onClick={() => void onSearch()}
              disabled={isLoading || !keyword.trim()}
            >
              {isLoading ? '搜索中...' : '搜索'}
            </Button>
          </div>

          {errorText ? <div className="text-sm text-red-400">{errorText}</div> : null}

          {mode === 'library' ? (
            <SearchResults
              results={results}
              isLoading={isLoading}
              errorText={null}
              onSelectSong={(s) => void playFromLibrary(s)}
            />
          ) : (
            <div className="max-h-80 overflow-y-auto pr-1">
              {onlineResults.map((song, idx) => (
                <motion.div
                  key={song.id}
                  data-online-row
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.3) }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-primary transition hover:bg-surface-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{song.name}</span>
                      {song.fee !== 0 ? <Badge tone="warn">VIP</Badge> : null}
                    </div>
                    <div className="truncate text-xs text-text-secondary">
                      {song.artists}
                      {song.album ? ` · ${song.album}` : ''}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">
                    {formatTime(song.duration || 0)}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => playOnline(song)}>
                    播放
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={savingId === song.id}
                    onClick={() => void saveOnline(song)}
                  >
                    {savingId === song.id ? '下载中...' : '收藏'}
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            关闭
          </Button>
        </div>
      </Modal>
    </>
  )
}
