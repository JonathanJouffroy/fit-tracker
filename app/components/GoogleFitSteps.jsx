'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

function calculerKcalPas(pas, poidsKg) {
  if (!pas || !poidsKg) return 0
  return Math.round(poidsKg * 0.0005 * pas)
}

export default function GoogleFitSteps({ poidsCorps, onKcalCalculees, objectifPasExterne }) {
  const [statut, setStatut] = useState('loading')
  const [pas, setPas] = useState(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [historique, setHistorique] = useState([])
  const [objectifPas, setObjectifPas] = useState(objectifPasExterne || 8000)
  const supabase = createClient()

  // Mettre à jour objectifPas si la prop externe change (ex: modifié dans le profil)
  useEffect(() => {
    if (objectifPasExterne) setObjectifPas(objectifPasExterne)
  }, [objectifPasExterne])

  useEffect(() => {
    chargerObjectif()
    chargerPas()
    chargerHistorique()
    function onVisible() {
      if (document.visibilityState === 'visible') {
        chargerObjectif() // Recharger l'objectif si modifié dans le profil
        chargerPas()
      }
    }
    function onFocus() {
      chargerObjectif()
      chargerPas()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [poidsCorps])

  async function chargerObjectif() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profil').select('objectif_pas').eq('user_id', user.id).single()
      if (data?.objectif_pas) setObjectifPas(data.objectif_pas)
    } catch {}
  }

  async function chargerHistorique() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('pas_quotidiens')
        .select('date, pas').eq('user_id', user.id)
        .order('date', { ascending: false }).limit(7)
      if (data?.length) setHistorique(data)
    } catch {}
  }

  async function sauvegarderPasJour(totalPas) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !totalPas) return
      const d = new Date()
      const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      await supabase.from('pas_quotidiens').upsert(
        { user_id: user.id, date, pas: totalPas, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' }
      )
      chargerHistorique()
    } catch {}
  }

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
      if (data.pas) {
        sauvegarderPasJour(data.pas)
        if (onKcalCalculees && poidsCorps) {
          onKcalCalculees(calculerKcalPas(data.pas, poidsCorps))
        }
      }
    } catch { setStatut('error') }
  }

  async function deconnecter() {
    if (!confirm('Déconnecter Google Fit ?')) return
    await fetch('/api/fitness/steps', { method: 'DELETE' })
    setStatut('disconnected'); setPas(null)
  }

  function connecter() { window.location.href = '/api/auth/google-fit' }

  const pourcentage = pas !== null ? Math.min(100, Math.round((pas / objectifPas) * 100)) : 0
  const objectifAtteint = pas !== null && pas >= objectifPas
  const couleur = objectifAtteint ? '#22c55e' : pourcentage > 60 ? 'var(--orange)' : '#3B82F6'
  const kcalPas = calculerKcalPas(pas, poidsCorps)

  if (statut === 'loading') return (
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

  if (statut === 'disconnected') return (
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

  if (statut === 'error') return (
    <div className="card mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👟</span>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Erreur Google Fit</p>
        </div>
        <button onClick={chargerPas} className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>Réessayer</button>
      </div>
    </div>
  )

  // Préparer 7 jours pour le graphique
  const jours7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const entry = historique.find(h => h.date === date)
    const isToday = i === 6
    return {
      date,
      pas: isToday ? (pas || 0) : (entry?.pas || 0),
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2),
      isToday,
    }
  })
  const maxPas = Math.max(...jours7.map(j => j.pas), objectifPas, 1)

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
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>/ {objectifPas.toLocaleString('fr-FR')}</p>
        </div>
      </div>

      <div className="w-full h-2 rounded-full overflow-hidden mb-1" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pourcentage}%`, background: couleur }} />
      </div>

      <div className="flex justify-between items-center mb-3">
        <p className="text-xs" style={{ color: couleur }}>
          {objectifAtteint
            ? `Objectif atteint ! (+${(pas - objectifPas).toLocaleString('fr-FR')} pas)`
            : `${(objectifPas - pas).toLocaleString('fr-FR')} pas restants`}
        </p>
        <div className="flex gap-2">
          <button onClick={chargerPas} className="text-xs" style={{ color: 'var(--text-faint)' }}>↻</button>
          <button onClick={deconnecter} className="text-xs" style={{ color: 'var(--text-faint)' }}>Déconnecter</button>
        </div>
      </div>

      {/* Historique 7 jours */}
      {jours7.some(j => j.pas > 0) && (
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-faint)' }}>7 derniers jours</p>
          <div className="flex items-end gap-1" style={{ height: '50px' }}>
            {jours7.map(j => {
              const h = j.pas > 0 ? Math.max(4, (j.pas / maxPas) * 50) : 2
              const atteint = j.pas >= objectifPas
              return (
                <div key={j.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm"
                    style={{
                      height: `${h}px`,
                      background: j.pas === 0 ? 'var(--surface-2)'
                        : atteint ? '#22c55e'
                        : j.isToday ? couleur
                        : '#3B82F640',
                    }} />
                  <span style={{
                    fontSize: '8px',
                    color: j.isToday ? 'var(--orange)' : 'var(--text-faint)',
                    fontWeight: j.isToday ? 'bold' : 'normal',
                  }}>{j.label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 border-t border-dashed" style={{ borderColor: '#22c55e40' }} />
            <span style={{ fontSize: '8px', color: '#22c55e80' }}>objectif {objectifPas.toLocaleString('fr-FR')}</span>
            <div className="flex-1 border-t border-dashed" style={{ borderColor: '#22c55e40' }} />
          </div>
        </div>
      )}
    </div>
  )
}
