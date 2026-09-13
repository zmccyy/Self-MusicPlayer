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
    return <div className="text-sm text-text-secondary">正在搜索...</div>
  }

  if (errorText) {
    return (
      <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
        {errorText}
      </div>
    )
  }

  if (!results.length) {
    return <div className="text-sm text-text-secondary">暂无结果</div>
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {results.map((song) => (
        <div
          key={song.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border-soft bg-surface p-2 transition hover:bg-surface-hover"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-strong">
              {song.cover ? (
                // cover 可能是 dataURL/objectURL
                <img src={song.cover} alt={song.name} className="h-full w-full object-cover" />
              ) : (
                <div className="text-xs text-text-muted">♪</div>
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-text-primary">{song.name}</div>
              <div className="truncate text-xs text-text-secondary">
                {song.artist}
                {song.album ? ` - ${song.album}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-xs tabular-nums text-text-secondary sm:block">
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
