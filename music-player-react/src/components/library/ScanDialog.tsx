import { useState } from 'react'
import { toast } from 'sonner'
import { Modal, Input, Button } from '../ui'
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
      if (r.added > 0) toast.success(`扫描完成：新增 ${r.added} 首`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '扫描失败')
    } finally {
      setScanning(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="扫描文件夹导入"
      description="输入运行后端服务的机器上的音乐目录（递归扫描，自动跳过已导入内容）。"
      width="w-[520px]"
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          关闭
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          value={dirPath}
          onChange={(e) => setDirPath(e.target.value)}
          placeholder="例如：D:\\Music 或 ~/Music"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') void onScan()
          }}
        />

        <div className="flex justify-end gap-2">
          <Button
            variant="primary"
            onClick={() => void onScan()}
            disabled={scanning || !dirPath.trim()}
          >
            {scanning ? '扫描中...' : '开始扫描'}
          </Button>
        </div>

        {error ? <div className="text-sm text-red-400">{error}</div> : null}

        {result ? (
          <div className="rounded-xl border border-border-soft bg-surface p-3 text-sm text-text-secondary">
            <div>
              共扫描 <span className="font-medium text-text-primary">{result.scanned}</span> 个音频文件
            </div>
            <div className="mt-1 text-emerald-500">新增 {result.added} 首</div>
            {result.skipped > 0 ? <div className="mt-1">跳过重复 {result.skipped} 首</div> : null}
            {result.failed > 0 ? (
              <div className="mt-1 text-red-400">
                失败 {result.failed} 首：{result.errors.map((e) => `${e.fileName}（${e.error}）`).join('；')}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
