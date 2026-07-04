'use client'
import { useState, useEffect } from 'react'

const OBJECTIF_PAS = 8000
// Formule : poids(kg) × 0.0005 × nombre de pas
// Pour 6000 pas à 80kg → ~240 kcal
function calculerKcalPas(pas, poidsKg) {
  if (!pas || !poidsKg) return 0
  return Math.round(poidsKg * 0.0005 * pas)
}

export default function GoogleFitSteps({ poidsCorps, onKcalCalculees }) {
  const [statut, setStatut] = useState('loading')
  const [pas, setPas] = useState(null)
  const [needsReauth, setNeedsReauth] = useState(false)

  useEffect(() => { chargerPas() }, [])

  async function chargerPas() {
    setStatut('loading')
    try {
      const res = await fetch('/api/fitness/steps')
      if (!res.ok) { setStatut('error'); return }
      const data = await res.json()
      if (!data.connected) {
        setStatut('disconnected')
        if (data.needsReauth) setNeedsReauth(true)
        return
      }
      setPas(data.pas)
      setStatut('connected')
      // Remonter les kcal au parent si callback fourni
      if (onKcalCalculees && data.pas && poidsCorps) {
        onKcalCalculees(calculerKcalPas(data.pas, poidsCorps))
      }
    } catch {
      setStatut('error')
    }
  }

  async function deconnecter() {
    if (!confirm('Déconnecter Google Fit ?')) return
    await fetch('/api/fitness/steps', { method: 'DELETE' })
    setStatut('disconnected')
    setPas(null)
  }

  function connecter() { window.location.href = '/api/auth/google-fit' }

  const pourcentage = pas !== null ? Math.min(100, Math.round((pas / OBJECTIF_PAS) * 100)) : 0
  const objectifAtteint = pas !== null && pas >= OBJECTIF_PAS
  const couleur = objectifAtteint ? '#22c55e' : pourcentage > 60 ? 'var(--orange)' : '#3B82F6'
  const kcalPas = calculerKcalPas(pas, poidsCorps)

  if (statut === 'loading') {
    return (
      <div className="card mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
          <div className="flex-1">
            <div className="h-3 rounded w-24 mb-2 animate-pulse" style={{ background: 'var(--surface-2)' }} />
            <div className="h-2 rounded w-16 animate-pulse" style={{ background: 'var(--surface-2)' }} />
          </div>
        </div>
      </div>
    )
  }

  if (statut === 'disconnected') {
    return (
      <div className="card mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👟</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Pas du jour</p>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {needsReauth ? 'Reconnexion nécessaire' : 'Google Fit non connecté'}
              </p>
            </div>
          </div>
          <button onClick={connecter}
            className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
            style={{ background: '#4285F4', color: 'white' }}>
            <span>G</span> {needsReauth ? 'Reconnecter' : 'Connecter'}
          </button>
        </div>
      </div>
    )
  }

  if (statut === 'error') {
    return (
      <div className="card mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👟</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Erreur de connexion Google Fit</p>
          </div>
          <button onClick={chargerPas} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{objectifAtteint ? '🏅' : '👟'}</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Pas du jour</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              via Google Fit{kcalPas > 0 ? ` · 🔥 ${kcalPas} kcal` : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums" style={{ color: couleur }}>
            {pas?.toLocaleString('fr-FR') ?? '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>/ {OBJECTIF_PAS.toLocaleString('fr-FR')}</p>
        </div>
      </div>

      <div className="w-full h-2 rounded-full overflow-hidden mb-1" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pourcentage}%`, background: couleur }} />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs" style={{ color: couleur }}>
          {objectifAtteint
            ? `Objectif atteint ! (+${(pas - OBJECTIF_PAS).toLocaleString('fr-FR')} pas)`
            : `${(OBJECTIF_PAS - pas).toLocaleString('fr-FR')} pas restants`}
        </p>
        <button onClick={deconnecter} className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Déconnecter
        </button>
      </div>
    </div>
  )
}
