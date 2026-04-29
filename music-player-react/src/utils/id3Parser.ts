export type Id3Parsed = {
  title?: string
  artist?: string
  album?: string
  pictureDataUrl?: string
}

function toStringOrUndefined(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return undefined
}

function mimeFromFormat(format: string | undefined) {
  if (!format) return undefined
  if (format.includes('/')) return format
  const f = format.toLowerCase()
  // jsmediatags 常见格式：JPEG/PNG
  if (f.includes('jpg') || f.includes('jpeg')) return 'image/jpeg'
  if (f.includes('png')) return 'image/png'
  if (f.includes('gif')) return 'image/gif'
  return `image/${f}`
}

function bytesToBase64(data: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

export async function extractId3Tags(file: File): Promise<Id3Parsed> {
  const jsmediatags = (window as any)?.jsmediatags
  if (!jsmediatags?.read) return {}

  return new Promise<Id3Parsed>((resolve) => {
    jsmediatags.read(file, {
      onSuccess: (tag: any) => {
        const t = tag?.tags || {}

        const title = toStringOrUndefined(t.title)
        const artist = toStringOrUndefined(t.artist)
        const album = toStringOrUndefined(t.album)

        const picture = t.picture
        let pictureDataUrl: string | undefined
        if (picture?.data && picture?.format) {
          const mime = mimeFromFormat(picture.format)
          const data =
            picture.data instanceof Uint8Array ? picture.data : new Uint8Array(picture.data)
          const base64 = bytesToBase64(data)
          if (mime) pictureDataUrl = `data:${mime};base64,${base64}`
        }

        resolve({
          title,
          artist,
          album,
          pictureDataUrl,
        })
      },
      onError: () => resolve({}),
    })
  })
}
