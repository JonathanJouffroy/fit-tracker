'use client'
import { useState, useEffect } from 'react'

// Composant affiché quand une page ne peut pas charger ses données
export function ErreurChargement({ message, onReessayer }) {
  return (
    <div className="card flex flex-col items-center gap-4 py-10 text-center">
      <span className="text-4xl">⚠️</span>
      <div>
        <p className="font-semibold" style={{ color: 'var(--text)' }}>
          Impossible de charger les données
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {message || 'Vérifie ta connexion internet et réessaie.'}
        </p>
      </div>
      {onReessayer && (
        <button onClick={onReessayer} className="btn-primary px-6 py-2 text-sm">
          Réessayer
        </button>
      )}
    </div>
  )
}

// Bannière discrète en haut de page si connexion lente détectée
export function BanniereConnexion() {
  const [lent, setLent] = useState(false)
  const [horsLigne, setHorsLigne] = useState(false)

  useEffect(() => {
    function onOffline() { setHorsLigne(true) }
    function onOnline() { setHorsLigne(false) }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    setHorsLigne(!navigator.onLine)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  if (!horsLigne && !lent) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 max-w-md mx-auto">
      <div className="mx-4 mt-2 px-4 py-2 rounded-xl text-sm font-medium text-center text-white"
        style={{ background: horsLigne ? '#ef4444' : '#f59e0b' }}>
        {horsLigne
          ? '📵 Pas de connexion — les données ne peuvent pas se synchroniser'
          : '🐢 Connexion lente détectée'}
      </div>
    </div>
  )
}

// Hook utilitaire : wrape un fetch Supabase avec timeout + gestion d'erreur
export function useSupabaseQuery(fetchFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)

  async function executer() {
    setLoading(true)
    setErreur(null)

    // Timeout de 10 secondes
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10000)
    )

    try {
      const resultat = await Promise.race([fetchFn(), timeout])
      setData(resultat)
    } catch (e) {
      if (e.message === 'timeout') {
        setErreur('La requête a pris trop de temps. Supabase est peut-être lent ou indisponible.')
      } else {
        setErreur('Une erreur est survenue. Vérifie ta connexion.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { executer() }, deps)

  return { data, loading, erreur, recharger: executer }
}
