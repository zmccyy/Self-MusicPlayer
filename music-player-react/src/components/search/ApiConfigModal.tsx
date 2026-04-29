import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function readEndpoint(key: string): string {
  return localStorage.getItem(key) || ''
}

export function ApiConfigModal({ open, onOpenChange }: Props) {
  const [neteaseEndpoint, setNeteaseEndpoint] = useState(() =>
    readEndpoint('netease.searchEndpoint'),
  )
  const [qqEndpoint, setQqEndpoint] = useState(() => readEndpoint('qq.searchEndpoint'))
  const [saving, setSaving] = useState(false)

  const onSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem('netease.searchEndpoint', neteaseEndpoint.trim())
      localStorage.setItem('qq.searchEndpoint', qqEndpoint.trim())
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[540px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl">
          <Dialog.Title className="text-base font-medium text-slate-100">
            第三方 API 配置
          </Dialog.Title>

          <div className="mt-4 flex flex-col gap-3 text-sm">
            <label>
              <div className="mb-1 text-slate-400">网易云搜索端点</div>
              <input
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-400/50 placeholder:text-slate-500 focus:ring-2"
                placeholder="例如：https://example.com/search"
                value={neteaseEndpoint}
                onChange={(e) => setNeteaseEndpoint(e.target.value)}
              />
              <div className="mt-1 text-xs text-slate-500">
                将追加查询参数：keyword、limit（GET 模式）。返回应为数组或对象（包含 songs 数组）。
              </div>
            </label>

            <label>
              <div className="mb-1 text-slate-400">QQ 音乐搜索端点</div>
              <input
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-400/50 placeholder:text-slate-500 focus:ring-2"
                placeholder="例如：https://example.com/search"
                value={qqEndpoint}
                onChange={(e) => setQqEndpoint(e.target.value)}
              />
              <div className="mt-1 text-xs text-slate-500">
                将追加查询参数：keyword、limit（GET 模式）。返回应为数组或对象（包含 songs 数组）。
              </div>
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="btn btn-ghost" type="button" disabled={saving}>
                取消
              </button>
            </Dialog.Close>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void onSave()}
              disabled={saving}
            >
              保存
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
