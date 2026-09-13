import { useMemo, useRef, useState } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { usePlaylistStore } from '../../stores/playlistStore'
import { formatTime } from '../../utils/formatTime'
import type { Song } from '../../types/song'
import { EditSongModal } from '../library/EditSongModal'
import { AddToPlaylistModal } from '../library/AddToPlaylistModal'

export function SongList() {
  const songs = usePlayerStore((s) => s.playlist)
  const currentSongId = usePlayerStore((s) => s.currentSong?.id)
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

  // 歌单视图下允许拖拽排序
  const dragIndex = useRef<number | null>(null)
  const inPlaylistView = currentPlaylistId !== 'all'

  const rows = useMemo(() => {
    return songs.map((song, idx) => ({ song, idx }))
  }, [songs])

  const onEdit = (song: Song) => {
    setEditingSong(song)
    setEditOpen(true)
  }

  const onAddToPlaylist = (song: Song) => {
    setAddingSong(song)
    setAddOpen(true)
  }

  const onDelete = (song: Song) => {
    if (window.confirm(`确定从曲库删除《${song.name}》吗？`)) {
      void removeSong(song.id)
    }
  }

  const onRemoveFromPlaylist = (song: Song) => {
    void removeSongFromPlaylist(currentPlaylistId, song.id)
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

  const actionBtn =
    'rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white'

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          歌曲列表
        </div>
        {inPlaylistView ? (
          <div className="text-xs text-slate-500">拖动歌曲行可调整歌单顺序</div>
        ) : null}
      </div>

      {songs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-400">
          暂无音乐
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="grid grid-cols-[48px_1fr_120px_110px] gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-wider text-slate-400">
            <div>#</div>
            <div>标题</div>
            <div className="text-right">时长</div>
            <div className="text-right">操作</div>
          </div>

          <div>
            {rows.map(({ song, idx }) => {
              const isActive = currentSongId === song.id && currentIndex === idx
              return (
                <div
                  key={song.id}
                  className="song-row group grid w-full grid-cols-[48px_1fr_120px_110px] gap-2 border-t border-white/10 px-3 py-2 text-left transition hover:bg-white/[0.06]"
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
                  <button
                    type="button"
                    onClick={() => play(idx)}
                    className="flex items-center text-xs text-slate-400"
                    title="播放"
                  >
                    {idx + 1}
                  </button>
                  <button type="button" onClick={() => play(idx)} className="min-w-0 text-left">
                    <div className="truncate text-sm text-slate-100">{song.name}</div>
                    <div className="truncate text-xs text-slate-400">{song.artist}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => play(idx)}
                    className="flex items-center justify-end text-xs text-slate-400"
                  >
                    {formatTime(song.duration || 0)}
                  </button>
                  <div className="flex items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100">
                    {inPlaylistView ? (
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => onRemoveFromPlaylist(song)}
                        title="从当前歌单移除"
                      >
                        移除
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => onAddToPlaylist(song)}
                        title="添加到歌单"
                      >
                        +歌单
                      </button>
                    )}
                    <button type="button" className={actionBtn} onClick={() => onEdit(song)} title="编辑信息">
                      编辑
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                      onClick={() => onDelete(song)}
                      title="从曲库删除"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <EditSongModal song={editingSong} open={editOpen} onOpenChange={setEditOpen} />
      <AddToPlaylistModal song={addingSong} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
