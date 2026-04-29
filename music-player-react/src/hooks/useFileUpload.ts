import { useCallback, useState } from 'react'
import { extractId3Tags } from '../utils/id3Parser'
import { getAudioDuration, isSupportedAudioFile } from '../utils/fileUtils'
import type { Song } from '../types/song'
import { upsertSong } from '../services/storageService'
import { usePlaylistStore } from '../stores/playlistStore'

type UploadResult = {
  uploaded: Song[]
  skipped: number
}

function stripExt(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '')
}

export function useFileUpload() {
  const loadAllPlaylists = usePlaylistStore((s) => s.loadAll)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      setIsUploading(true)

      try {
        const list = Array.from(files)
        const uploaded: Song[] = []
        let skipped = 0

        for (const file of list) {
          if (!isSupportedAudioFile(file)) {
            skipped += 1
            continue
          }

          const addedAt = Date.now()
          const objectUrl = URL.createObjectURL(file)

          const song: Song = {
            id: `${addedAt}_${Math.random().toString(36).slice(2)}`,
            name: stripExt(file.name),
            artist: '未知艺术家',
            album: '未知专辑',
            duration: 0,
            url: objectUrl,
            cover: null,
            addedAt,
            source: 'local',
          }

          // 1) 尝试读取 ID3（标题/歌手/专辑/封面）
          try {
            const id3 = await extractId3Tags(file)
            if (id3.title) song.name = id3.title
            if (id3.artist) song.artist = id3.artist
            if (id3.album) song.album = id3.album
            if (id3.pictureDataUrl) song.cover = id3.pictureDataUrl
          } catch {
            // 忽略 ID3 失败，仍允许上传
          }

          // 2) 读取时长
          song.duration = await getAudioDuration(song.url)

          // 3) 写入 IndexedDB
          await upsertSong(song)
          uploaded.push(song)
        }

        // 4) 刷新歌单/歌曲列表状态
        await loadAllPlaylists()

        return { uploaded, skipped } satisfies UploadResult
      } catch (e: any) {
        setError(e?.message ? String(e.message) : '上传失败')
        return { uploaded: [], skipped: 0 } satisfies UploadResult
      } finally {
        setIsUploading(false)
      }
    },
    [loadAllPlaylists],
  )

  return { uploadFiles, isUploading, error }
}
