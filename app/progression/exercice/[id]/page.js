'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ProgressionExercice() {
  const { id: exerciceId } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [nomExercice, setNomExercice] = useState('')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { charger() }, [exerciceId])

  async function charger() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Récupérer tous les IDs (le même exercice peut exister sur plusieurs jours)
    const idsParam = searchParams.get('ids')
    const ids = idsParam ? idsParam.split(',').map(Number) : [Number(exerciceId)]

    // Nom de l'exercice
    const { data: exo } = await supabase.from('exercices').select('nom').eq('id', exerciceId).single()
    setNomExercice(exo?.nom || '')

    // Logs pour TOUS les IDs de cet exercice
    const { data: logs } = await supabase
      .from('seances_log')
      .select('date_seance, exercice_id, poids_kg, repetitions_faites, serie_numero')
      .eq('user_id', user.id)
      .in('exercice_id', ids)
      .order('date_seance', { ascending: true })

    // Grouper par date
    const parDate = {}
    logs?.forEach((log) => {
      const d = log.date_seance
      if (!parDate[d]) parDate[d] = []
      parDate[d].push(log)
    })

    const sessionsCalc = Object.entries(parDate).map(([date, lignes]) => {
      const avecPoids = lignes.filter((l) => l.poids_kg && l.poids_kg > 0)
      const poids_max = avecPoids.length > 0 ? Math.max(...avecPoids.map((l) => l.poids_kg)) : null
      const volume = avecPoids.reduce((acc, l) => acc + l.poids_kg * (l.repetitions_faites || 0), 0)
      return { date, poids_max, volume: Math.round(volume), nb_series: lignes.length }
    })

    setSessions(sessionsCalc)
    setLoading(false)
  }

  if (loading) return <p className="pt-6" style={{ color: 'var(--text-muted)' }}>Chargement...</p>

  const sessionsAvecPoids = sessions.filter((s) => s.poids_max !== null)
  const pr = sessionsAvecPoids.length > 0 ? Math.max(...sessionsAvecPoids.map((s) => s.poids_max)) : null
  const derniere = sessionsAvecPoids[sessionsAvecPoids.length - 1]
  const avantDerniere = sessionsAvecPoids[sessionsAvecPoids.length - 2]
  const progression = derniere && avantDerniere ? derniere.poids_max - avantDerniere.poids_max : null
  const maxPoids = pr || 1
  const maxVolume = Math.max(...sessions.map((s) => s.volume), 1)

  function labelDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

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
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="card text-center py-3">
              <p className="text-xl font-bold" style={{ color: 'var(--orange)' }}>{pr ? `${pr}kg` : '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Record (PR)</p>
            </div>
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

          {/* Graphique poids max */}
          {sessionsAvecPoids.length > 0 && (
            <div className="card mb-4">
              <p className="font-semibold text-sm mb-3" style={{ color: 'var(--text)' }}>Poids max par séance (kg)</p>
              <div className="flex items-end gap-1" style={{ height: '100px' }}>
                {sessionsAvecPoids.map((s) => {
                  const hauteur = Math.round((s.poids_max / maxPoids) * 80)
                  const isPR = s.poids_max === pr
                  return (
                    <div key={s.date} className="flex-1 flex flex-col items-center gap-1">
                      <p className="text-[9px] tabular-nums" style={{ color: 'var(--text-faint)' }}>{s.poids_max}kg</p>
                      <div className="w-full flex items-end" style={{ height: '72px' }}>
                        <div className="w-full rounded-t"
                          style={{ height: `${hauteur}px`, background: isPR ? 'var(--orange)' : '#FFB299' }} />
                      </div>
                      <p className="text-[9px] text-center leading-tight" style={{ color: 'var(--text-faint)' }}>
                        {labelDate(s.date)}
                      </p>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-center mt-2" style={{ color: 'var(--text-faint)' }}>
                Barre orange = ton record
              </p>
            </div>
          )}

          {/* Graphique volume */}
          {sessions.filter((s) => s.volume > 0).length > 0 && (
            <div className="card mb-4">
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>Volume total (kg)</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>séries × répétitions × poids</p>
              <div className="flex items-end gap-1" style={{ height: '80px' }}>
                {sessions.filter((s) => s.volume > 0).map((s) => (
                  <div key={s.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end" style={{ height: '64px' }}>
                      <div className="w-full rounded-t"
                        style={{ height: `${Math.round((s.volume / maxVolume) * 64)}px`, background: '#93C5FD' }} />
                    </div>
                    <p className="text-[9px] text-center leading-tight" style={{ color: 'var(--text-faint)' }}>
                      {labelDate(s.date)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique détaillé */}
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
                      <p className="text-sm font-semibold" style={{ color: 'var(--orange)' }}>{s.poids_max} kg</p>
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
