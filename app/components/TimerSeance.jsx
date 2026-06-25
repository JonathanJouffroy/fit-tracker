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
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [noteSauvegardee, setNoteSauvegardee] = useState(false)
  const [seanceDureeId, setSeanceDureeId] = useState(null)
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
    if (!user) return null
    const { data } = await supabase.from('seances_duree').insert([{
      user_id: user.id,
      jour_id: jourId || null,
      date_seance: new Date().toISOString().split('T')[0],
      duree_secondes: dureeSecondes,
      note: null,
    }]).select().single()
    setSauvegarde(true)
    return data?.id || null
  }

  async function handleArreter() {
    if (!confirm(`Terminer la séance ? Durée : ${label}`)) return
    setTermine(true)
    clearInterval(intervalRef.current)
    const id = await sauvegarderDuree(secondes)
    setSeanceDureeId(id)
    setShowNote(true) // proposer d'ajouter une note
  }

  async function sauvegarderNote() {
    if (!seanceDureeId || !note.trim()) { setShowNote(false); return }
    await supabase.from('seances_duree').update({ note: note.trim() }).eq('id', seanceDureeId)
    setNoteSauvegardee(true)
    setShowNote(false)
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="card flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱️</span>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {termine ? 'Séance terminée' : enPause ? 'En pause' : 'Durée de la séance'}
            </p>
            <p className="font-bold text-lg tabular-nums" style={{ color: 'var(--text)' }}>{label}</p>
            {termine && sauvegarde && !noteSauvegardee && !showNote && (
              <button onClick={() => setShowNote(true)}
                className="text-xs underline mt-0.5" style={{ color: 'var(--orange)' }}>
                + Ajouter une note
              </button>
            )}
            {noteSauvegardee && (
              <p className="text-xs text-green-500">Note enregistrée ✓</p>
            )}
          </div>
        </div>

        {!termine ? (
          <div className="flex items-center gap-2">
            {!enPause
              ? <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              : <div className="w-2 h-2 rounded-full bg-orange-400" />
            }
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

      {/* Zone de note post-séance */}
      {showNote && (
        <div className="card flex flex-col gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Note de séance</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Genou douloureux, PR Squat, bien dormi..."
            rows={3}
            className="input resize-none text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setShowNote(false)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
              Ignorer
            </button>
            <button onClick={sauvegarderNote}
              className="flex-1 btn-primary text-sm py-2">
              Sauvegarder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
