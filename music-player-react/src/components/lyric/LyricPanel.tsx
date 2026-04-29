import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { getLyricBySongId, saveLyric, findActiveLyricIndex } from '../../services/lyricService'
import { LrcParser } from '../../utils/lrcParser'
import type { LyricLine, Lyric } from '../../types/lyric'
import { LyricLine as LyricLineView } from './LyricLine'
import { LyricEditor } from './LyricEditor'
import { formatTime } from '../../utils/formatTime'

export function LyricPanel() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const seek = usePlayerStore((s) => s.seek)

  const [lines, setLines] = useState<LyricLine[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [editorOpen, setEditorOpen] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const linesWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!currentSong) {
        setLines([])
        setActiveIndex(-1)
        return
      }

      const lyric = await getLyricBySongId(currentSong.id)
      if (cancelled) return

      const nextLines = lyric?.lines ?? []
      setLines(nextLines)
      setActiveIndex(findActiveLyricIndex(nextLines, currentTime))
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id])

  useEffect(() => {
    const idx = findActiveLyricIndex(lines, currentTime)
    setActiveIndex((prev) => (prev === idx ? prev : idx))
  }, [currentTime, lines])

  useEffect(() => {
    if (activeIndex < 0) return
    const root = linesWrapRef.current
    if (!root) return
    const el = root.querySelector<HTMLElement>(`[data-line-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeIndex])

  const lrcTextPreview = useMemo(() => {
    if (!lines.length) return ''
    return LrcParser.serialize(lines)
  }, [lines])

  const openUpload = () => {
    if (!currentSong) return
    fileInputRef.current?.click()
  }

  const handleLrcFile = async (file: File) => {
    if (!currentSong) return
    setIsSaving(true)
    try {
      const text = await file.text()
      const parsed = LrcParser.parse(text) as LyricLine[]
      const lyric: Lyric = {
        id: `lyric_${currentSong.id}`,
        songId: currentSong.id,
        lines: parsed,
        source: 'external',
      }
      await saveLyric(lyric)
      setLines(parsed)
      setActiveIndex(findActiveLyricIndex(parsed, currentTime))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEditor = async (nextText: string) => {
    if (!currentSong) return
    setIsSaving(true)
    try {
      const parsed = LrcParser.parse(nextText) as LyricLine[]
      const lyric: Lyric = {
        id: `lyric_${currentSong.id}`,
        songId: currentSong.id,
        lines: parsed,
        source: 'manual',
      }
      await saveLyric(lyric)
      setLines(parsed)
      setActiveIndex(findActiveLyricIndex(parsed, currentTime))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="mt-4 border-t border-white/10">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">歌词</div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".lrc"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleLrcFile(f)
              e.currentTarget.value = ''
            }}
          />

          <button
            className="btn btn-secondary min-h-8 px-3 py-1 text-sm"
            type="button"
            onClick={openUpload}
            disabled={!currentSong || isSaving}
          >
            上传 LRC
          </button>
          <button
            className="btn btn-ghost min-h-8 px-3 py-1 text-sm"
            type="button"
            disabled={!currentSong || isSaving}
            onClick={() => setEditorOpen(true)}
          >
            编辑
          </button>
        </div>
      </div>

      <LyricEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialText={lrcTextPreview}
        onSave={async (text) => {
          await handleSaveEditor(text)
        }}
      />

      {lines.length === 0 ? (
        <div className="px-4 pb-6 text-sm text-slate-400">暂无歌词（请选择歌曲后上传 .lrc）</div>
      ) : (
        <div ref={linesWrapRef} className="max-h-72 overflow-auto px-4 pb-6">
          <div className="mb-2 text-xs text-slate-400">
            当前时间：{formatTime(currentTime)}｜高亮行：{activeIndex + 1}
          </div>
          <div className="space-y-1">
            {lines.map((line, idx) => (
              <LyricLineView
                key={idx}
                line={line}
                index={idx}
                isActive={idx === activeIndex}
                onSeek={(t) => seek(t)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
