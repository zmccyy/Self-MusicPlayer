import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal, Input, FieldLabel, Button } from '../ui'
import { usePlaylistStore } from '../../stores/playlistStore'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlaylistModal({ open, onOpenChange }: Props) {
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setCategory('')
  }, [open])

  const onSubmit = async () => {
    const n = name.trim()
    if (!n) return
    await createPlaylist(n, category.trim())
    toast.success(`歌单「${n}」已创建`)
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="创建歌单"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={onSubmit}>
            保存
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        <label>
          <FieldLabel>歌单名称</FieldLabel>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            autoFocus
          />
        </label>

        <label>
          <FieldLabel>分类（可选）</FieldLabel>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={30}
          />
        </label>
      </div>
    </Modal>
  )
}
