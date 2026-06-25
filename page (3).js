'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'

export default function Progression() {
  const supabase = createClient()
  const router = useRouter()
  const [exercices, setExercices] = useState([]) // [{exo, dernierPoids, pr, nbSeances, tendance}]
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('tous') // 'tous' | jour_id

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Tous les exercices de l'utilisateur
    const { data: exos } = await supabase.from('exercices').select('*, jours(nom)')
      .eq('user_id', user.id).order('nom')

    // Tous les logs avec poids (pour calculer PR, tendance)
    const { data: logs } = await supabase.from('seances_log')
      .select('exercice_id, date_seance, poids_kg, repetitions_faites')
      .eq('user_id', user.id)
      .not('poids_kg', 'is', null)
      .gt('poids_kg', 0)
      .order('date_seance', { ascending: true })

    // Regrouper les logs par exercice
    const logsParExo = {}
    logs?.forEach((l) => {
      if (!logsParExo[l.exercice_id]) logsParExo[l.exercice_id] = []
      logsParExo[l.exercice_id].push(l)
    })

    const resultats = (exos || []).map((exo) => {
      const logsExo = logsParExo[exo.id] || []
      if (logsExo.length === 0) return { exo, nbSeances: 0, pr: null, dernierPoids: null, tendance: null }

      const pr = Math.max(...logsExo.map((l) => l.poids_kg))

      // Grouper par date pour avoir le poids max par séance
      const parDate = {}
      logsExo.forEach((l) => {
        if (!parDate[l.date_seance]) parDate[l.date_seance] = []
        parDate[l.date_seance].push(l.poids_kg)
      })
      const sessions = Object.entries(parDate)
        .map(([date, poids]) => ({ date, poidsMax: Math.max(...poids) }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const dernierPoids = sessions[sessions.length - 1]?.poidsMax || null
      const avantDernier = sessions[sessions.length - 2]?.poidsMax || null
      const tendance = dernierPoids && avantDernier ? dernierPoids - avantDernier : null

      return { exo, nbSeances: sessions.length, pr, dernierPoids, tendance }
    })

    setExercices(resultats)
    setLoading(false)
  }

  // Jours distincts pour le filtre
  const joursDisponibles = [...new Map(
    exercices.map((e) => [e.exo.jour_id, e.exo.jours?.nom])
  ).entries()].sort()

  const exercicesFiltres = filtre === 'tous'
    ? exercices
    : exercices.filter((e) => String(e.exo.jour_id) === filtre)

  const avecDonnees = exercicesFiltres.filter((e) => e.nbSeances > 0)
  const sansDonnees = exercicesFiltres.filter((e) => e.nbSeances === 0)

  return (
    <div>
      <Header title="Progression" subtitle="Évolution par exercice" />

      {/* Filtre par jour */}
      <div className="flex gap-2 flex-wrap mb-4 overflow-x-auto pb-1">
        <button onClick={() => setFiltre('tous')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap ${filtre === 'tous' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'}`}>
          Tous
        </button>
        {joursDisponibles.map(([jourId, jourNom]) => (
          <button key={jourId} onClick={() => setFiltre(String(jourId))}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap ${filtre === String(jourId) ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            {jourNom}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : exercices.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-2xl mb-2">🏋️</p>
          <p className="text-gray-500">Aucun exercice dans ton programme.</p>
          <p className="text-gray-400 text-sm mt-1">Ajoute des exercices dans tes séances pour voir ta progression ici.</p>
        </div>
      ) : (
        <>
          {avecDonnees.length > 0 && (
            <div className="flex flex-col gap-3 mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avec données</p>
              {avecDonnees.map(({ exo, nbSeances, pr, dernierPoids, tendance }) => (
                <Link key={exo.id} href={`/progression/exercice/${exo.id}`}>
                  <div className="card flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{exo.nom}</p>
                        {tendance !== null && (
                          <span className={`text-xs font-bold ${tendance > 0 ? 'text-green-500' : tendance < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {tendance > 0 ? `▲ +${tendance}kg` : tendance < 0 ? `▼ ${tendance}kg` : '→ stable'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {exo.jours?.nom} · {nbSeances} séance{nbSeances > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">{dernierPoids}kg</p>
                      <p className="text-xs text-gray-400">PR : {pr}kg</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {sansDonnees.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sans données encore</p>
              {sansDonnees.map(({ exo }) => (
                <div key={exo.id} className="card flex items-center justify-between opacity-50 py-3">
                  <div>
                    <p className="font-medium text-sm">{exo.nom}</p>
                    <p className="text-xs text-gray-400">{exo.jours?.nom}</p>
                  </div>
                  <p className="text-xs text-gray-300">Aucune séance</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
