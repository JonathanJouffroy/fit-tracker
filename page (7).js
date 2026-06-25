'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ProgressionExercice() {
  const { id: exerciceId } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [exercice, setExercice] = useState(null)
  const [sessions, setSessions] = useState([]) // [{date, poids_max, volume, nb_series}]
  const [loading, setLoading] = useState(true)

  useEffect(() => { charger() }, [exerciceId])

  async function charger() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: exo } = await supabase.from('exercices').select('*').eq('id', exerciceId).single()
    setExercice(exo)

    // Récupérer tous les logs pour cet exercice, groupés par date côté JS
    const { data: logs } = await supabase.from('seances_log')
      .select('date_seance, poids_kg, repetitions_faites, serie_numero')
      .eq('user_id', user.id)
      .eq('exercice_id', exerciceId)
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

  if (loading) return <p className="text-gray-400 px-4 pt-6">Chargement...</p>

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
      <button onClick={() => router.back()} className="text-orange-600 text-sm mb-3">← Retour</button>
      <h1 className="text-2xl font-bold mb-1">{exercice?.nom}</h1>
      <p className="text-gray-500 text-sm mb-6">{exercice?.series} séries × {exercice?.repetitions} reps</p>

      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-gray-500">Aucune séance enregistrée pour cet exercice.</p>
          <p className="text-gray-400 text-sm mt-1">Complète une séance en indiquant le poids utilisé pour voir ta progression ici.</p>
        </div>
      ) : (
        <>
          {/* Cards statistiques */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-orange-600">{pr ? `${pr}kg` : '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Record (PR)</p>
            </div>
            <div className="card text-center py-3">
              <p className={`text-xl font-bold ${progression === null ? 'text-gray-400' : progression >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {progression === null ? '—' : `${progression >= 0 ? '+' : ''}${progression}kg`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Dernière séance</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-gray-700">{sessions.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Séances</p>
            </div>
          </div>

          {/* Graphique poids max par séance */}
          {sessionsAvecPoids.length > 0 && (
            <div className="card mb-4">
              <p className="font-semibold text-sm mb-3">Poids max par séance (kg)</p>
              <div className="flex items-end gap-1" style={{ height: '100px' }}>
                {sessionsAvecPoids.map((s, i) => {
                  const hauteur = Math.round((s.poids_max / maxPoids) * 88)
                  const isPR = s.poids_max === pr
                  return (
                    <div key={s.date} className="flex-1 flex flex-col items-center gap-1">
                      <p className="text-[9px] text-gray-400 tabular-nums">{s.poids_max}kg</p>
                      <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                        <div
                          className={`w-full rounded-t transition-all ${isPR ? 'bg-orange-500' : 'bg-orange-300'}`}
                          style={{ height: `${hauteur}px` }}
                        />
                      </div>
                      <p className="text-[9px] text-gray-400 text-center leading-tight">{labelDate(s.date)}</p>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">La barre orange foncé = ton record</p>
            </div>
          )}

          {/* Graphique volume par séance */}
          {sessions.filter((s) => s.volume > 0).length > 0 && (
            <div className="card mb-4">
              <p className="font-semibold text-sm mb-1">Volume total par séance (kg)</p>
              <p className="text-xs text-gray-400 mb-3">Volume = séries × répétitions × poids</p>
              <div className="flex items-end gap-1" style={{ height: '88px' }}>
                {sessions.filter((s) => s.volume > 0).map((s) => (
                  <div key={s.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                      <div
                        className="w-full rounded-t bg-blue-300"
                        style={{ height: `${Math.round((s.volume / maxVolume) * 72)}px` }}
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 text-center leading-tight">{labelDate(s.date)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique détaillé */}
          <div className="card">
            <p className="font-semibold text-sm mb-3">Historique détaillé</p>
            <div className="flex flex-col gap-3">
              {[...sessions].reverse().map((s) => (
                <div key={s.date} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{labelDate(s.date)}</p>
                    <p className="text-xs text-gray-400">{s.nb_series} série{s.nb_series > 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    {s.poids_max !== null && (
                      <p className="text-sm font-semibold text-orange-600">{s.poids_max} kg</p>
                    )}
                    {s.volume > 0 && (
                      <p className="text-xs text-gray-400">vol. {s.volume} kg</p>
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
