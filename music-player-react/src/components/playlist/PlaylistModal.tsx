import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
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
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl">
          <Dialog.Title className="text-base font-medium text-slate-100">创建歌单</Dialog.Title>

          <div className="mt-4 flex flex-col gap-3">
            <label className="text-sm">
              <div className="mb-1 text-slate-400">歌单名称</div>
              <input
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-400/50 focus:ring-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-slate-400">分类（可选）</div>
              <input
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-400/50 focus:ring-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={30}
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button className="btn btn-ghost" type="button">
                  取消
                </button>
              </Dialog.Close>
              <button className="btn btn-primary" onClick={onSubmit} type="button">
                保存
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
