import { useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ListPlus, ListX, Music2, Pencil, Play, Trash2 } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { usePlaylistStore } from '../../stores/playlistStore'
import { formatTime } from '../../utils/formatTime'
import type { Song } from '../../types/song'
import { EditSongModal } from '../library/EditSongModal'
import { AddToPlaylistModal } from '../library/AddToPlaylistModal'
import { ConfirmDialog, EqualizerBars, Tooltip } from '../ui'

export function SongList() {
  const songs = usePlayerStore((s) => s.playlist)
  const currentSongId = usePlayerStore((s) => s.currentSong?.id)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const play = usePlayerStore((s) => s.play)
  const removeSong = usePlaylistStore((s) => s.removeSong)
  const currentPlaylistId = usePlaylistStore((s) => s.currentPlaylistId)
  const removeSongFromPlaylist = usePlaylistStore((s) => s.removeSongFromPlaylist)
  const reorderPlaylist = usePlaylistStore((s) => s.reorderPlaylist)

  const [editingSong, setEditingSong] = useState<Song | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [addingSong, setAddingSong] = useState<Song | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [deletingSong, setDeletingSong] = useState<Song | null>(null)

  // 歌单视图下允许拖拽排序
  const dragIndex = useRef<number | null>(null)
  const inPlaylistView = currentPlaylistId !== 'all'

  const rows = useMemo(() => {
    return songs.map((song, idx) => ({ song, idx }))
  }, [songs])

  const onAddToPlaylist = (song: Song) => {
    setAddingSong(song)
    setAddOpen(true)
  }

  const onDrop = (targetIdx: number) => {
    const from = dragIndex.current
    dragIndex.current = null
    if (from === null || from === targetIdx) return
    const songIds = songs.map((s) => s.id)
    const [moved] = songIds.splice(from, 1)
    songIds.splice(targetIdx, 0, moved)
    void reorderPlaylist(currentPlaylistId, songIds)
  }

  const ACTION_BTN =
    'flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-hover hover:text-text-primary'

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
          歌曲列表
        </div>
        {inPlaylistView ? (
          <div className="text-xs text-text-muted">拖动歌曲行可调整歌单顺序</div>
        ) : null}
      </div>

      {songs.length === 0 ? (
        <div className="rounded-2xl border border-border-soft bg-surface p-8 text-center text-sm text-text-secondary">
          暂无音乐
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface">
          <div className="grid grid-cols-[56px_1fr_120px_110px] gap-2 border-b border-border-soft bg-surface px-3 py-2 text-xs uppercase tracking-wider text-text-secondary">
            <div>#</div>
            <div>标题</div>
            <div className="text-right">时长</div>
            <div className="text-right">操作</div>
          </div>

          <div>
            {rows.map(({ song, idx }, rowIdx) => {
              const isActive = currentSongId === song.id && currentIndex === idx
              return (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: Math.min(rowIdx * 0.025, 0.35),
                    ease: 'easeOut',
                  }}
                  className="song-row group grid w-full grid-cols-[56px_1fr_120px_110px] items-center gap-2 border-t border-border-soft px-3 py-2 text-left transition hover:bg-surface-hover"
                  data-active={isActive ? 'true' : 'false'}
                  draggable={inPlaylistView}
                  onDragStart={() => {
                    dragIndex.current = idx
                  }}
                  onDragOver={(e) => {
                    if (inPlaylistView) e.preventDefault()
                  }}
                  onDrop={() => {
                    if (inPlaylistView) onDrop(idx)
                  }}
                >
                  {/* 序号 / 播放中动画条 / hover 播放按钮 */}
                  <span className="flex h-8 items-center text-xs text-text-secondary group-hover:hidden">
                    {isActive && isPlaying ? (
                      <EqualizerBars />
                    ) : isActive ? (
                      <span className="font-medium text-emerald-500">▶</span>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => play(idx)}
                    className="hidden h-8 items-center text-text-secondary group-hover:flex"
                    title="播放"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 transition group-hover:scale-105">
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </span>
                  </button>

                  {/* 封面 + 标题 */}
                  <button
                    type="button"
                    onClick={() => play(idx)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-strong">
                      {song.cover ? (
                        <img src={song.cover} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Music2 className="h-4 w-4 text-text-muted" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-sm ${
                          isActive ? 'font-medium text-emerald-500' : 'text-text-primary'
                        }`}
                      >
                        {song.name}
                      </span>
                      <span className="block truncate text-xs text-text-secondary">
                        {song.artist}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => play(idx)}
                    className="flex items-center justify-end text-xs text-text-secondary"
                  >
                    {formatTime(song.duration || 0)}
                  </button>

                  {/* 行操作（hover 展开） */}
                  <div className="flex items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100">
                    {inPlaylistView ? (
                      <Tooltip content="从当前歌单移除">
                        <button
                          type="button"
                          className={ACTION_BTN}
                          onClick={() => void removeSongFromPlaylist(currentPlaylistId, song.id)}
                          title="从当前歌单移除"
                        >
                          <ListX className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    ) : (
                      <Tooltip content="添加到歌单">
                        <button
                          type="button"
                          className={ACTION_BTN}
                          onClick={() => onAddToPlaylist(song)}
                          title="添加到歌单"
                        >
                          <ListPlus className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip content="编辑信息">
                      <button
                        type="button"
                        className={ACTION_BTN}
                        onClick={() => {
                          setEditingSong(song)
                          setEditOpen(true)
                        }}
                        title="编辑信息"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip content="从曲库删除">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition hover:bg-red-500/15 hover:text-red-400"
                        onClick={() => setDeletingSong(song)}
                        title="从曲库删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      <EditSongModal song={editingSong} open={editOpen} onOpenChange={setEditOpen} />
      <AddToPlaylistModal song={addingSong} open={addOpen} onOpenChange={setAddOpen} />

      <ConfirmDialog
        open={deletingSong !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingSong(null)
        }}
        title={`从曲库删除《${deletingSong?.name ?? ''}》？`}
        description="将同时删除音频文件、封面与歌词，歌单中的关联也会移除。"
        confirmText="删除"
        onConfirm={() => {
          if (deletingSong) void removeSong(deletingSong.id)
          setDeletingSong(null)
        }}
      />
    </div>
  )
}
