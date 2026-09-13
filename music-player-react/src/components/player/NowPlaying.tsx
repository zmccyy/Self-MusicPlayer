import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, Reorder } from 'motion/react'
import { ChevronDown, GripVertical } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { getLyricBySongId, findActiveLyricIndex } from '../../services/lyricService'
import { formatTime } from '../../utils/formatTime'
import { EqualizerBars } from '../ui'
import type { LyricLine } from '../../types/lyric'

type Tab = 'lyrics' | 'queue'

/**
 * 全屏 Now Playing：动效背景 + 大封面 + 同步歌词 / 可拖拽队列。
 * 由 PlayerBar 的封面/标题区域触发；portal 到 body
 * （PlayerBar 的 backdrop-blur 会把 fixed 后代限制在自己的盒子内）。
 */
export function NowPlaying({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const playlist = usePlayerStore((s) => s.playlist)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const play = usePlayerStore((s) => s.play)
  const seek = usePlayerStore((s) => s.seek)
  const reorderQueue = usePlayerStore((s) => s.reorderQueue)

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

  const drift = isPlaying ? 1 : 0.35

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 overflow-hidden bg-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* 动效背景：跟随播放状态漂移/呼吸的光斑 */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <motion.div
              className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-emerald-500/20 blur-3xl"
              animate={{ x: [0, 90 * drift, 0], y: [0, 60 * drift, 0], opacity: isPlaying ? [0.7, 1, 0.7] : 0.5 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute right-0 top-1/4 h-[380px] w-[380px] rounded-full bg-teal-500/15 blur-3xl"
              animate={{ x: [0, -70 * drift, 0], y: [0, 80 * drift, 0], opacity: isPlaying ? [0.6, 0.95, 0.6] : 0.4 }}
              transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-cyan-500/10 blur-3xl"
              animate={{ x: [0, 60 * drift, 0], y: [0, -50 * drift, 0], opacity: isPlaying ? [0.5, 0.85, 0.5] : 0.35 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <button
            type="button"
            className="btn btn-ghost absolute right-6 top-6 z-10"
            onClick={() => onOpenChange(false)}
          >
            <ChevronDown className="h-4 w-4" />
            收起
          </button>

          <div className="relative mx-auto flex h-full max-w-6xl flex-col gap-5 px-6 pb-28 pt-14">
            <div className="flex flex-col items-center gap-4 text-center">
              {/* 封面：播放中呼吸光晕 + 轻浮动 */}
              <motion.div
                animate={isPlaying ? { y: [0, -6, 0] } : { y: 0 }}
                transition={{ duration: 5, repeat: isPlaying ? Infinity : 0, ease: 'easeInOut' }}
                className={`flex h-44 w-44 items-center justify-center overflow-hidden rounded-3xl bg-surface-strong ${
                  isPlaying ? 'cover-playing' : ''
                }`}
              >
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
              </motion.div>

              {/* 切歌时标题滑入过渡 */}
              <div className="relative h-16 w-full max-w-xl overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSong?.id ?? 'none'}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-x-0"
                  >
                    <div className="truncate text-2xl font-semibold text-text-primary">
                      {currentSong?.name ?? '未选择音乐'}
                    </div>
                    <div className="mt-1 truncate text-sm text-text-secondary">
                      {currentSong?.artist ?? '—'}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex gap-1 rounded-xl border border-border-soft bg-surface p-1 backdrop-blur">
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
                      <motion.button
                        key={idx}
                        type="button"
                        data-line-index={idx}
                        onClick={() => seek(line.time / 1000)}
                        animate={{
                          scale: idx === activeIndex ? 1.04 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                        className={`block w-full cursor-pointer rounded-lg px-4 py-1.5 transition-colors ${
                          idx === activeIndex
                            ? 'text-lg text-text-primary'
                            : 'text-sm text-text-muted hover:text-text-secondary'
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
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <Reorder.Group
                  axis="y"
                  values={playlist}
                  onReorder={reorderQueue}
                  className="mx-auto max-w-2xl space-y-1 pb-8"
                >
                  {playlist.map((song, idx) => (
                    <Reorder.Item
                      key={song.id}
                      value={song}
                      whileDrag={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}
                      className={`flex w-full cursor-grab items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition active:cursor-grabbing ${
                        idx === currentIndex ? 'bg-emerald-500/10 text-emerald-500' : 'text-text-primary hover:bg-surface-hover'
                      }`}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-text-muted opacity-60" />
                      <span className="w-6 shrink-0 text-xs text-text-muted" data-nowplaying-queue-row>
                        {idx + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {song.name}
                        <span className="ml-2 text-xs text-text-secondary">{song.artist}</span>
                      </span>
                      {idx === currentIndex && isPlaying ? <EqualizerBars className="mr-2" /> : null}
                      <span className="shrink-0 text-xs text-text-muted">{formatTime(song.duration || 0)}</span>
                      <button
                        type="button"
                        onClick={() => play(idx)}
                        className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 transition hover:scale-105"
                        title="播放"
                        aria-label={`播放 ${song.name}`}
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden>
                          <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.5-6.86a1.05 1.05 0 0 0 0-1.76L9.56 4.26A1.04 1.04 0 0 0 8 5.14Z" />
                        </svg>
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
