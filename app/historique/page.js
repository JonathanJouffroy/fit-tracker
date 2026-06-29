'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'
import { SkeletonListe } from '@/app/components/Skeleton'
import { ErreurChargement } from '@/app/components/Erreur'
import CartePartage from '@/app/components/CartePartage'
import { calculerCaloriesCardio } from '@/lib/calculs'

function formatDuree(secondes) {
  if (!secondes) return null
  const h = Math.floor(secondes / 3600)
  const m = Math.floor((secondes % 3600) / 60)
  const s = secondes % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min`
  if (m > 0) return `${m}min ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default function Historique() {
  const supabase = createClient()
  const router = useRouter()
  const [seances, setSeances] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [seanceOuverte, setSeanceOuverte] = useState(null)
  const [mois, setMois] = useState(null)
  const [seanceAPartager, setSeanceAPartager] = useState(null)

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    setErreur(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Exercices pour fallback nom + type
      const { data: tousExos } = await supabase
        .from('exercices').select('id, nom, type_exercice, activite_cardio').eq('user_id', user.id)
      const exoParId = {}
      tousExos?.forEach((e) => { exoParId[e.id] = e })

      // Poids du corps le plus récent (pour calcul kcal cardio)
      const { data: mesures } = await supabase.from('mesures').select('poids_kg')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
      const poidsCorps = mesures?.[0]?.poids_kg || null

      // Logs de séances avec métriques cardio
      const { data: logs } = await supabase.from('seances_log')
        .select('date_seance, exercice_id, exercice_nom, serie_numero, repetitions_faites, poids_kg, duree_minutes, distance_m, denivele_m, nb_sauts, note_cardio')
        .eq('user_id', user.id)
        .order('date_seance', { ascending: false })
        .order('exercice_id')
        .order('serie_numero')

      // Durées + notes
      const { data: durees } = await supabase.from('seances_duree')
        .select('date_seance, duree_secondes, note')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const dureeParDate = {}
      durees?.forEach((d) => {
        if (!dureeParDate[d.date_seance]) {
          dureeParDate[d.date_seance] = { duree: d.duree_secondes, note: d.note }
        }
      })

      // Grouper les logs par date → exercice_id → séries
      const parDate = {}
      logs?.forEach((log) => {
        const date = log.date_seance
        if (!parDate[date]) parDate[date] = {}
        const exoInfo = exoParId[log.exercice_id]
        const nomExo = log.exercice_nom || exoInfo?.nom || `Exercice #${log.exercice_id}`
        const isCardio = exoInfo?.type_exercice === 'cardio'

        if (!parDate[date][log.exercice_id]) {
          parDate[date][log.exercice_id] = {
            nom: nomExo,
            type_exercice: exoInfo?.type_exercice || 'muscu',
            activite_cardio: exoInfo?.activite_cardio || null,
            series: [],
            // Cardio métriques (premier log)
            duree_minutes: null, distance_m: null, denivele_m: null, nb_sauts: null, note_cardio: null,
          }
        }

        if (isCardio && log.duree_minutes) {
          parDate[date][log.exercice_id].duree_minutes = log.duree_minutes
          parDate[date][log.exercice_id].distance_m = log.distance_m
          parDate[date][log.exercice_id].denivele_m = log.denivele_m
          parDate[date][log.exercice_id].nb_sauts = log.nb_sauts
          parDate[date][log.exercice_id].note_cardio = log.note_cardio
        } else {
          parDate[date][log.exercice_id].series.push({
            serie: log.serie_numero,
            reps: log.repetitions_faites,
            poids: log.poids_kg,
          })
        }
      })

      const result = Object.entries(parDate).map(([date, exosMap]) => {
        const exercices = Object.values(exosMap)
        const nbSeries = exercices.reduce((a, e) => a + e.series.length, 0)

        // Calcul kcal total (muscu + cardio)
        let kcalTotal = 0
        exercices.forEach((exo) => {
          if (exo.type_exercice === 'cardio' && exo.duree_minutes && poidsCorps) {
            kcalTotal += calculerCaloriesCardio({
              activiteId: exo.activite_cardio,
              dureeMinutes: exo.duree_minutes,
              poidsCorps,
            })
          }
        })

        // Poids max par exercice muscu
        exercices.forEach((exo) => {
          if (exo.series.length > 0) {
            const avecPoids = exo.series.filter(s => s.poids)
            exo.poids_max = avecPoids.length > 0 ? Math.max(...avecPoids.map(s => s.poids)) : null
          }
        })

        return {
          date,
          exercices,
          nbSeries,
          kcalTotal,
          duree: dureeParDate[date]?.duree || null,
          note: dureeParDate[date]?.note || null,
        }
      })

      setSeances(result)
    } catch (e) {
      setErreur('Impossible de charger l\'historique. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }

  const moisDisponibles = [...new Set(seances.map((s) => s.date.slice(0, 7)))].sort().reverse()
  const seancesFiltrees = mois ? seances.filter((s) => s.date.startsWith(mois)) : seances

  function labelMois(ym) {
    const [y, m] = ym.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  return (
    <div>
      {/* Carte de partage en overlay */}
      {seanceAPartager && (
        <CartePartage
          seance={seanceAPartager}
          onFermer={() => setSeanceAPartager(null)}
        />
      )}

      <button onClick={() => router.back()} className="text-sm mb-3" style={{ color: 'var(--orange)' }}>← Retour</button>
      <Header title="Historique" subtitle="Toutes tes séances passées" />

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
        <SkeletonListe nb={5} lignes={2} />
      ) : erreur ? (
        <ErreurChargement message={erreur} onReessayer={charger} />
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
            const exosMuscu = seance.exercices.filter(e => e.type_exercice !== 'cardio')
            const exosCardio = seance.exercices.filter(e => e.type_exercice === 'cardio')

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
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {seance.exercices.length} exercice{seance.exercices.length > 1 ? 's' : ''}
                          {seance.nbSeries > 0 && ` · ${seance.nbSeries} série${seance.nbSeries > 1 ? 's' : ''}`}
                        </p>
                        {seance.duree && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>
                            ⏱️ {formatDuree(seance.duree)}
                          </span>
                        )}
                        {seance.kcalTotal > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                            🔥 {seance.kcalTotal} kcal
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--text-faint)' }}>{estOuverte ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </button>

                {estOuverte && (
                  <div className="mt-3 pt-3 flex flex-col gap-4"
                    style={{ borderTop: '1px solid var(--border)' }}>

                    {seance.note && (
                      <div className="rounded-xl px-3 py-2.5"
                        style={{ background: 'var(--surface-2)' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>📝 Note</p>
                        <p className="text-sm italic" style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{seance.note}</p>
                      </div>
                    )}

                    {/* Exercices muscu */}
                    {exosMuscu.map((exo, i) => (
                      <div key={i}>
                        <p className="font-medium text-sm mb-2" style={{ color: 'var(--text)' }}>
                          {exo.nom}
                          {exo.poids_max && (
                            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--orange)' }}>
                              max {exo.poids_max}kg
                            </span>
                          )}
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

                    {/* Exercices cardio */}
                    {exosCardio.map((exo, i) => (
                      <div key={i} className="rounded-xl px-3 py-2.5"
                        style={{ background: '#111a2e' }}>
                        <p className="font-medium text-sm mb-1" style={{ color: '#6B9FFF' }}>
                          🏃 {exo.nom}
                        </p>
                        <div className="flex gap-3 flex-wrap text-sm" style={{ color: '#aaaaaa' }}>
                          {exo.duree_minutes && <span>⏱ {exo.duree_minutes}min</span>}
                          {exo.distance_m && <span>📍 {exo.distance_m >= 1000 ? `${(exo.distance_m/1000).toFixed(1)}km` : `${exo.distance_m}m`}</span>}
                          {exo.denivele_m && <span>⛰ +{exo.denivele_m}m</span>}
                          {exo.nb_sauts && <span>🪢 {exo.nb_sauts} sauts</span>}
                          {exo.note_cardio && <span>· {exo.note_cardio}</span>}
                        </div>
                      </div>
                    ))}

                    {/* Bouton partage — en bas du détail */}
                    <button
                      onClick={() => setSeanceAPartager(seance)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mt-1"
                      style={{
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                        color: '#a0b4d0',
                        border: '1px solid #2a3f5f',
                      }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <polyline points="16 6 12 2 8 6"/>
                        <line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                      Partager la séance
                    </button>
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
