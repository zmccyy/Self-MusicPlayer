import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal, Input, Button } from '../ui'
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
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (open) setNewName('')
  }, [open])

  if (!song) return null

  const onAdd = async (playlistId: string, playlistName: string) => {
    setBusyId(playlistId)
    try {
      await addSongToPlaylist(playlistId, song.id)
      toast.success(`已添加到「${playlistName}」`)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '添加失败')
    } finally {
      setBusyId(null)
    }
  }

  const onCreateAndAdd = async () => {
    const n = newName.trim()
    if (!n) return
    setBusyId('new')
    try {
      const playlist = await createPlaylist(n)
      await addSongToPlaylist(playlist.id, song.id)
      toast.success(`已创建歌单「${n}」并添加歌曲`)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="添加到歌单"
      description={`${song.name} - ${song.artist}`}
    >
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
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
                onClick={() => void onAdd(p.id, p.name)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-text-primary transition hover:bg-surface-hover disabled:opacity-40"
              >
                <span className="truncate">{p.name}</span>
                <span className="ml-2 shrink-0 text-xs text-text-muted">
                  {inList ? '已在歌单' : busyId === p.id ? '添加中...' : `${p.songs.length} 首`}
                </span>
              </button>
            )
          })
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          className="flex-1"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新建歌单并加入..."
          maxLength={50}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void onCreateAndAdd()
          }}
        />
        <Button
          variant="secondary"
          onClick={() => void onCreateAndAdd()}
          disabled={!newName.trim() || busyId !== null}
        >
          创建
        </Button>
      </div>
    </Modal>
  )
}
