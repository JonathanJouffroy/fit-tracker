'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SkeletonStats, SkeletonGraphique, SkeletonListe } from '@/app/components/Skeleton'
import { ErreurChargement } from '@/app/components/Erreur'
import CoachExercice from '@/app/components/CoachExercice'

// Génère 4 valeurs d'axe Y régulièrement espacées entre min et max
function ticksY(min, max, nb = 4) {
  const step = Math.ceil((max - min) / (nb - 1) / 5) * 5 || 5
  return Array.from({ length: nb }, (_, i) => Math.round(min + step * i))
}

function Graphique({ titre, sousTitre, sessions, getValue, couleur, unite }) {
  if (sessions.length === 0) return null

  const valeurs = sessions.map(getValue).filter((v) => v !== null && v > 0)
  if (valeurs.length === 0) return null

  const maxVal = Math.max(...valeurs)
  const minVal = Math.min(...valeurs)
  // Plancher légèrement sous le min pour que la plus petite barre soit visible
  const plancher = Math.max(0, minVal - (maxVal - minVal) * 0.2)
  const ticks = ticksY(Math.round(plancher), Math.round(maxVal))
  const graphMax = ticks[ticks.length - 1]
  const graphMin = ticks[0]
  const range = graphMax - graphMin || 1

  const GRAPH_H = 120 // hauteur de la zone des barres en px

  function hauteur(v) {
    return Math.max(4, Math.round(((v - graphMin) / range) * GRAPH_H))
  }

  function labelDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="card mb-4">
      <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>{titre}</p>
      {sousTitre && <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{sousTitre}</p>}

      <div className="flex gap-2">
        {/* Axe Y */}
        <div className="flex flex-col justify-between items-end pb-5" style={{ height: `${GRAPH_H + 4}px`, minWidth: '36px' }}>
          {[...ticks].reverse().map((t) => (
            <span key={t} className="text-[10px] tabular-nums leading-none" style={{ color: 'var(--text-faint)' }}>
              {t}{unite}
            </span>
          ))}
        </div>

        {/* Barres */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-end gap-1 flex-1" style={{ height: `${GRAPH_H}px` }}>
            {sessions.map((s) => {
              const v = getValue(s)
              if (!v || v <= 0) return (
                <div key={s.date} className="flex-1 flex flex-col items-center justify-end" style={{ height: `${GRAPH_H}px` }}>
                  <div className="w-full rounded-t" style={{ height: '2px', background: 'var(--surface-2)' }} />
                </div>
              )
              const isPR = v === maxVal
              return (
                <div key={s.date} className="flex-1 flex flex-col items-center justify-end" style={{ height: `${GRAPH_H}px` }}>
                  <div className="w-full rounded-t transition-all"
                    style={{ height: `${hauteur(v)}px`, background: isPR ? couleur : couleur + '88' }} />
                </div>
              )
            })}
          </div>
          {/* Axe X */}
          <div className="flex gap-1 mt-1">
            {sessions.map((s) => (
              <div key={s.date} className="flex-1 text-center">
                <span className="text-[9px] leading-tight" style={{ color: 'var(--text-faint)' }}>
                  {labelDate(s.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-center mt-2" style={{ color: 'var(--text-faint)' }}>
        Barre plus foncée = record
      </p>
    </div>
  )
}

export default function ProgressionExercice() {
  const { id: exerciceId } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [nomExercice, setNomExercice] = useState('')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [userId, setUserId] = useState(null)
  const [note, setNote] = useState('')
  const [editNote, setEditNote] = useState(false)
  const [noteTemp, setNoteTemp] = useState('')

  useEffect(() => { charger() }, [exerciceId])

  async function charger() {
    setLoading(true)
    setErreur(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Récupérer le nom (depuis URL ou depuis la DB)
      const nomParam = searchParams.get('nom')
      const nom = nomParam
        ? decodeURIComponent(nomParam)
        : (await supabase.from('exercices').select('nom').eq('id', exerciceId).single()).data?.nom || ''
      setNomExercice(nom)

      // Récupérer tous les IDs ayant ce nom + la note de l'exercice représentatif
      const { data: exosAvecCeNom } = await supabase
        .from('exercices')
        .select('id, note')
        .eq('user_id', user.id)
        .eq('nom', nom)
      const ids = exosAvecCeNom?.map(e => e.id) || [Number(exerciceId)]
      const noteExo = exosAvecCeNom?.[0]?.note || ''
      setNote(noteExo)
      setNoteTemp(noteExo)

      const { data: logs } = await supabase
        .from('seances_log')
        .select('date_seance, exercice_id, exercice_nom, poids_kg, repetitions_faites, serie_numero')
        .eq('user_id', user.id)
        .in('exercice_id', ids)
        .order('date_seance', { ascending: true })

    const parSession = {}
    logs?.forEach((log) => {
      const key = `${log.date_seance}__${log.exercice_id}`
      if (!parSession[key]) parSession[key] = []
      parSession[key].push(log)
    })

    const sessionsCalc = Object.entries(parSession)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, lignes]) => {
        const date = key.split('__')[0]
        const avecPoids = lignes.filter((l) => l.poids_kg && l.poids_kg > 0)
        const poids_max = avecPoids.length > 0 ? Math.max(...avecPoids.map((l) => l.poids_kg)) : null
        const setMax = avecPoids.find((l) => l.poids_kg === poids_max)
        const reps_max = setMax?.repetitions_faites || null
        const volume = avecPoids.reduce((acc, l) => acc + l.poids_kg * (l.repetitions_faites || 0), 0)
        // Séries détaillées pour le coach
        const series = lignes.map(l => ({ poids: l.poids_kg || 0, reps: l.repetitions_faites || 0 }))
        return { date, poids_max, reps_max, volume: Math.round(volume), nb_series: lignes.length, series }
      })

    setSessions(sessionsCalc)
    } catch (e) {
      setErreur('Impossible de charger la progression. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }

  async function sauvegarderNote() {
    if (!userId) return
    // Mettre à jour la note sur tous les exercices avec ce nom
    const { data: exos } = await supabase.from('exercices')
      .select('id').eq('user_id', userId).eq('nom', nomExercice)
    if (exos?.length > 0) {
      await supabase.from('exercices').update({ note: noteTemp.trim() || null })
        .in('id', exos.map(e => e.id))
    }
    setNote(noteTemp.trim())
    setEditNote(false)
  }

  if (loading) return (
    <div className="pt-6">
      <div className="h-5 w-20 rounded-lg mb-3 animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <div className="h-8 w-48 rounded-lg mb-6 animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <SkeletonStats nb={4} />
      <SkeletonGraphique />
      <SkeletonGraphique />
      <SkeletonListe nb={5} lignes={2} />
    </div>
  )

  if (erreur) return (
    <div className="pt-6">
      <button onClick={() => router.back()} className="text-sm mb-4" style={{ color: 'var(--orange)' }}>← Retour</button>
      <ErreurChargement message={erreur} onReessayer={charger} />
    </div>
  )

  const sessionsAvecPoids = sessions.filter((s) => s.poids_max !== null)
  const pr = sessionsAvecPoids.length > 0 ? Math.max(...sessionsAvecPoids.map((s) => s.poids_max)) : null
  const derniere = sessionsAvecPoids[sessionsAvecPoids.length - 1]
  const avantDerniere = sessionsAvecPoids[sessionsAvecPoids.length - 2]
  const progression = derniere && avantDerniere ? Math.round((derniere.poids_max - avantDerniere.poids_max) * 100) / 100 : null

  // 1RM estimé via formule d'Epley : poids × (1 + reps/30)
  // On utilise le meilleur set connu (poids max avec le nombre de reps loguées)
  const rm1Estime = (() => {
    if (!sessions.length) return null
    let meilleur = 0
    sessions.forEach((s) => {
      if (!s.poids_max || !s.reps_max) return
      const rm = s.poids_max * (1 + s.reps_max / 30)
      if (rm > meilleur) meilleur = rm
    })
    return meilleur > 0 ? Math.round(meilleur) : null
  })()

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm mb-3" style={{ color: 'var(--orange)' }}>← Retour</button>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>{nomExercice}</h1>

      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-2xl mb-2">📊</p>
          <p style={{ color: 'var(--text-muted)' }}>Aucune séance enregistrée.</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-faint)' }}>
            Complète une séance en indiquant le poids utilisé.
          </p>
        </div>
      ) : (
        <>
          {/* Coach */}
          <CoachExercice
            sessions={sessions}
            nomExercice={nomExercice}
            userId={userId}
            supabase={supabase}
          />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="card text-center py-3">
              <p className="text-xl font-bold" style={{ color: 'var(--orange)' }}>{pr ? `${pr}kg` : '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Record (PR)</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xl font-bold" style={{ color: '#8B5CF6' }}>{rm1Estime ? `${rm1Estime}kg` : '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>1RM estimé</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <div className="card text-center py-3">
              <p className="text-xl font-bold" style={{
                color: progression === null ? 'var(--text-faint)' : progression >= 0 ? '#22c55e' : '#ef4444'
              }}>
                {progression === null ? '—' : `${progression >= 0 ? '+' : ''}${progression}kg`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Évolution</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>{sessions.length}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Séances</p>
            </div>
          </div>
          {rm1Estime && (
            <p className="text-xs text-center mb-4" style={{ color: 'var(--text-faint)' }}>
              1RM estimé via formule d'Epley · poids × (1 + reps/30)
            </p>
          )}

          {/* Graphique poids max avec axe Y */}
          <Graphique
            titre="Poids max par séance"
            sessions={sessionsAvecPoids}
            getValue={(s) => s.poids_max}
            couleur="var(--orange)"
            unite="kg"
          />

          {/* Graphique volume avec axe Y */}
          <Graphique
            titre="Volume total par séance"
            sousTitre="séries × répétitions × poids"
            sessions={sessions.filter((s) => s.volume > 0)}
            getValue={(s) => s.volume}
            couleur="#3B82F6"
            unite="kg"
          />

          {/* Note personnelle sur l'exercice */}
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>📝 Note personnelle</p>
              {!editNote && (
                <button onClick={() => { setEditNote(true); setNoteTemp(note) }}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  {note ? 'Modifier' : '+ Ajouter'}
                </button>
              )}
            </div>
            {editNote ? (
              <div className="flex flex-col gap-2">
                <textarea value={noteTemp} onChange={(e) => setNoteTemp(e.target.value)}
                  placeholder="Ex: Genou gauche fragile, prise large, gainage important..."
                  rows={3} className="input resize-none text-sm" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => setEditNote(false)}
                    className="flex-1 py-2 rounded-xl text-sm"
                    style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                    Annuler
                  </button>
                  <button onClick={sauvegarderNote} className="flex-1 btn-primary text-sm py-2">
                    Sauvegarder
                  </button>
                </div>
              </div>
            ) : note ? (
              <p className="text-sm italic" style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{note}</p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                Aucune note. Utilise ce champ pour noter les sensations, précautions ou tes indications techniques.
              </p>
            )}
          </div>

          {/* Historique */}
          <div className="card">
            <p className="font-semibold text-sm mb-3" style={{ color: 'var(--text)' }}>Historique</p>
            <div className="flex flex-col gap-2">
              {[...sessions].reverse().map((s) => (
                <div key={s.date} className="flex items-center justify-between pb-2 border-b last:border-0 last:pb-0"
                  style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {new Date(s.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {s.nb_series} série{s.nb_series > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    {s.poids_max !== null && (
                      <p className="text-sm font-semibold" style={{ color: 'var(--orange)' }}>{Math.round(s.poids_max * 100) / 100} kg</p>
                    )}
                    {s.volume > 0 && (
                      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>vol. {s.volume} kg</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
