import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal, Input, FieldLabel, Button } from '../ui'
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

  useEffect(() => {
    if (song && open) {
      setName(song.name)
      setArtist(song.artist)
      setAlbum(song.album)
      setGenre(song.genre ?? '')
      setYear(song.year != null ? String(song.year) : '')
    }
  }, [song, open])

  const onSave = async () => {
    if (!song) return
    setSaving(true)
    try {
      await updateSong(song.id, {
        name: name.trim() || song.name,
        artist: artist.trim() || song.artist,
        album: album.trim(),
        genre: genre.trim(),
        year: year.trim() ? Number.parseInt(year, 10) : undefined,
      })
      toast.success('歌曲信息已更新')
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="编辑歌曲信息"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={() => void onSave()} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        <label>
          <FieldLabel>标题</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label>
          <FieldLabel>歌手</FieldLabel>
          <Input value={artist} onChange={(e) => setArtist(e.target.value)} />
        </label>
        <label>
          <FieldLabel>专辑</FieldLabel>
          <Input value={album} onChange={(e) => setAlbum(e.target.value)} />
        </label>
        <label>
          <FieldLabel>流派</FieldLabel>
          <Input value={genre} onChange={(e) => setGenre(e.target.value)} />
        </label>
        <label>
          <FieldLabel>年份</FieldLabel>
          <Input
            value={year}
            inputMode="numeric"
            onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, ''))}
          />
        </label>
      </div>
    </Modal>
  )
}
