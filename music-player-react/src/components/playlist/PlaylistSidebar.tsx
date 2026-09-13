import { useMemo, useState } from 'react'
import { ListMusic, Pencil, Plus, Trash2 } from 'lucide-react'
import { usePlaylistStore } from '../../stores/playlistStore'
import { Button, ConfirmDialog, Tooltip } from '../ui'

type Props = {
  onCreateClick: () => void
}

export function PlaylistSidebar({ onCreateClick }: Props) {
  const currentPlaylistId = usePlaylistStore((s) => s.currentPlaylistId)
  const playlists = usePlaylistStore((s) => s.playlists)
  const setCurrentPlaylistId = usePlaylistStore((s) => s.setCurrentPlaylistId)
  const updatePlaylist = usePlaylistStore((s) => s.updatePlaylist)
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist)

  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)

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

  return (
    <aside className="w-72 shrink-0 rounded-3xl border border-border-soft bg-surface backdrop-blur-xl">
      <div className="p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
          我的歌单
        </div>

        <Button variant="secondary" className="mb-4 w-full" onClick={onCreateClick} type="button">
          <Plus className="h-4 w-4" />
          创建歌单
        </Button>

        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="playlist-item group relative flex items-center rounded-xl px-3 py-2 text-left text-sm text-text-primary transition hover:bg-surface-hover"
              data-active={currentPlaylistId === item.id ? 'true' : 'false'}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-2 bg-transparent text-left"
                onClick={() => setCurrentPlaylistId(item.id)}
                type="button"
                title={item.name}
              >
                {item.id === 'all' ? (
                  <ListMusic className="h-4 w-4 shrink-0 text-text-muted" />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                )}
                <span className="truncate">{item.name}</span>
              </button>
              {item.count >= 0 ? (
                <span className="ml-2 shrink-0 text-xs text-text-muted transition group-hover:opacity-0">
                  {item.count}
                </span>
              ) : null}
              {item.id !== 'all' ? (
                <span className="absolute right-2 hidden shrink-0 items-center gap-0.5 rounded-lg bg-surface-strong px-1 shadow group-hover:flex">
                  <Tooltip content="重命名">
                    <button
                      type="button"
                      className="rounded p-1 text-text-muted transition hover:text-text-primary"
                      title="重命名"
                      onClick={() => onRename(item.id, item.name)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip content="删除歌单">
                    <button
                      type="button"
                      className="rounded p-1 text-text-muted transition hover:text-red-400"
                      title="删除歌单"
                      onClick={() => setDeleting({ id: item.id, name: item.name })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                </span>
              ) : null}
            </div>
          ))}
        </nav>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={`删除歌单《${deleting?.name ?? ''}》？`}
        description="曲库中的歌曲不受影响。"
        confirmText="删除歌单"
        onConfirm={() => {
          if (deleting) void deletePlaylist(deleting.id)
          setDeleting(null)
        }}
      />
    </aside>
  )
}
