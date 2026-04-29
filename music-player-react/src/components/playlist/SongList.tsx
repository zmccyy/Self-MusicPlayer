import { useMemo } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { formatTime } from '../../utils/formatTime'

export function SongList() {
  const songs = usePlayerStore((s) => s.playlist)
  const currentSongId = usePlayerStore((s) => s.currentSong?.id)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const play = usePlayerStore((s) => s.play)

  const rows = useMemo(() => {
    return songs.map((song, idx) => ({ song, idx }))
  }, [songs])

  return (
    <div className="p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        歌曲列表
      </div>

      {songs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-400">
          暂无音乐
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="grid grid-cols-[48px_1fr_120px] gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-wider text-slate-400">
            <div>#</div>
            <div>标题</div>
            <div className="text-right">时长</div>
          </div>

          <div>
            {rows.map(({ song, idx }) => {
              const isActive = currentSongId === song.id && currentIndex === idx
              return (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => play(idx)}
                  className="song-row grid w-full grid-cols-[48px_1fr_120px] gap-2 border-t border-white/10 px-3 py-2 text-left transition hover:bg-white/[0.06]"
                  data-active={isActive ? 'true' : 'false'}
                >
                  <div className="text-xs text-slate-400">{idx + 1}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-100">{song.name}</div>
                    <div className="truncate text-xs text-slate-400">{song.artist}</div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {formatTime(song.duration || 0)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
