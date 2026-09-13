import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Toaster, toast } from 'sonner'
import { FolderSearch, Moon, Sun, Upload } from 'lucide-react'
import { PlayerBar } from './components/player/PlayerBar'
import { PlaylistSidebar } from './components/playlist/PlaylistSidebar'
import { SongList } from './components/playlist/SongList'
import { PlaylistModal } from './components/playlist/PlaylistModal'
import { LyricPanel } from './components/lyric/LyricPanel'
import { ScanDialog } from './components/library/ScanDialog'
import { useFileUpload } from './hooks/useFileUpload'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMediaSession } from './hooks/useMediaSession'
import { useServiceWorker } from './hooks/useServiceWorker'
import { useTheme } from './hooks/useTheme'
import { usePlayerStore } from './stores/playerStore'
import { usePlaylistStore } from './stores/playlistStore'
import { SearchBox } from './components/search/SearchBox'
import { Button } from './components/ui'
import { SongListSkeleton } from './components/ui/Skeleton'

export default function App() {
  useServiceWorker()
  useMediaSession()
  useKeyboardShortcuts()

  const { theme, toggleTheme } = useTheme()

  const loadAllPlaylists = usePlaylistStore((s) => s.loadAll)
  const songs = usePlaylistStore((s) => s.songs)
  const playlists = usePlaylistStore((s) => s.playlists)
  const currentPlaylistId = usePlaylistStore((s) => s.currentPlaylistId)
  const isLoading = usePlaylistStore((s) => s.isLoading)

  const setPlayerPlaylist = usePlayerStore((s) => s.setPlaylist)

  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false)
  const [isScanOpen, setIsScanOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { uploadFiles, isUploading, error } = useFileUpload()

  useEffect(() => {
    void loadAllPlaylists()
  }, [loadAllPlaylists])

  // 上传/接口错误统一走 toast（替代内嵌错误横幅）
  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const visibleSongs = useMemo(() => {
    if (currentPlaylistId === 'all') return songs
    const playlist = playlists.find((p) => p.id === currentPlaylistId)
    if (!playlist) return []
    // 按歌单内保存的顺序展示（不能只用 filter，会丢失歌单排序）
    const byId = new Map(songs.map((s) => [s.id, s]))
    return playlist.songs.flatMap((id) => {
      const song = byId.get(id)
      return song ? [song] : []
    })
  }, [currentPlaylistId, playlists, songs])

  useEffect(() => {
    setPlayerPlaylist(visibleSongs)
  }, [setPlayerPlaylist, visibleSongs])

  const currentPlaylistName = useMemo(() => {
    if (currentPlaylistId === 'all') return '全部音乐'
    const playlist = playlists.find((p) => p.id === currentPlaylistId)
    return playlist?.name || '全部音乐'
  }, [currentPlaylistId, playlists])

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-bg pb-28 text-text-primary"
      onDragOver={(e) => {
        e.preventDefault()
      }}
      onDrop={(e) => {
        e.preventDefault()
        const files = e.dataTransfer.files
        if (files && files.length) void uploadFiles(files)
      }}
    >
      {/* 背景光斑：缓慢漂移的动效背景 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-emerald-500/18 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 24, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 top-16 h-72 w-72 rounded-full bg-cyan-500/14 blur-3xl"
          animate={{ x: [0, -36, 0], y: [0, 30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-32 left-1/3 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -26, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <header className="relative mx-auto mt-8 w-full max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="rounded-3xl border border-border-soft bg-surface p-6 backdrop-blur-xl"
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Music Hub</p>
              <h1 className="mt-2 truncate text-3xl font-semibold text-text-primary">
                {currentPlaylistName}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                沉浸式本地与在线音乐管理，极简布局，保留专业播放器能力。
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? '上传中...' : '上传音乐'}
              </Button>
              <Button variant="secondary" onClick={() => setIsScanOpen(true)}>
                <FolderSearch className="h-4 w-4" />
                扫描导入
              </Button>
              <SearchBox />

              <Button
                variant="secondary"
                size="icon"
                onClick={toggleTheme}
                disabled={isUploading}
                aria-label="切换主题"
                data-theme-toggle
                title={`切换到${theme === 'dark' ? '浅色' : '深色'}`}
              >
                <motion.span
                  key={theme}
                  initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="flex"
                >
                  {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </motion.span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files
                  if (files && files.length) void uploadFiles(files)
                  // 允许重复选择同一批文件
                  e.currentTarget.value = ''
                }}
              />
            </div>
          </div>
        </motion.div>
      </header>

      <div className="relative mx-auto mt-6 flex w-full max-w-6xl gap-4 px-4">
        <PlaylistSidebar onCreateClick={() => setIsPlaylistModalOpen(true)} />
        <main className="flex-1 rounded-3xl border border-border-soft bg-surface backdrop-blur-xl">
          {isLoading && songs.length === 0 ? (
            <SongListSkeleton rows={7} />
          ) : (
            <>
              <SongList />
              <LyricPanel />
            </>
          )}
        </main>
      </div>

      <PlaylistModal open={isPlaylistModalOpen} onOpenChange={setIsPlaylistModalOpen} />
      <ScanDialog open={isScanOpen} onOpenChange={setIsScanOpen} />

      <PlayerBar />

      <Toaster position="top-center" theme={theme} richColors closeButton />
    </div>
  )
}
