import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePlayerStore } from '../../stores/playerStore'
import { getLyricBySongId, findActiveLyricIndex } from '../../services/lyricService'
import { formatTime } from '../../utils/formatTime'
import type { LyricLine } from '../../types/lyric'

type Tab = 'lyrics' | 'queue'

/**
 * 全屏 Now Playing：大封面 + 同步歌词 / 播放队列两个 Tab。
 * 由 PlayerBar 的封面/标题区域触发。
 */
export function NowPlaying({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const playlist = usePlayerStore((s) => s.playlist)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const play = usePlayerStore((s) => s.play)
  const seek = usePlayerStore((s) => s.seek)

  const [tab, setTab] = useState<Tab>('lyrics')
  const [lines, setLines] = useState<LyricLine[]>([])
  const lyricsWrapRef = useRef<HTMLDivElement | null>(null)

  const activeIndex = useMemo(() => findActiveLyricIndex(lines, currentTime), [lines, currentTime])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!currentSong) {
        setLines([])
        return
      }
      const lyric = await getLyricBySongId(currentSong.id)
      if (!cancelled) setLines(lyric?.lines ?? [])
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [currentSong?.id])

  useEffect(() => {
    if (!open || tab !== 'lyrics' || activeIndex < 0) return
    const root = lyricsWrapRef.current
    if (!root) return
    root.querySelector<HTMLElement>(`[data-line-index="${activeIndex}"]`)?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    })
  }, [activeIndex, open, tab])

  return createPortal(
    <div
      className={`fixed inset-0 z-40 bg-bg-translucent backdrop-blur-2xl transition-opacity duration-300 ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="btn btn-ghost absolute right-6 top-6 z-10"
        onClick={() => onOpenChange(false)}
      >
        收起
      </button>

      <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 px-6 pb-32 pt-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-3xl bg-surface-strong shadow-2xl">
            {currentSong?.cover ? (
              <img src={currentSong.cover} alt={currentSong.name} className="h-full w-full object-cover" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-16 w-16 text-text-secondary"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>
          <div>
            <div className="text-2xl font-semibold text-text-primary">{currentSong?.name ?? '未选择音乐'}</div>
            <div className="mt-1 text-sm text-text-secondary">{currentSong?.artist ?? '—'}</div>
          </div>

          <div className="flex gap-1 rounded-xl border border-border-soft bg-surface p-1">
            {(
              [
                ['lyrics', '歌词'],
                ['queue', `播放队列 (${playlist.length})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                data-nowplaying-tab={value}
                className={
                  tab === value
                    ? 'rounded-lg bg-emerald-500/20 px-4 py-1.5 text-sm text-emerald-500'
                    : 'rounded-lg px-4 py-1.5 text-sm text-text-secondary hover:text-text-primary'
                }
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'lyrics' ? (
          <div ref={lyricsWrapRef} className="min-h-0 flex-1 overflow-y-auto text-center">
            {lines.length === 0 ? (
              <div className="mt-10 text-sm text-text-muted">暂无歌词，可在主面板上传或在线匹配</div>
            ) : (
              <div className="space-y-1 py-6">
                {lines.map((line, idx) => (
                  <button
                    key={idx}
                    type="button"
                    data-line-index={idx}
                    onClick={() => seek(line.time / 1000)}
                    className={`block w-full rounded-lg px-4 py-1.5 transition ${
                      idx === activeIndex ? 'text-lg text-text-primary' : 'text-sm text-text-muted hover:text-text-secondary'
                    }`}
                    style={
                      idx === activeIndex
                        ? { background: 'linear-gradient(90deg, rgba(16,185,129,0.16), rgba(20,184,166,0.06))' }
                        : undefined
                    }
                  >
                    <span className="block">{line.text}</span>
                    {line.translation ? (
                      <span className="mt-0.5 block text-xs text-text-secondary">{line.translation}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl space-y-1 pb-8">
              {playlist.map((song, idx) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => play(idx)}
                  data-nowplaying-queue-row
                  data-active={idx === currentIndex ? 'true' : 'false'}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-surface-hover ${
                    idx === currentIndex ? 'bg-emerald-500/10 text-emerald-200' : 'text-text-secondary'
                  }`}
                >
                  <span className="w-6 shrink-0 text-xs text-text-muted">{idx + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {song.name}
                    <span className="ml-2 text-xs text-text-muted">{song.artist}</span>
                  </span>
                  <span className="shrink-0 text-xs text-text-muted">{formatTime(song.duration || 0)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    // PlayerBar 上的 backdrop-blur 会为 fixed 后代创建 containing block，
    // 必须 portal 到 body 才能真正铺满视口。
    document.body,
  )
}

