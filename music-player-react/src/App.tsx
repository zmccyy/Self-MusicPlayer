import { useEffect, useMemo, useRef, useState } from 'react'
import { PlayerBar } from './components/player/PlayerBar'
import { PlaylistSidebar } from './components/playlist/PlaylistSidebar'
import { SongList } from './components/playlist/SongList'
import { PlaylistModal } from './components/playlist/PlaylistModal'
import { LyricPanel } from './components/lyric/LyricPanel'
import { useFileUpload } from './hooks/useFileUpload'
import { useMediaSession } from './hooks/useMediaSession'
import { useServiceWorker } from './hooks/useServiceWorker'
import { useTheme } from './hooks/useTheme'
import { usePlayerStore } from './stores/playerStore'
import { usePlaylistStore } from './stores/playlistStore'
import { SearchBox } from './components/search/SearchBox'

export default function App() {
  useServiceWorker()
  useMediaSession()

  const { theme, toggleTheme } = useTheme()

  const loadAllPlaylists = usePlaylistStore((s) => s.loadAll)
  const songs = usePlaylistStore((s) => s.songs)
  const playlists = usePlaylistStore((s) => s.playlists)
  const currentPlaylistId = usePlaylistStore((s) => s.currentPlaylistId)

  const setPlayerPlaylist = usePlayerStore((s) => s.setPlaylist)

  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { uploadFiles, isUploading, error } = useFileUpload()

  useEffect(() => {
    void loadAllPlaylists()
  }, [loadAllPlaylists])

  const visibleSongs = useMemo(() => {
    if (currentPlaylistId === 'all') return songs
    const playlist = playlists.find((p) => p.id === currentPlaylistId)
    if (!playlist) return []
    const songIdSet = new Set(playlist.songs)
    return songs.filter((s) => songIdSet.has(s.id))
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
      className="relative min-h-screen overflow-x-hidden bg-slate-950 pb-28 text-slate-100"
      onDragOver={(e) => {
        e.preventDefault()
      }}
      onDrop={(e) => {
        e.preventDefault()
        const files = e.dataTransfer.files
        if (files && files.length) void uploadFiles(files)
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-emerald-500/18 blur-3xl" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-cyan-500/14 blur-3xl" />
      </div>

      <header className="relative mx-auto mt-8 w-full max-w-6xl px-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Music Hub</p>
              <h1 className="mt-2 truncate text-3xl font-semibold text-white">
                {currentPlaylistName}
              </h1>
              <p className="mt-2 text-sm text-slate-300/80">
                沉浸式本地与在线音乐管理，极简布局，保留专业播放器能力。
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? '上传中...' : '上传音乐'}
              </button>
              <SearchBox />

              <button
                className="btn btn-secondary"
                type="button"
                onClick={toggleTheme}
                disabled={isUploading}
                aria-label="切换主题"
              >
                {theme === 'dark' ? '深色' : '浅色'}
              </button>
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
        </div>
      </header>

      <div className="relative mx-auto mt-6 flex w-full max-w-6xl gap-4 px-4">
        <PlaylistSidebar onCreateClick={() => setIsPlaylistModalOpen(true)} />
        <main className="flex-1 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
          <SongList />
          <LyricPanel />
        </main>
      </div>

      <PlaylistModal open={isPlaylistModalOpen} onOpenChange={setIsPlaylistModalOpen} />

      {error ? (
        <div className="mx-auto mt-4 max-w-6xl rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <PlayerBar />
    </div>
  )
}
