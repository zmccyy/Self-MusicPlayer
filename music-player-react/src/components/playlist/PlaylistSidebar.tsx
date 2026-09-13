import { useMemo } from 'react'
import { usePlaylistStore } from '../../stores/playlistStore'

type Props = {
  onCreateClick: () => void
}

export function PlaylistSidebar({ onCreateClick }: Props) {
  const currentPlaylistId = usePlaylistStore((s) => s.currentPlaylistId)
  const playlists = usePlaylistStore((s) => s.playlists)
  const setCurrentPlaylistId = usePlaylistStore((s) => s.setCurrentPlaylistId)
  const updatePlaylist = usePlaylistStore((s) => s.updatePlaylist)
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist)

  const items = useMemo(() => {
    return [
      {
        id: 'all' as const,
        name: '全部音乐',
        count: -1,
      },
      ...playlists.map((p) => ({ id: p.id, name: p.name, count: p.songs.length })),
    ]
  }, [playlists])

  const onRename = (id: string, name: string) => {
    const next = window.prompt('重命名歌单', name)
    if (next && next.trim() && next.trim() !== name) {
      void updatePlaylist(id, { name: next.trim() })
    }
  }

  const onDelete = (id: string, name: string) => {
    if (window.confirm(`确定删除歌单《${name}》吗？（曲库中的歌曲不受影响）`)) {
      void deletePlaylist(id)
    }
  }

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
            <div
              key={item.id}
              className="playlist-item group relative flex items-center rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
              data-active={currentPlaylistId === item.id ? 'true' : 'false'}
            >
              <button
                className="min-w-0 flex-1 truncate bg-transparent text-left"
                onClick={() => setCurrentPlaylistId(item.id)}
                type="button"
                title={item.name}
              >
                {item.name}
              </button>
              {item.count >= 0 ? (
                <span className="ml-2 shrink-0 text-xs text-slate-500 transition group-hover:opacity-0">
                  {item.count}
                </span>
              ) : null}
              {item.id !== 'all' ? (
                <span className="absolute right-2 hidden shrink-0 items-center gap-1 rounded-lg bg-slate-800/95 px-1.5 py-0.5 shadow group-hover:flex">
                  <button
                    type="button"
                    className="rounded px-1 text-xs text-slate-400 hover:text-white"
                    title="重命名"
                    onClick={() => onRename(item.id, item.name)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="rounded px-1 text-xs text-slate-400 hover:text-red-300"
                    title="删除歌单"
                    onClick={() => onDelete(item.id, item.name)}
                  >
                    ✕
                  </button>
                </span>
              ) : null}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}
