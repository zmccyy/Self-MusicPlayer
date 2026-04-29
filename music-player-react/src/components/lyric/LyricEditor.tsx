import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialText: string
  onSave: (nextText: string) => Promise<void>
}

export function LyricEditor({ open, onOpenChange, initialText, onSave }: Props) {
  const [text, setText] = useState(initialText)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setText(initialText)
  }, [open, initialText])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(text)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl">
          <Dialog.Title className="text-base font-medium text-slate-100">
            编辑歌词（LRC）
          </Dialog.Title>

          <div className="mt-3">
            <textarea
              className="h-72 w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] p-3 font-mono text-xs text-slate-100 outline-none ring-emerald-400/50 placeholder:text-slate-500 focus:ring-2"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-2 text-xs text-slate-400">每行格式：`[分:秒] 歌词内容`</div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="btn btn-ghost" type="button">
                取消
              </button>
            </Dialog.Close>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
