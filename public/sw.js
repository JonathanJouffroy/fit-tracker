const CACHE_VERSION = self.__SW_VERSION__ || 'dev'
const CACHE_NAME = `fit-tracker-${CACHE_VERSION}`

const STATIC_ASSETS = [
  '/',
  '/repas',
  '/profil',
  '/progression',
  '/programmes',
  '/historique',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('fit-tracker-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les schemes non-http (chrome-extension, data, blob...)
  if (!url.protocol.startsWith('http')) return

  // Ne jamais intercepter les requêtes Supabase ou non-GET
  if (url.hostname.includes('supabase.co')) return
  if (url.hostname.includes('openfoodfacts.org')) return
  if (request.method !== 'GET') return

  // Assets statiques Next.js — cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (!response || !response.ok) return response
          // Cloner AVANT de retourner
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // Pages et autres ressources — network first avec fallback cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || !response.ok || response.type === 'opaque') return response
        // Cloner AVANT de retourner
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // Fallback page offline si rien en cache
          return caches.match('/')
        })
      })
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})
