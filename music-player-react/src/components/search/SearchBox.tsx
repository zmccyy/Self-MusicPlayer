import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { searchSongs, type SearchSongsParams } from '../../services/apiGateway'
import type { ApiSearchProvider } from '../../api/types'
import type { Song } from '../../types/song'
import { upsertSong } from '../../services/storageService'
import { usePlaylistStore } from '../../stores/playlistStore'
import { usePlayerStore } from '../../stores/playerStore'
import { SearchResults } from './SearchResults'
import { ApiConfigModal } from './ApiConfigModal'

const PROVIDER_LABEL: Record<ApiSearchProvider | 'both', string> = {
  both: '网易云 + QQ',
  netease: '网易云',
  qq: 'QQ 音乐',
}

type ProviderValue = ApiSearchProvider | 'both'

function getProviderSearchParams(
  keyword: string,
  provider: ProviderValue,
  limit: number,
): SearchSongsParams {
  return {
    keyword,
    limit,
    providers: provider === 'both' ? 'both' : provider,
  }
}

export function SearchBox() {
  const [open, setOpen] = useState(false)
  const [apiConfigOpen, setApiConfigOpen] = useState(false)

  const [keyword, setKeyword] = useState('')
  const [provider, setProvider] = useState<ProviderValue>('both')
  const [limit] = useState(12)

  const [results, setResults] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const loadAllPlaylists = usePlaylistStore((s) => s.loadAll)
  const currentPlaylistId = usePlaylistStore((s) => s.currentPlaylistId)
  const addSongToPlaylist = usePlaylistStore((s) => s.addSongToPlaylist)

  const waitForSongInPlayer = async (songId: string, timeoutMs: number) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const st = usePlayerStore.getState()
      if (st.playlist.some((s) => s.id === songId)) return st
      await new Promise((r) => window.setTimeout(r, 50))
    }
    return null
  }

  const onSelectSong = async (song: Song) => {
    setErrorText(null)
    setIsLoading(true)
    try {
      // 1) 写入本地库（便于在现有歌单/列表体系中播放/切歌）
      await upsertSong(song)

      // 2) 如当前歌单不是“全部”，也把歌曲追加进该歌单
      if (currentPlaylistId !== 'all') {
        await addSongToPlaylist(currentPlaylistId, song.id)
      }

      // 3) 重新加载本地库，使 App/PlayerBar 自动切到新歌
      await loadAllPlaylists()

      // 4) 等播放器侧拿到新的 playlist 后再触发播放
      const st = await waitForSongInPlayer(song.id, 3000)
      if (!st) {
        // 极端兜底：强行替换播放器播放列表并开始播放
        usePlayerStore.getState().setPlaylist([song])
        usePlayerStore.getState().play(0)
        return
      }

      const idx = st.playlist.findIndex((s) => s.id === song.id)
      if (idx >= 0) st.play(idx)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '播放失败'
      setErrorText(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const onSearch = async () => {
    const kw = keyword.trim()
    if (!kw) return

    setIsLoading(true)
    setErrorText(null)

    try {
      const params = getProviderSearchParams(kw, provider, limit)
      const songs = await searchSongs(params)
      setResults(songs)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '第三方搜索失败'
      setErrorText(msg)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const providerOptions = useMemo(() => {
    const order: ProviderValue[] = ['both', 'netease', 'qq']
    return order.map((p) => ({ value: p, label: PROVIDER_LABEL[p] }))
  }, [])

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button className="btn btn-ghost" type="button" aria-label="在线搜索" title="在线搜索">
            在线搜索
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[760px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl">
            <Dialog.Title className="text-base font-medium text-slate-100">在线搜索</Dialog.Title>

            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm">
                <div className="mb-1 text-slate-400">搜索关键词</div>
                <input
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-400/50 placeholder:text-slate-500 focus:ring-2"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="例如：告白气球"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm flex items-center gap-2">
                  <span className="text-slate-400">来源</span>
                  <select
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-2 py-1 text-sm text-slate-200"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as ProviderValue)}
                  >
                    {providerOptions.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setApiConfigOpen(true)}
                >
                  接口配置
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => void onSearch()}
                  disabled={isLoading || !keyword.trim()}
                >
                  {isLoading ? '搜索中...' : '搜索'}
                </button>
              </div>

              {errorText ? <div className="text-sm text-red-300">{errorText}</div> : null}

              <SearchResults
                results={results}
                isLoading={isLoading}
                errorText={null}
                onSelectSong={(s) => void onSelectSong(s)}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Dialog.Close asChild>
                <button className="btn btn-secondary" type="button">
                  关闭
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ApiConfigModal open={apiConfigOpen} onOpenChange={setApiConfigOpen} />
    </>
  )
}
