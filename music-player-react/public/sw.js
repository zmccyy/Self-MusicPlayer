/**
 * Service Worker - 音乐播放器 PWA（Vite 适配版）
 *
 * 缓存策略：
 * - 静态资源：采用 cache-first，必要时更新缓存
 * - 音频文件：按需缓存（仅对 URL 可访问的音频）
 */
const CACHE_VERSION = 'v1'
const STATIC_CACHE = `music-player-static-${CACHE_VERSION}`
const AUDIO_CACHE = `music-player-audio-${CACHE_VERSION}`

const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      await Promise.all(
        STATIC_ASSETS.map(async (url) => {
          try {
            await cache.add(url)
          } catch {
            // 某些资源可能在本地尚未生成/存在，忽略即可
          }
        }),
      )
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('music-player-') && key !== STATIC_CACHE && key !== AUDIO_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

function isStaticAssetPath(path) {
  if (path === '/' || path.endsWith('.html')) return true
  if (path === '/manifest.json' || path.endsWith('favicon.svg')) return true
  if (path.startsWith('/assets/')) return true
  if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.svg')) return true
  return false
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== location.origin) return

  const path = url.pathname
  const isAudio = request.destination === 'audio' || /\.(mp3|wav|ogg|flac|m4a)$/i.test(path)

  // 静态资源：cache-first
  if (isStaticAssetPath(path)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok)
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()))
          return response
        })
      }),
    )
    return
  }

  // 音频：按需缓存
  if (isAudio) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
        })
      }),
    )
    return
  }

  // 其它：直接网络（失败则回退缓存）
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      throw new Error('Network error and no cached response')
    }),
  )
})
