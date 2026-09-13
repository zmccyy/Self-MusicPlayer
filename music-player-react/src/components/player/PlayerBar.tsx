import { useState } from 'react'
import { ChevronUp, SlidersHorizontal } from 'lucide-react'
import { PlayerControls } from './PlayerControls'
import { ProgressBar } from './ProgressBar'
import { VolumeControl } from './VolumeControl'
import { NowPlaying } from './NowPlaying'
import { usePlayerStore } from '../../stores/playerStore'
import { EqualizerPanel } from '../equalizer/EqualizerPanel'
import { ShareButton } from '../share/ShareButton'
import { Modal, Tooltip } from '../ui'

export function PlayerBar() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const [eqOpen, setEqOpen] = useState(false)
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false)

  return (
    <div
      className="player-bar fixed bottom-0 left-0 right-0 z-50 border-t border-border-soft bg-bg/80 p-4 backdrop-blur-2xl"
      data-playing={isPlaying ? 'true' : 'false'}
    >
      <div className="mx-auto max-w-6xl rounded-2xl border border-border-soft bg-surface p-4">
        <div className="flex items-center gap-4">
          {/* 封面：点击展开 Now Playing；播放中带呼吸光晕 */}
          <Tooltip content="展开播放面板">
            <button
              type="button"
              className={`relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-surface-strong transition hover:ring-2 hover:ring-emerald-400/50 ${
                isPlaying ? 'cover-playing' : ''
              }`}
              onClick={() => setNowPlayingOpen(true)}
              title="展开播放面板"
              aria-label="展开播放面板"
            >
              {currentSong?.cover ? (
                <img
                  src={currentSong.cover}
                  alt={currentSong.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-6 w-6 text-text-secondary"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
              <ChevronUp className="absolute right-0.5 top-0.5 h-3 w-3 text-white/70 drop-shadow" />
            </button>
          </Tooltip>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-text-secondary">
              {currentSong ? currentSong.artist : '未选择音乐'}
            </div>
            <div className="truncate text-base font-medium text-text-primary">
              {currentSong ? currentSong.name : '—'}
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <ProgressBar />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <PlayerControls />
          <div className="flex items-center gap-2">
            <Tooltip content="均衡器">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-hover hover:text-text-primary disabled:opacity-40"
                type="button"
                aria-label="打开均衡器"
                disabled={!currentSong}
                onClick={() => setEqOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </Tooltip>
            <VolumeControl />
            <ShareButton />
          </div>
        </div>
      </div>

      <NowPlaying open={nowPlayingOpen} onOpenChange={setNowPlayingOpen} />

      <Modal
        open={eqOpen}
        onOpenChange={setEqOpen}
        title="音效均衡器"
        width="w-[640px]"
        showClose={false}
        footer={
          <button className="btn btn-secondary" type="button" onClick={() => setEqOpen(false)}>
            关闭
          </button>
        }
      >
        <EqualizerPanel />
      </Modal>
    </div>
  )
}
