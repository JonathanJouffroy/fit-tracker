'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import RestTimer from '@/app/components/RestTimer'
import Header from '@/app/components/Header'
import { calculerCaloriesExercice } from '@/lib/calculs'

export default function SeanceJour() {
  const { jour: jourId } = useParams()
  const router = useRouter()

  const [jour, setJour] = useState(null)
  const [exercices, setExercices] = useState([])
  const [loading, setLoading] = useState(true)
  const [exoActifTimer, setExoActifTimer] = useState(null) // {exerciceId, duree}
  const [seriesFaites, setSeriesFaites] = useState({}) // {exerciceId: nbSeriesFaites}
  const [poidsCorps, setPoidsCorps] = useState(null)
  const [userId, setUserId] = useState(null)

  // Formulaire ajout exercice
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [series, setSeries] = useState(3)
  const [repetitions, setRepetitions] = useState(10)
  const [repos, setRepos] = useState(60)
  const [poidsCharge, setPoidsCharge] = useState('')

  useEffect(() => {
    charger()
  }, [jourId])

  async function charger() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    setLoading(true)
    const { data: jourData } = await supabase.from('jours').select('*').eq('id', jourId).single()
    const { data: exosData } = await supabase
      .from('exercices')
      .select('*')
      .eq('jour_id', jourId)
      .eq('user_id', user.id)
      .order('ordre')

    // Poids corporel le plus récent, nécessaire pour calculer les kcal (MET)
    const { data: mesures } = await supabase
      .from('mesures')
      .select('poids_kg')
      .eq('user_id', user.id)
      .order('date_mesure', { ascending: false })
      .limit(1)

    setJour(jourData)
    setExercices(exosData || [])
    setPoidsCorps(mesures?.[0]?.poids_kg || null)
    setLoading(false)
  }

  async function ajouterExercice(e) {
    e.preventDefault()
    if (!nom.trim()) return

    const { error } = await supabase.from('exercices').insert([{
      jour_id: jourId,
      user_id: userId,
      nom,
      series: Number(series),
      repetitions: Number(repetitions),
      repos_secondes: Number(repos),
      poids_charge_kg: poidsCharge ? Number(poidsCharge) : 0,
      ordre: exercices.length,
    }])

    if (!error) {
      setNom(''); setSeries(3); setRepetitions(10); setRepos(60); setPoidsCharge('')
      setShowForm(false)
      charger()
    }
  }

  async function supprimerExercice(id) {
    await supabase.from('exercices').delete().eq('id', id)
    charger()
  }

  function terminerSerie(exercice) {
    const fait = (seriesFaites[exercice.id] || 0) + 1
    setSeriesFaites((s) => ({ ...s, [exercice.id]: fait }))

    supabase.from('seances_log').insert([{
      exercice_id: exercice.id,
      user_id: userId,
      serie_numero: fait,
      repetitions_faites: exercice.repetitions,
    }])

    if (fait < exercice.series) {
      setExoActifTimer({ exerciceId: exercice.id, duree: exercice.repos_secondes })
    } else {
      setExoActifTimer(null)
    }
  }

  if (loading) return <p className="text-gray-400">Chargement...</p>

  // Calcul des kcal par exercice (pondéré par les séries réellement faites)
  function kcalExercice(exo, serieFaites) {
    return calculerCaloriesExercice({
      series: serieFaites,
      repetitions: exo.repetitions,
      poidsCharge: exo.poids_charge_kg,
      poidsCorps,
    })
  }

  const kcalTotalPrevu = exercices.reduce((acc, exo) => acc + kcalExercice(exo, exo.series), 0)
  const kcalTotalFait = exercices.reduce((acc, exo) => acc + kcalExercice(exo, seriesFaites[exo.id] || 0), 0)

  return (
    <div>
      <button onClick={() => router.push('/')} className="text-orange-600 text-sm mb-3">← Retour</button>
      <h1 className="text-2xl font-bold mb-1">{jour?.nom}</h1>

      {!poidsCorps && (
        <p className="text-xs text-orange-500 mb-3">
          Renseigne ton poids dans Profil pour voir les calories dépensées.
        </p>
      )}

      {poidsCorps && exercices.length > 0 && (
        <div className="card flex items-center justify-between mb-6 py-3">
          <div>
            <p className="text-sm font-semibold">Calories de la séance</p>
            <p className="text-xs text-gray-400">Estimation totale (méthode MET)</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-600">{kcalTotalFait}</p>
            <p className="text-xs text-gray-400">/ {kcalTotalPrevu} kcal prévues</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {exercices.map((exo) => {
          const fait = seriesFaites[exo.id] || 0
          const timerActif = exoActifTimer?.exerciceId === exo.id
          const termine = fait >= exo.series
          const kcalExo = kcalExercice(exo, exo.series)

          return (
            <div key={exo.id} className="flex flex-col gap-3">
              <div className={`card ${termine ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{exo.nom}</p>
                    <p className="text-sm text-gray-500">
                      {exo.series} séries × {exo.repetitions} reps
                      {exo.poids_charge_kg > 0 && ` · ${exo.poids_charge_kg}kg`}
                      {' · '}repos {exo.repos_secondes}s
                    </p>
                    {poidsCorps && (
                      <p className="text-xs text-orange-500 font-medium mt-0.5">~{kcalExo} kcal</p>
                    )}
                  </div>
                  <button onClick={() => supprimerExercice(exo.id)} className="text-gray-300 text-sm">✕</button>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm font-medium">
                    {fait} / {exo.series} séries faites
                  </p>
                  {!termine && (
                    <button
                      onClick={() => terminerSerie(exo)}
                      className="bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-semibold active:scale-95"
                    >
                      Série terminée
                    </button>
                  )}
                  {termine && <span className="text-green-600 text-sm font-semibold">✓ Terminé</span>}
                </div>
              </div>

              {timerActif && (
                <RestTimer
                  dureeSecondes={exoActifTimer.duree}
                  onTermine={() => {}}
                />
              )}
            </div>
          )
        })}

        {exercices.length === 0 && (
          <p className="text-gray-400 text-center py-8">Aucun exercice ce jour. Jour de repos ou ajoute-en un ci-dessous.</p>
        )}
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full mt-6">
          + Ajouter un exercice
        </button>
      ) : (
        <form onSubmit={ajouterExercice} className="card mt-6 flex flex-col gap-3">
          <input
            value={nom} onChange={(e) => setNom(e.target.value)}
            placeholder="Nom de l'exercice (ex: Squat)"
            className="border rounded-lg px-3 py-2"
            autoFocus
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Séries</label>
              <input type="number" min="1" value={series} onChange={(e) => setSeries(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Répétitions</label>
              <input type="number" min="1" value={repetitions} onChange={(e) => setRepetitions(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Repos (s)</label>
              <input type="number" min="0" step="5" value={repos} onChange={(e) => setRepos(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Poids utilisé (kg) — laisse vide si poids du corps</label>
            <input
              type="number" min="0" step="0.5" value={poidsCharge}
              onChange={(e) => setPoidsCharge(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ex: 20"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl bg-gray-100 font-medium">
              Annuler
            </button>
            <button type="submit" className="flex-1 btn-primary">
              Ajouter
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
