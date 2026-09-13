import { useCallback, useState } from 'react'
import { isSupportedAudioFile } from '../utils/fileUtils'
import { uploadTracks } from '../api/client'
import { usePlaylistStore } from '../stores/playlistStore'

type UploadResult = {
  uploaded: number
  failed: number
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
        const list = Array.from(files).filter(isSupportedAudioFile)
        if (list.length === 0) {
          setError('没有可上传的音频文件（支持 MP3/WAV/OGG/FLAC/AAC/M4A 等格式）')
          return { uploaded: 0, failed: 0 } satisfies UploadResult
        }

        // 元数据解析、封面/歌词提取、存储全部由后端完成
        const { added, errors } = await uploadTracks(list)
        await loadAllPlaylists()

        if (errors.length > 0) setError(errors.join('\n'))
        return { uploaded: added.length, failed: errors.length } satisfies UploadResult
      } catch (e) {
        setError(e instanceof Error ? e.message : '上传失败')
        return { uploaded: 0, failed: 0 } satisfies UploadResult
      } finally {
        setIsUploading(false)
      }
    },
    [loadAllPlaylists],
  )

  return { uploadFiles, isUploading, error }
}
