import { useMemo } from 'react'
import { Share2 } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { toast } from 'sonner'
import { Tooltip } from '../ui'

export function ShareButton() {
  const currentSong = usePlayerStore((s) => s.currentSong)

  const shareText = useMemo(() => {
    if (!currentSong) return ''
    return `${currentSong.artist} - ${currentSong.name}`
  }, [currentSong])

  const onShare = async () => {
    if (!currentSong) return

    const url = window.location.href
    const text = shareText

    try {
      if ('share' in navigator && typeof navigator.share === 'function') {
        await navigator.share({
          title: currentSong.name,
          text,
          url,
        })
        return
      }
    } catch {
      // 若用户取消分享，下面走 fallback（复制链接）
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      toast.success('分享信息已复制到剪贴板')
    } catch {
      // 最低级兜底：让用户手动复制
      window.prompt('复制分享信息：', `${text}\n${url}`)
    }
  }

  return (
    <Tooltip content="分享当前歌曲">
      <button
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-hover hover:text-text-primary disabled:opacity-40"
        type="button"
        onClick={() => void onShare()}
        disabled={!currentSong}
        aria-label="分享当前歌曲"
        title="分享"
      >
        <Share2 className="h-4 w-4" />
      </button>
    </Tooltip>
  )
}
