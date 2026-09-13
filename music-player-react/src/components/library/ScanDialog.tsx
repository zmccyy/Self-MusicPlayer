import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { scanLibrary, type ScanResult } from '../../api/client'
import { usePlaylistStore } from '../../stores/playlistStore'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 扫描服务器本机目录并导入音频文件（自动去重）。 */
export function ScanDialog({ open, onOpenChange }: Props) {
  const loadAll = usePlaylistStore((s) => s.loadAll)
  const [dirPath, setDirPath] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)

  const onScan = async () => {
    const p = dirPath.trim()
    if (!p) return
    setScanning(true)
    setError(null)
    setResult(null)
    try {
      const r = await scanLibrary(p)
      setResult(r)
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : '扫描失败')
    } finally {
      setScanning(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-elevated p-5 shadow-2xl">
          <Dialog.Title className="text-base font-medium text-text-primary">扫描文件夹导入</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-text-secondary">
            输入运行后端服务的机器上的音乐目录（递归扫描，自动跳过已导入内容）。
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-3">
            <input
              className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none ring-emerald-400/50 focus:ring-2"
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              placeholder="例如：D:\\Music 或 ~/Music"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onScan()
              }}
            />

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void onScan()}
                disabled={scanning || !dirPath.trim()}
              >
                {scanning ? '扫描中...' : '开始扫描'}
              </button>
            </div>

            {error ? <div className="text-sm text-red-300">{error}</div> : null}

            {result ? (
              <div className="rounded-xl border border-border-soft bg-surface p-3 text-sm text-text-secondary">
                <div>
                  共扫描 <span className="font-medium text-text-primary">{result.scanned}</span> 个音频文件
                </div>
                <div className="mt-1 text-emerald-500">新增 {result.added} 首</div>
                {result.skipped > 0 ? <div className="mt-1">跳过重复 {result.skipped} 首</div> : null}
                {result.failed > 0 ? (
                  <div className="mt-1 text-red-300">
                    失败 {result.failed} 首：{result.errors.map((e) => `${e.fileName}（${e.error}）`).join('；')}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex justify-end">
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
