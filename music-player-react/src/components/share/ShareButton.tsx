import { useMemo, useState } from 'react'
import { Share2 } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'

export function ShareButton() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const [statusText, setStatusText] = useState<string | null>(null)

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
      setStatusText('已复制分享信息')
      window.setTimeout(() => setStatusText(null), 1500)
    } catch {
      // 最低级兜底：让用户手动复制
      window.prompt('复制分享信息：', `${text}\n${url}`)
    }
  }

  return (
    <div className="relative">
      <button
        className="btn btn-ghost"
        type="button"
        onClick={() => void onShare()}
        disabled={!currentSong || !isPlaying}
        aria-label="分享当前歌曲"
        title="分享"
      >
        <Share2 size={18} />
        <span className="ml-2 hidden sm:inline">分享</span>
      </button>
      {statusText ? (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded border bg-background/80 px-2 py-1 text-xs text-foreground">
          {statusText}
        </div>
      ) : null}
    </div>
  )
}
