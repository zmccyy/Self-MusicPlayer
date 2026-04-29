import { useEffect } from 'react'

export function useServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let isMounted = true

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (!isMounted) return

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (!isMounted) return
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 简化：只在检测到更新且已有 controller 时提示
              // 若你不希望弹窗，可告诉我我改成静默更新
              const shouldRefresh = true
              if (shouldRefresh) newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })
      })
      .catch((err) => {
        console.warn('SW registration failed:', err)
      })

    return () => {
      isMounted = false
    }
  }, [])
}
