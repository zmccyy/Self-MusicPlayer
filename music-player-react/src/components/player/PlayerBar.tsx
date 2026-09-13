import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { PlayerControls } from './PlayerControls'
import { ProgressBar } from './ProgressBar'
import { VolumeControl } from './VolumeControl'
import { NowPlaying } from './NowPlaying'
import { usePlayerStore } from '../../stores/playerStore'
import { EqualizerPanel } from '../equalizer/EqualizerPanel'
import { ShareButton } from '../share/ShareButton'

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
          <button
            type="button"
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-surface-strong transition hover:ring-2 hover:ring-emerald-400/50"
            onClick={() => setNowPlayingOpen(true)}
            title="展开播放面板"
            aria-label="展开播放面板"
          >
            {currentSong?.cover ? (
              // cover 可能是 dataURL/objectURL，这里直接展示
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
          </button>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-text-secondary">
              {currentSong ? currentSong.artist : '未选择音乐'}
            </div>
            <div className="truncate text-base font-medium text-text-primary">
              {currentSong ? currentSong.name : '—'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProgressBar />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <PlayerControls />
          <div className="flex items-center gap-3">
            <Dialog.Root open={eqOpen} onOpenChange={setEqOpen}>
              <Dialog.Trigger asChild>
                <button
                  className="btn btn-ghost"
                  type="button"
                  aria-label="打开均衡器"
                  title="均衡器"
                  disabled={!currentSong}
                >
                  均衡器
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-1/2 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-elevated p-4 shadow-2xl">
                  <Dialog.Title className="text-base font-medium text-text-primary">
                    音效均衡器
                  </Dialog.Title>
                  <div className="mt-4">
                    <EqualizerPanel />
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
            <VolumeControl />
            <ShareButton />
          </div>
        </div>
      </div>

      <NowPlaying open={nowPlayingOpen} onOpenChange={setNowPlayingOpen} />
    </div>
  )
}
