import type { Song } from '../../types/song'
import { formatTime } from '../../utils/formatTime'

type Props = {
  results: Song[]
  isLoading?: boolean
  errorText?: string | null
  onSelectSong: (song: Song) => void
}

export function SearchResults({ results, isLoading, errorText, onSelectSong }: Props) {
  if (isLoading) {
    return <div className="text-sm text-slate-400">正在搜索...</div>
  }

  if (errorText) {
    return (
      <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
        {errorText}
      </div>
    )
  }

  if (!results.length) {
    return <div className="text-sm text-slate-400">暂无结果</div>
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {results.map((song) => (
        <div
          key={song.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 transition hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
              {song.cover ? (
                // cover 可能是 dataURL/objectURL
                <img src={song.cover} alt={song.name} className="h-full w-full object-cover" />
              ) : (
                <div className="text-xs text-slate-500">♪</div>
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-100">{song.name}</div>
              <div className="truncate text-xs text-slate-400">
                {song.artist}
                {song.album ? ` - ${song.album}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-xs tabular-nums text-slate-400 sm:block">
              {song.duration ? formatTime(song.duration) : '—'}
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => onSelectSong(song)}>
              播放
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
