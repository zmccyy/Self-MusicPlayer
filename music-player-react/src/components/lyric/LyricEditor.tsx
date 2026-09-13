import { useEffect, useState } from 'react'
import { Modal, Textarea, Button } from '../ui'

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
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="编辑歌词（LRC）"
      width="w-[560px]"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </>
      }
    >
      <Textarea
        className="h-72 resize-none font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 text-xs text-text-secondary">每行格式：`[分:秒] 歌词内容`</div>
    </Modal>
  )
}
