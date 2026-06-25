'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'

export default function Progression() {
  const supabase = createClient()
  const [exercices, setExercices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('tous')

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Tous les exercices de l'utilisateur (pour avoir les IDs et les jours)
    const { data: exos } = await supabase
      .from('exercices')
      .select('id, nom, jour_id, jours(nom)')
      .eq('user_id', user.id)

    // Tous les logs avec poids
    const { data: logs } = await supabase
      .from('seances_log')
      .select('exercice_id, date_seance, poids_kg, repetitions_faites')
      .eq('user_id', user.id)
      .not('poids_kg', 'is', null)
      .gt('poids_kg', 0)
      .order('date_seance', { ascending: true })

    if (!exos) { setLoading(false); return }

    // Map exercice_id → nom pour retrouver le nom depuis les logs
    const nomParId = {}
    exos.forEach((e) => { nomParId[e.id] = e.nom })

    // Regrouper les logs par NOM d'exercice (pas par ID)
    const logsParNom = {}
    logs?.forEach((l) => {
      const nom = nomParId[l.exercice_id]
      if (!nom) return
      if (!logsParNom[nom]) logsParNom[nom] = []
      logsParNom[nom].push(l)
    })

    // Pour chaque nom unique, calculer PR, tendance, nb séances
    // On garde aussi les IDs associés pour le lien vers la page détail
    const nomsUniques = [...new Set(exos.map((e) => e.nom))].sort()

    const resultats = nomsUniques.map((nom) => {
      // Tous les IDs d'exercices avec ce nom (ex: Squat lundi + Squat mercredi)
      const idsAvecCeNom = exos.filter((e) => e.nom === nom).map((e) => e.id)
      // Le premier ID sert de lien vers la page progression détaillée
      const idRepresentatif = idsAvecCeNom[0]

      const logsNom = logsParNom[nom] || []

      if (logsNom.length === 0) {
        return { nom, idRepresentatif, idsAvecCeNom, nbSeances: 0, pr: null, dernierPoids: null, tendance: null }
      }

      const pr = Math.max(...logsNom.map((l) => l.poids_kg))

      // Grouper par date pour avoir le poids max par séance
      const parDate = {}
      logsNom.forEach((l) => {
        if (!parDate[l.date_seance]) parDate[l.date_seance] = []
        parDate[l.date_seance].push(l.poids_kg)
      })
      const sessions = Object.entries(parDate)
        .map(([date, poids]) => ({ date, poidsMax: Math.max(...poids) }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const dernierPoids = sessions[sessions.length - 1]?.poidsMax || null
      const avantDernier = sessions[sessions.length - 2]?.poidsMax || null
      const tendance = dernierPoids && avantDernier ? dernierPoids - avantDernier : null

      return { nom, idRepresentatif, idsAvecCeNom, nbSeances: sessions.length, pr, dernierPoids, tendance }
    })

    setExercices(resultats)
    setLoading(false)
  }

  const avecDonnees = exercices.filter((e) => e.nbSeances > 0)
  const sansDonnees = exercices.filter((e) => e.nbSeances === 0)

  return (
    <div>
      <Header title="Progression" subtitle="Évolution par exercice" />

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
      ) : exercices.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-2xl mb-2">📊</p>
          <p style={{ color: 'var(--text-muted)' }}>Aucun exercice dans ton programme.</p>
        </div>
      ) : (
        <>
          {avecDonnees.length > 0 && (
            <div className="flex flex-col gap-3 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
                Avec données ({avecDonnees.length} exercice{avecDonnees.length > 1 ? 's' : ''})
              </p>
              {avecDonnees.map(({ nom, idRepresentatif, idsAvecCeNom, nbSeances, pr, dernierPoids, tendance }) => (
                <Link key={nom} href={`/progression/exercice/${idRepresentatif}?ids=${idsAvecCeNom.join(',')}`}>
                  <div className="card flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold" style={{ color: 'var(--text)' }}>{nom}</p>
                        {tendance !== null && (
                          <span className="text-xs font-bold" style={{
                            color: tendance > 0 ? '#22c55e' : tendance < 0 ? '#ef4444' : 'var(--text-faint)'
                          }}>
                            {tendance > 0 ? `▲ +${tendance}kg` : tendance < 0 ? `▼ ${tendance}kg` : '→ stable'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {nbSeances} séance{nbSeances > 1 ? 's' : ''}
                        {idsAvecCeNom.length > 1 && ` · ${idsAvecCeNom.length} jours`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: 'var(--orange)' }}>{dernierPoids}kg</p>
                      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>PR : {pr}kg</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {sansDonnees.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
                Sans données encore
              </p>
              {sansDonnees.map(({ nom }) => (
                <div key={nom} className="card flex items-center justify-between py-3" style={{ opacity: 0.4 }}>
                  <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{nom}</p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Aucune série loguée</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
