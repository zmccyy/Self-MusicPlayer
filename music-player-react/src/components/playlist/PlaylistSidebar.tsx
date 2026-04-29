import { useMemo } from 'react'
import { usePlaylistStore } from '../../stores/playlistStore'

type Props = {
  onCreateClick: () => void
}

export function PlaylistSidebar({ onCreateClick }: Props) {
  const currentPlaylistId = usePlaylistStore((s) => s.currentPlaylistId)
  const playlists = usePlaylistStore((s) => s.playlists)
  const setCurrentPlaylistId = usePlaylistStore((s) => s.setCurrentPlaylistId)

  const items = useMemo(() => {
    return [
      {
        id: 'all' as const,
        name: '全部音乐',
      },
      ...playlists.map((p) => ({ id: p.id, name: p.name })),
    ]
  }, [playlists])

  return (
    <aside className="w-72 shrink-0 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
      <div className="p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          我的歌单
        </div>

        <button className="btn btn-secondary mb-4 w-full" onClick={onCreateClick} type="button">
          创建歌单
        </button>

        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <button
              key={item.id}
              className="playlist-item rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
              data-active={currentPlaylistId === item.id ? 'true' : 'false'}
              onClick={() => setCurrentPlaylistId(item.id)}
              type="button"
            >
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  )
}
