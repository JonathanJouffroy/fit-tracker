'use client'
import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Vérifier les mises à jour toutes les heures
      setInterval(() => registration.update(), 60 * 60 * 1000)

      // Quand une nouvelle version est prête, l'activer immédiatement
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage('skipWaiting')
            window.location.reload()
          }
        })
      })
    }).catch(() => {})
  }, [])

  return null
}
