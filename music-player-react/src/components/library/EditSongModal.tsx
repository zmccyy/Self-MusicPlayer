import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type { Song } from '../../types/song'
import { usePlaylistStore } from '../../stores/playlistStore'

type Props = {
  song: Song | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 编辑歌曲信息（标题/歌手/专辑/流派/年份），保存到后端。 */
export function EditSongModal({ song, open, onOpenChange }: Props) {
  const updateSong = usePlaylistStore((s) => s.updateSong)
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [genre, setGenre] = useState('')
  const [year, setYear] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (song && open) {
      setName(song.name)
      setArtist(song.artist)
      setAlbum(song.album)
      setGenre(song.genre ?? '')
      setYear(song.year != null ? String(song.year) : '')
      setError(null)
    }
  }, [song, open])

  const onSave = async () => {
    if (!song) return
    setSaving(true)
    setError(null)
    try {
      await updateSong(song.id, {
        name: name.trim() || song.name,
        artist: artist.trim() || song.artist,
        album: album.trim(),
        genre: genre.trim(),
        year: year.trim() ? Number.parseInt(year, 10) : undefined,
      })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-elevated p-5 shadow-2xl">
          <Dialog.Title className="text-base font-medium text-text-primary">编辑歌曲信息</Dialog.Title>

          <div className="mt-4 flex flex-col gap-3">
            {(
              [
                ['标题', name, setName],
                ['歌手', artist, setArtist],
                ['专辑', album, setAlbum],
                ['流派', genre, setGenre],
              ] as const
            ).map(([label, value, setter]) => (
              <label key={label} className="text-sm">
                <div className="mb-1 text-text-secondary">{label}</div>
                <input
                  className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none ring-emerald-400/50 focus:ring-2"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                />
              </label>
            ))}

            <label className="text-sm">
              <div className="mb-1 text-text-secondary">年份</div>
              <input
                className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none ring-emerald-400/50 focus:ring-2"
                value={year}
                inputMode="numeric"
                onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, ''))}
              />
            </label>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="btn btn-secondary" type="button">
                取消
              </button>
            </Dialog.Close>
            <button className="btn btn-primary" type="button" onClick={() => void onSave()} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
