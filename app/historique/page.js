'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'

function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default function Historique() {
  const supabase = createClient()
  const [seances, setSeances] = useState([]) // [{date, exercices: [{nom, series:[{serie, reps, poids}]}]}]
  const [loading, setLoading] = useState(true)
  const [seanceOuverte, setSeanceOuverte] = useState(null)
  const [mois, setMois] = useState(null) // null = tout, ou 'YYYY-MM'

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Charger tous les logs avec le nom de l'exercice
    const { data: logs } = await supabase.from('seances_log')
      .select('date_seance, exercice_id, serie_numero, repetitions_faites, poids_kg, exercices(nom)')
      .eq('user_id', user.id)
      .order('date_seance', { ascending: false })
      .order('exercice_id')
      .order('serie_numero')

    // Grouper par date → exercice → séries
    const parDate = {}
    logs?.forEach((log) => {
      const date = log.date_seance
      if (!parDate[date]) parDate[date] = {}
      const nomExo = log.exercices?.nom || `Exercice #${log.exercice_id}`
      if (!parDate[date][log.exercice_id]) parDate[date][log.exercice_id] = { nom: nomExo, series: [] }
      parDate[date][log.exercice_id].series.push({
        serie: log.serie_numero,
        reps: log.repetitions_faites,
        poids: log.poids_kg,
      })
    })

    const result = Object.entries(parDate).map(([date, exos]) => ({
      date,
      exercices: Object.values(exos),
      nbSeries: Object.values(exos).reduce((a, e) => a + e.series.length, 0),
    }))

    setSeances(result)
    setLoading(false)
  }

  // Mois disponibles pour le filtre
  const moisDisponibles = [...new Set(seances.map((s) => s.date.slice(0, 7)))].sort().reverse()

  const seancesFiltrees = mois
    ? seances.filter((s) => s.date.startsWith(mois))
    : seances

  function labelMois(ym) {
    const [y, m] = ym.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  return (
    <div>
      <Header title="Historique" subtitle="Toutes tes séances passées" />

      {/* Filtre par mois */}
      {moisDisponibles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button onClick={() => setMois(null)}
            className="px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap"
            style={{
              background: mois === null ? 'var(--orange)' : 'var(--surface)',
              color: mois === null ? 'white' : 'var(--text-muted)',
              borderColor: mois === null ? 'var(--orange)' : 'var(--border)',
            }}>
            Tout
          </button>
          {moisDisponibles.map((m) => (
            <button key={m} onClick={() => setMois(m)}
              className="px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap"
              style={{
                background: mois === m ? 'var(--orange)' : 'var(--surface)',
                color: mois === m ? 'white' : 'var(--text-muted)',
                borderColor: mois === m ? 'var(--orange)' : 'var(--border)',
              }}>
              {labelMois(m)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
      ) : seancesFiltrees.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">📋</p>
          <p style={{ color: 'var(--text-muted)' }}>Aucune séance enregistrée.</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-faint)' }}>
            Les séances apparaissent ici après avoir complété des séries.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {seancesFiltrees.map((seance) => {
            const estOuverte = seanceOuverte === seance.date
            return (
              <div key={seance.date} className="card">
                <button
                  onClick={() => setSeanceOuverte(estOuverte ? null : seance.date)}
                  className="w-full text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold capitalize" style={{ color: 'var(--text)' }}>
                        {formatDate(seance.date)}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {seance.exercices.length} exercice{seance.exercices.length > 1 ? 's' : ''}
                        {' · '}{seance.nbSeries} série{seance.nbSeries > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span style={{ color: 'var(--text-faint)' }}>{estOuverte ? '▲' : '▼'}</span>
                  </div>
                </button>

                {estOuverte && (
                  <div className="mt-3 pt-3 flex flex-col gap-4"
                    style={{ borderTop: '1px solid var(--border)' }}>
                    {seance.exercices.map((exo, i) => (
                      <div key={i}>
                        <p className="font-medium text-sm mb-2" style={{ color: 'var(--text)' }}>
                          {exo.nom}
                        </p>
                        <div className="flex flex-col gap-1">
                          {exo.series.map((s, j) => (
                            <div key={j} className="flex items-center justify-between text-sm">
                              <span style={{ color: 'var(--text-muted)' }}>Série {s.serie}</span>
                              <div className="flex gap-3">
                                <span style={{ color: 'var(--text)' }}>{s.reps} reps</span>
                                {s.poids && (
                                  <span className="font-medium" style={{ color: 'var(--orange)' }}>
                                    {s.poids} kg
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
