'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

function cleStorage(jourId) {
  const date = new Date().toISOString().split('T')[0]
  return `timer-seance-${jourId}-${date}`
}

export default function TimerSeance({ jourId }) {
  const supabase = createClient()
  const intervalRef = useRef(null)

  // États principaux
  const [statut, setStatut] = useState('idle') // 'idle' | 'running' | 'paused' | 'done'
  const [secondes, setSecondes] = useState(0)
  const [showModal, setShowModal] = useState(false) // séance existante détectée
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [seanceDureeId, setSeanceDureeId] = useState(null)
  const [noteSauvegardee, setNoteSauvegardee] = useState(false)

  // Au montage : vérifier si une séance est déjà en cours aujourd'hui
  useEffect(() => {
    const stored = localStorage.getItem(cleStorage(jourId))
    if (!stored) return
    try {
      const { startTs, statut: s } = JSON.parse(stored)
      if (s === 'done') return // séance terminée, on ignore

      // Si la séance a commencé il y a plus de 6h → l'ignorer (app fermée longtemps)
      const heuresEcoulees = (Date.now() - startTs) / (1000 * 60 * 60)
      if (heuresEcoulees > 6) {
        localStorage.removeItem(cleStorage(jourId))
        return
      }

      if (s === 'running' || s === 'paused') {
        setShowModal(true) // proposer reprendre ou nouvelle
      }
    } catch {}
  }, [jourId])

  // Tick du chrono — basé sur l'heure de début réelle, pas des secondes accumulées
  useEffect(() => {
    if (statut !== 'running') {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      const stored = localStorage.getItem(cleStorage(jourId))
      if (!stored) return
      try {
        const { startTs, pausedDuree = 0 } = JSON.parse(stored)
        const elapsed = Math.floor((Date.now() - startTs) / 1000) - pausedDuree
        setSecondes(Math.max(0, elapsed))
      } catch {}
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [statut, jourId])

  function demarrer() {
    const data = {
      startTs: Date.now(),
      pausedDuree: 0,
      pauseStart: null,
      statut: 'running',
    }
    localStorage.setItem(cleStorage(jourId), JSON.stringify(data))
    setStatut('running')
    setSecondes(0)
    setShowModal(false)
  }

  function reprendre() {
    const stored = localStorage.getItem(cleStorage(jourId))
    if (!stored) { demarrer(); return }
    try {
      const data = JSON.parse(stored)
      // Si c'était en pause, ajouter le temps de pause écoulé
      if (data.statut === 'paused' && data.pauseStart) {
        data.pausedDuree = (data.pausedDuree || 0) + Math.floor((Date.now() - data.pauseStart) / 1000)
        data.pauseStart = null
      }
      data.statut = 'running'
      localStorage.setItem(cleStorage(jourId), JSON.stringify(data))
      // Recalculer les secondes depuis le début
      const elapsed = Math.floor((Date.now() - data.startTs) / 1000) - data.pausedDuree
      setSecondes(Math.max(0, elapsed))
      setStatut('running')
      setShowModal(false)
    } catch { demarrer() }
  }

  function basculerPause() {
    const stored = localStorage.getItem(cleStorage(jourId))
    if (!stored) return
    try {
      const data = JSON.parse(stored)
      if (statut === 'running') {
        data.pauseStart = Date.now()
        data.statut = 'paused'
        setStatut('paused')
      } else {
        data.pausedDuree = (data.pausedDuree || 0) + Math.floor((Date.now() - (data.pauseStart || Date.now())) / 1000)
        data.pauseStart = null
        data.statut = 'running'
        setStatut('running')
      }
      localStorage.setItem(cleStorage(jourId), JSON.stringify(data))
    } catch {}
  }

  async function terminer() {
    const dureeAffichee = formaterDuree(secondes)
    if (!confirm(`Terminer la séance ? Durée : ${dureeAffichee}`)) return

    clearInterval(intervalRef.current)
    setStatut('done')

    // Marquer comme terminé dans localStorage
    const stored = localStorage.getItem(cleStorage(jourId))
    if (stored) {
      try {
        const data = JSON.parse(stored)
        data.statut = 'done'
        localStorage.setItem(cleStorage(jourId), JSON.stringify(data))
      } catch {}
    }

    // Sauvegarder dans Supabase
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('seances_duree').insert([{
        user_id: user.id,
        jour_id: jourId || null,
        date_seance: new Date().toISOString().split('T')[0],
        duree_secondes: secondes,
        note: null,
      }]).select().single()
      setSeanceDureeId(data?.id || null)
    }
    setShowNote(true)
  }

  async function sauvegarderNote() {
    if (!seanceDureeId || !note.trim()) { setShowNote(false); return }
    await supabase.from('seances_duree').update({ note: note.trim() }).eq('id', seanceDureeId)
    setNoteSauvegardee(true)
    setShowNote(false)
  }

  function formaterDuree(s) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min`
    return `${m}min ${sec.toString().padStart(2, '0')}s`
  }

  // ---- Modal : séance existante détectée ----
  if (showModal) {
    return (
      <div className="card mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⏱️</span>
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
            Une séance était en cours aujourd'hui
          </p>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Tu veux reprendre le chrono là où tu en étais, ou démarrer une nouvelle séance ?
        </p>
        <div className="flex gap-2">
          <button onClick={demarrer}
            className="flex-1 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
            Nouvelle séance
          </button>
          <button onClick={reprendre} className="flex-[2] btn-primary text-sm py-2">
            ▶ Reprendre
          </button>
        </div>
      </div>
    )
  }

  // ---- Idle : bouton démarrer ----
  if (statut === 'idle') {
    return (
      <button onClick={demarrer}
        className="w-full py-3 rounded-xl text-sm font-semibold mb-4 flex items-center justify-center gap-2"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <span>⏱️</span> Démarrer la séance
      </button>
    )
  }

  // ---- Terminé ----
  if (statut === 'done') {
    return (
      <div className="flex flex-col gap-2 mb-4">
        <div className="card flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Séance terminée</p>
              <p className="font-bold text-lg tabular-nums" style={{ color: 'var(--text)' }}>{formaterDuree(secondes)}</p>
              {noteSauvegardee && <p className="text-xs text-green-500">Note enregistrée ✓</p>}
              {!noteSauvegardee && !showNote && seanceDureeId && (
                <button onClick={() => setShowNote(true)}
                  className="text-xs underline mt-0.5" style={{ color: 'var(--orange)' }}>
                  + Ajouter une note
                </button>
              )}
            </div>
          </div>
          <span className="text-green-500 text-sm font-semibold">✓ Fini</span>
        </div>
        {showNote && (
          <div className="card flex flex-col gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Note de séance</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Genou douloureux, PR Squat, bien dormi..."
              rows={3} className="input resize-none text-sm" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setShowNote(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                Ignorer
              </button>
              <button onClick={sauvegarderNote} className="flex-1 btn-primary text-sm py-2">
                Sauvegarder
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- En cours / en pause ----
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="card flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱️</span>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {statut === 'paused' ? 'En pause' : 'Séance en cours'}
            </p>
            <p className="font-bold text-lg tabular-nums" style={{ color: 'var(--text)' }}>
              {formaterDuree(secondes)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statut === 'running'
            ? <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            : <div className="w-2 h-2 rounded-full bg-orange-400" />
          }
          <button onClick={basculerPause}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            {statut === 'running' ? '⏸ Pause' : '▶ Reprendre'}
          </button>
          <button onClick={terminer}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: '#fee2e2', color: '#ef4444' }}>
            ■ Fin
          </button>
        </div>
      </div>
    </div>
  )
}
