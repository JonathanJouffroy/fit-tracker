// ⚠️ Change ce numéro à chaque déploiement important pour forcer la mise à jour
const CACHE_VERSION = 'v2'
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

// Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activation : nettoie les anciens caches
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

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ne jamais intercepter Supabase (toujours réseau direct)
  if (url.hostname.includes('supabase.co')) return

  // Ne pas intercepter les requêtes POST/PUT/DELETE (mutations)
  if (request.method !== 'GET') return

  // Assets Next.js : Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
          return response
        })
      )
    )
    return
  }

  // Pages et autres assets : Network First, fallback cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// Message pour forcer la mise à jour depuis l'app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})
