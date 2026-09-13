import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type { Song } from '../../types/song'
import { usePlaylistStore } from '../../stores/playlistStore'

type Props = {
  song: Song | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 把歌曲添加到歌单。 */
export function AddToPlaylistModal({ song, open, onOpenChange }: Props) {
  const playlists = usePlaylistStore((s) => s.playlists)
  const addSongToPlaylist = usePlaylistStore((s) => s.addSongToPlaylist)
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNewName('')
      setError(null)
    }
  }, [open])

  if (!song) return null

  const onAdd = async (playlistId: string) => {
    setBusyId(playlistId)
    setError(null)
    try {
      await addSongToPlaylist(playlistId, song.id)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败')
    } finally {
      setBusyId(null)
    }
  }

  const onCreateAndAdd = async () => {
    const n = newName.trim()
    if (!n) return
    setBusyId('new')
    setError(null)
    try {
      const playlist = await createPlaylist(n)
      await addSongToPlaylist(playlist.id, song.id)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-elevated p-5 shadow-2xl">
          <Dialog.Title className="text-base font-medium text-text-primary">
            添加到歌单
          </Dialog.Title>
          <Dialog.Description className="mt-1 truncate text-sm text-text-secondary">
            {song.name} - {song.artist}
          </Dialog.Description>

          <div className="mt-4 flex max-h-64 flex-col gap-1 overflow-y-auto">
            {playlists.length === 0 ? (
              <div className="rounded-xl border border-border-soft bg-surface p-4 text-center text-sm text-text-secondary">
                还没有歌单，在下方创建一个吧
              </div>
            ) : (
              playlists.map((p) => {
                const inList = p.songs.includes(song.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={inList || busyId !== null}
                    onClick={() => void onAdd(p.id)}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-text-primary transition hover:bg-surface-hover disabled:opacity-40"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-text-secondary">
                      {inList ? '已在歌单' : busyId === p.id ? '添加中...' : `${p.songs.length} 首`}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              className="flex-1 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none ring-emerald-400/50 placeholder:text-text-muted focus:ring-2"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新建歌单并加入..."
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onCreateAndAdd()
              }}
            />
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => void onCreateAndAdd()}
              disabled={!newName.trim() || busyId !== null}
            >
              创建
            </button>
          </div>

          {error ? <div className="mt-2 text-sm text-red-300">{error}</div> : null}

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
  )
}
