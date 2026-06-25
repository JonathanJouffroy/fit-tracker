'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function TimerSeance({ actif, jourId }) {
  const supabase = createClient()
  const [secondes, setSecondes] = useState(0)
  const [demarre, setDemarre] = useState(false)
  const [enPause, setEnPause] = useState(false)
  const [termine, setTermine] = useState(false)
  const [sauvegarde, setSauvegarde] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (actif && !demarre && !termine) setDemarre(true)
  }, [actif])

  useEffect(() => {
    if (!demarre || enPause || termine) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => setSecondes((s) => s + 1), 1000)
    return () => clearInterval(intervalRef.current)
  }, [demarre, enPause, termine])

  if (!demarre) return null

  const h = Math.floor(secondes / 3600)
  const m = Math.floor((secondes % 3600) / 60)
  const s = secondes % 60

  const label = h > 0
    ? `${h}h ${m.toString().padStart(2, '0')}min`
    : `${m}min ${s.toString().padStart(2, '0')}s`

  async function sauvegarderDuree(dureeSecondes) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('seances_duree').insert([{
      user_id: user.id,
      jour_id: jourId || null,
      date_seance: new Date().toISOString().split('T')[0],
      duree_secondes: dureeSecondes,
    }])
    setSauvegarde(true)
  }

  async function handleArreter() {
    if (!confirm(`Terminer la séance ? Durée : ${label}`)) return
    setTermine(true)
    clearInterval(intervalRef.current)
    await sauvegarderDuree(secondes)
  }

  return (
    <div className="card flex items-center justify-between py-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">⏱️</span>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {termine ? 'Séance terminée' : enPause ? 'En pause' : 'Durée de la séance'}
          </p>
          <p className="font-bold text-lg tabular-nums" style={{ color: 'var(--text)' }}>{label}</p>
          {termine && sauvegarde && (
            <p className="text-xs text-green-500">Durée enregistrée ✓</p>
          )}
        </div>
      </div>

      {!termine ? (
        <div className="flex items-center gap-2">
          {!enPause && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          {enPause && <div className="w-2 h-2 rounded-full bg-orange-400" />}
          <button onClick={() => setEnPause((p) => !p)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            {enPause ? '▶ Reprendre' : '⏸ Pause'}
          </button>
          <button onClick={handleArreter}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: '#fee2e2', color: '#ef4444' }}>
            ■ Fin
          </button>
        </div>
      ) : (
        <span className="text-green-500 text-sm font-semibold">✓ Fini</span>
      )}
    </div>
  )
}
