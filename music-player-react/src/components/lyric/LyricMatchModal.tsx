import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  fetchNeteaseLyrics,
  saveTrackLyric,
  searchNetease,
  type OnlineSong,
} from '../../api/client'
import type { Song } from '../../types/song'
import { usePlaylistStore } from '../../stores/playlistStore'
import { LrcParser } from '../../utils/lrcParser'

type Props = {
  song: Song | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 从 NetEase 在线匹配歌词（含翻译），保存绑定到当前歌曲。 */
export function LyricMatchModal({ song, open, onOpenChange }: Props) {
  const loadAll = usePlaylistStore((s) => s.loadAll)
  const [keyword, setKeyword] = useState('')
  const [candidates, setCandidates] = useState<OnlineSong[]>([])
  const [searching, setSearching] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedInfo, setSavedInfo] = useState<string | null>(null)

  // 打开时用“歌名 歌手”作为默认关键词
  useEffect(() => {
    if (open && song && !keyword) setKeyword(`${song.name} ${song.artist}`)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!song) return null

  const onSearch = async () => {
    const kw = keyword.trim() || `${song.name} ${song.artist}`
    setSearching(true)
    setError(null)
    setCandidates([])
    try {
      const songs = await searchNetease(kw, 10)
      setCandidates(songs)
      if (songs.length === 0) setError('没有找到候选歌曲，试试换个关键词')
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜索失败')
    } finally {
      setSearching(false)
    }
  }

  const onPick = async (candidate: OnlineSong) => {
    setSavingId(candidate.id)
    setError(null)
    try {
      const lyrics = await fetchNeteaseLyrics(candidate.id)
      if (!lyrics.lrc || !lyrics.lrc.trim()) {
        setError('该歌曲没有可用歌词')
        return
      }
      await saveTrackLyric(song.id, lyrics.lrc, 'external', lyrics.translation)
      setSavedInfo(
        `已保存《${candidate.name}》的歌词${lyrics.translation ? '（含翻译）' : ''}`,
      )
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[560px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-elevated p-5 shadow-2xl">
          <Dialog.Title className="text-base font-medium text-text-primary">在线匹配歌词</Dialog.Title>
          <Dialog.Description className="mt-1 truncate text-sm text-text-secondary">
            为《{song.name} - {song.artist}》匹配歌词，保存后自动同步显示
          </Dialog.Description>

          <div className="mt-4 flex gap-2">
            <input
              className="flex-1 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none ring-emerald-400/50 focus:ring-2"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onSearch()
              }}
              placeholder="歌名 歌手"
              autoFocus
            />
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void onSearch()}
              disabled={searching}
            >
              {searching ? '搜索中...' : '搜索'}
            </button>
          </div>

          {error ? <div className="mt-2 text-sm text-red-300">{error}</div> : null}
          {savedInfo ? <div className="mt-2 text-sm text-emerald-500">{savedInfo}</div> : null}

          <div className="mt-3 flex max-h-72 flex-col gap-1 overflow-y-auto">
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={savingId !== null}
                onClick={() => void onPick(c)}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-text-primary transition hover:bg-surface-hover disabled:opacity-40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{c.name}</span>
                  <span className="block truncate text-xs text-text-secondary">
                    {c.artists}
                    {c.album ? ` · ${c.album}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-text-secondary">
                  {savingId === c.id ? '获取中...' : '使用此歌词'}
                </span>
              </button>
            ))}
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

/** 供预览使用：解析前几行（未被 UI 直接依赖时便于测试）。 */
export function previewLines(lrc: string, translation?: string | null) {
  return LrcParser.parse(lrc, translation).slice(0, 5)
}
