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

  const [showBilan, setShowBilan] = useState(false)
  const [bilanEtape, setBilanEtape] = useState('choix') // 'choix' | 'douleur' | 'note'
  const [bilanZone, setBilanZone] = useState('')
  const [bilanIntensite, setBilanIntensite] = useState('')
  const [bilanNote, setBilanNote] = useState('')

  const ZONES = [
    { value: 'epaule', label: '💪 Épaule' },
    { value: 'coude', label: '🦾 Coude' },
    { value: 'poignet', label: '🤲 Poignet' },
    { value: 'dos_haut', label: '🔝 Dos (haut)' },
    { value: 'dos_bas', label: '⬇️ Dos (bas)' },
    { value: 'hanche', label: '🦵 Hanche' },
    { value: 'genou', label: '🦿 Genou' },
    { value: 'cheville', label: '🦶 Cheville' },
    { value: 'autre', label: '📍 Autre' },
  ]

  const INTENSITES = [
    { value: 'legere', label: '😐 Légère', color: '#f59e0b' },
    { value: 'moderee', label: '😬 Modérée', color: '#f97316' },
    { value: 'forte', label: '😣 Forte', color: '#ef4444' },
  ]
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
    clearInterval(intervalRef.current)
    setStatut('done')
    const stored = localStorage.getItem(cleStorage(jourId))
    if (stored) {
      try {
        const data = JSON.parse(stored)
        data.statut = 'done'
        localStorage.setItem(cleStorage(jourId), JSON.stringify(data))
      } catch {}
    }
    // Sauvegarder la durée
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
    // Ouvrir le bilan
    setBilanEtape('choix')
    setShowBilan(true)
  }

  async function validerBilan(avecDouleur) {
    const { data: { user } } = await supabase.auth.getUser()

    // Sauvegarder la douleur si renseignée
    if (avecDouleur && bilanZone && bilanIntensite && user) {
      await supabase.from('douleurs').insert([{
        user_id: user.id,
        seance_duree_id: seanceDureeId,
        date_seance: new Date().toISOString().split('T')[0],
        zone: bilanZone,
        intensite: bilanIntensite,
        note: bilanNote.trim() || null,
      }])
    }

    // Sauvegarder la note de séance si renseignée
    if (bilanNote.trim() && seanceDureeId && !avecDouleur) {
      await supabase.from('seances_duree').update({ note: bilanNote.trim() }).eq('id', seanceDureeId)
      setNoteSauvegardee(true)
    }

    setShowBilan(false)
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

  // ---- Bilan de fin de séance ----
  if (showBilan) {
    return (
      <div className="card mb-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏁</span>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>Séance terminée !</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formaterDuree(secondes)}</p>
          </div>
        </div>

        {bilanEtape === 'choix' && (
          <>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Comment tu te sens ?</p>
            <div className="flex gap-2">
              <button onClick={() => validerBilan(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: '#dcfce7', color: '#16a34a' }}>
                ✅ Tout va bien
              </button>
              <button onClick={() => setBilanEtape('douleur')}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: '#fee2e2', color: '#ef4444' }}>
                🤕 J'ai une gêne
              </button>
            </div>
          </>
        )}

        {bilanEtape === 'douleur' && (
          <>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Quelle zone ?</p>
            <div className="flex flex-wrap gap-2">
              {ZONES.map(z => (
                <button key={z.value} onClick={() => setBilanZone(z.value)}
                  className="px-3 py-1.5 rounded-full text-sm"
                  style={{
                    background: bilanZone === z.value ? 'var(--orange)' : 'var(--surface-2)',
                    color: bilanZone === z.value ? 'white' : 'var(--text-muted)',
                  }}>
                  {z.label}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Intensité</p>
            <div className="flex gap-2">
              {INTENSITES.map(i => (
                <button key={i.value} onClick={() => setBilanIntensite(i.value)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: bilanIntensite === i.value ? i.color : 'var(--surface-2)',
                    color: bilanIntensite === i.value ? 'white' : 'var(--text-muted)',
                  }}>
                  {i.label}
                </button>
              ))}
            </div>

            <div>
              <label className="label">Note (optionnel)</label>
              <textarea value={bilanNote} onChange={e => setBilanNote(e.target.value)}
                placeholder="Ex: douleur surtout en descente, genou gauche..."
                rows={2} className="input resize-none text-sm w-full" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setBilanEtape('choix')}
                className="flex-1 py-2 rounded-xl text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                ← Retour
              </button>
              <button onClick={() => validerBilan(true)}
                disabled={!bilanZone || !bilanIntensite}
                className="flex-[2] btn-primary text-sm py-2 disabled:opacity-40">
                Enregistrer
              </button>
            </div>
          </>
        )}
      </div>
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
