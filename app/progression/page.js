'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'
import { SkeletonListe } from '@/app/components/Skeleton'
import { ErreurChargement } from '@/app/components/Erreur'

const PERIODES = [
  { label: '7j', jours: 7 },
  { label: '30j', jours: 30 },
  { label: '3 mois', jours: 90 },
  { label: 'Tout', jours: 0 },
]

export default function Progression() {
  const supabase = createClient()
  const [exercices, setExercices] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [onglet, setOnglet] = useState('liste') // 'liste' | 'resume'
  const [periode, setPeriode] = useState(30)
  const [allLogs, setAllLogs] = useState([])

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    setErreur(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: exos } = await supabase
        .from('exercices').select('id, nom, jour_id, jours(nom)').eq('user_id', user.id)

      const { data: logs } = await supabase
        .from('seances_log')
        .select('exercice_id, exercice_nom, date_seance, poids_kg, repetitions_faites')
        .eq('user_id', user.id).not('poids_kg', 'is', null).neq('poids_kg', 0)
        .order('date_seance', { ascending: true })

      if (!exos) return

      const nomParId = {}
      exos.forEach((e) => { nomParId[e.id] = e.nom })
      const idsByNom = {}
      exos.forEach((e) => { if (!idsByNom[e.nom]) idsByNom[e.nom] = []; idsByNom[e.nom].push(e.id) })

      const logsParNom = {}
      logs?.forEach((l) => {
        const nom = l.exercice_nom || nomParId[l.exercice_id]
        if (!nom) return
        if (!logsParNom[nom]) logsParNom[nom] = []
        logsParNom[nom].push(l)
      })

      const nomsActuels = new Set(exos.map((e) => e.nom))
      const tousLesNoms = [...new Set([...nomsActuels, ...Object.keys(logsParNom)])].sort()

      const resultats = tousLesNoms.map((nom) => {
        const idsAvecCeNom = idsByNom[nom] || []
        const idRepresentatif = idsAvecCeNom[0] || null
        const logsNom = logsParNom[nom] || []
        if (logsNom.length === 0) return { nom, idRepresentatif, idsAvecCeNom, nbSeances: 0, pr: null, dernierPoids: null, tendance: null, estAssistance: false }

        // Détecter si c'est un exercice en mode assistance (majorité de poids négatifs)
        const estAssistance = logsNom.filter(l => l.poids_kg < 0).length > logsNom.length / 2

        // PR : pour la charge = max positif, pour l'assistance = moins d'assistance = max (moins négatif)
        const pr = estAssistance
          ? Math.max(...logsNom.map(l => l.poids_kg)) // ex: max(-20, -15) = -15 = moins d'assistance = mieux
          : Math.max(...logsNom.map(l => l.poids_kg))

        const parSession = {}
        logsNom.forEach((l) => {
          const key = `${l.date_seance}__${l.exercice_id}`
          if (!parSession[key]) parSession[key] = []
          parSession[key].push(l.poids_kg)
        })
        const sessions = Object.entries(parSession)
          .map(([key, poids]) => ({
            date: key.split('__')[0],
            // Pour assistance : max = moins négatif = meilleure perf
            poids: estAssistance ? Math.max(...poids) : Math.max(...poids)
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
        const dernierPoids = sessions[sessions.length - 1]?.poids || null
        const avantDernier = sessions[sessions.length - 2]?.poids || null
        const tendance = dernierPoids && avantDernier ? Math.round((dernierPoids - avantDernier) * 100) / 100 : null
        return { nom, idRepresentatif, idsAvecCeNom, nbSeances: sessions.length, pr, dernierPoids, tendance, estAssistance, sansLienProg: !idRepresentatif }
      })

      setExercices(resultats)
      setAllLogs(logs || [])
    } catch (e) {
      setErreur(e.message === 'timeout'
        ? 'Connexion trop lente. Supabase est peut-être indisponible.'
        : 'Impossible de charger la progression. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }

  const avecDonnees = exercices.filter((e) => e.nbSeances > 0)
  const sansDonnees = exercices.filter((e) => e.nbSeances === 0)

  // Calcul du résumé selon la période
  const resume = useMemo(() => {
    if (!allLogs.length) return null
    const debut = periode === 0 ? null : new Date()
    if (debut) debut.setDate(debut.getDate() - periode)
    const debutStr = debut ? `${debut.getFullYear()}-${String(debut.getMonth()+1).padStart(2,'0')}-${String(debut.getDate()).padStart(2,'0')}` : null

    const logsFiltres = debutStr ? allLogs.filter(l => l.date_seance >= debutStr) : allLogs

    // Nombre de séances (jours distincts)
    const joursDistincts = new Set(logsFiltres.map(l => l.date_seance))
    const nbSeances = joursDistincts.size

    // Progression par exercice sur la période
    const parNom = {}
    logsFiltres.forEach(l => {
      const nom = l.exercice_nom
      if (!nom) return
      if (!parNom[nom]) parNom[nom] = []
      parNom[nom].push(l)
    })

    const progressions = Object.entries(parNom).map(([nom, logs]) => {
      const estAssistance = logs.filter(l => l.poids_kg < 0).length > logs.length / 2
      const parSession = {}
      logs.forEach(l => {
        if (!parSession[l.date_seance]) parSession[l.date_seance] = []
        parSession[l.date_seance].push(l.poids_kg)
      })
      const sessions = Object.entries(parSession)
        .map(([date, poids]) => ({ date, poids: Math.max(...poids) }))
        .sort((a, b) => a.date.localeCompare(b.date))

      if (sessions.length < 2) return null
      const premier = sessions[0].poids
      const dernier = sessions[sessions.length - 1].poids
      const delta = Math.round((dernier - premier) * 100) / 100
      return { nom, premier, dernier, delta, nbSeances: sessions.length, estAssistance }
    }).filter(Boolean)

    // Trier par progression absolue
    const top = [...progressions].sort((a, b) => {
      const da = a.estAssistance ? a.delta : a.delta // + = progressé
      const db = b.estAssistance ? b.delta : b.delta
      return db - da
    })

    return { nbSeances, progressions: top }
  }, [allLogs, periode])

  return (
    <div>
      <Header title="Progression" subtitle="Évolution par exercice" />

      {/* Onglets */}
      <div className="flex gap-2 mb-4">
        {[{ id: 'liste', label: '📋 Exercices' }, { id: 'resume', label: '📊 Résumé' }].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: onglet === o.id ? 'var(--orange)' : 'var(--surface)',
              color: onglet === o.id ? 'white' : 'var(--text-muted)',
              border: `1px solid ${onglet === o.id ? 'var(--orange)' : 'var(--border)'}`,
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonListe nb={5} lignes={2} />
      ) : erreur ? (
        <ErreurChargement message={erreur} onReessayer={charger} />
      ) : onglet === 'resume' ? (
        /* ======== ONGLET RÉSUMÉ ======== */
        <div className="flex flex-col gap-4">
          {/* Sélecteur de période */}
          <div className="flex gap-2">
            {PERIODES.map(p => (
              <button key={p.jours} onClick={() => setPeriode(p.jours)}
                className="flex-1 py-1.5 rounded-xl text-sm font-medium"
                style={{
                  background: periode === p.jours ? 'var(--orange)' : 'var(--surface-2)',
                  color: periode === p.jours ? 'white' : 'var(--text-muted)',
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Stats globales */}
          {resume && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="card text-center py-3">
                  <p className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>{resume.nbSeances}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Séance{resume.nbSeances > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="card text-center py-3">
                  <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                    {resume.progressions.filter(p => p.estAssistance ? p.delta > 0 : p.delta > 0).length}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>En progression</p>
                </div>
              </div>

              {/* Top progressions */}
              {resume.progressions.filter(p => p.estAssistance ? p.delta > 0 : p.delta > 0).length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                    🏆 MEILLEURES PROGRESSIONS
                  </p>
                  <div className="flex flex-col gap-2">
                    {resume.progressions
                      .filter(p => p.estAssistance ? p.delta > 0 : p.delta > 0)
                      .slice(0, 3)
                      .map((p, i) => (
                        <div key={p.nom} className="card flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{p.nom}</p>
                              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                                {p.estAssistance
                                  ? `${Math.abs(p.premier)}kg → ${Math.abs(p.dernier)}kg assist.`
                                  : `${p.premier}kg → ${p.dernier}kg`}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold" style={{ color: '#22c55e' }}>
                            {p.estAssistance ? `-${p.delta}kg assist.` : `+${p.delta}kg`}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Tous les exercices */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                  TOUS LES EXERCICES ({resume.progressions.length})
                </p>
                <div className="flex flex-col gap-2">
                  {resume.progressions.map(p => {
                    const progression = p.estAssistance ? p.delta > 0 : p.delta > 0
                    const regression = p.estAssistance ? p.delta < 0 : p.delta < 0
                    const couleur = progression ? '#22c55e' : regression ? '#ef4444' : 'var(--text-faint)'
                    const labelDelta = p.delta === 0 ? '→ stable'
                      : p.estAssistance
                        ? (p.delta > 0 ? `-${p.delta}kg assist.` : `+${Math.abs(p.delta)}kg assist.`)
                        : (p.delta > 0 ? `+${p.delta}kg` : `${p.delta}kg`)
                    const fleche = p.delta === 0 ? '→' : progression ? '▲' : '▼'

                    return (
                      <div key={p.nom} className="card flex items-center justify-between py-2.5">
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{p.nom}</p>
                          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                            {p.nbSeances} séance{p.nbSeances > 1 ? 's' : ''} ·{' '}
                            {p.estAssistance
                              ? `${Math.abs(p.premier)}kg → ${Math.abs(p.dernier)}kg assist.`
                              : `${p.premier}kg → ${p.dernier}kg`}
                          </p>
                        </div>
                        <span className="text-sm font-bold" style={{ color: couleur }}>
                          {fleche} {labelDelta}
                        </span>
                      </div>
                    )
                  })}
                  {resume.progressions.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-2xl mb-2">📊</p>
                      <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                        Aucune donnée sur cette période
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : exercices.length === 0 ? (
        /* ======== LISTE VIDE ======== */
        <div className="card text-center py-12">
          <p className="text-2xl mb-2">📊</p>
          <p style={{ color: 'var(--text-muted)' }}>Aucun exercice dans ton programme.</p>
        </div>
      ) : (
        /* ======== ONGLET LISTE ======== */
        <>
          {avecDonnees.length > 0 && (
            <div className="flex flex-col gap-3 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
                Avec données ({avecDonnees.length} exercice{avecDonnees.length > 1 ? 's' : ''})
              </p>
              {avecDonnees.map(({ nom, idRepresentatif, idsAvecCeNom, nbSeances, pr, dernierPoids, tendance, estAssistance, sansLienProg }) => {
                const lien = idRepresentatif
                  ? `/progression/exercice/${idRepresentatif}?nom=${encodeURIComponent(nom)}`
                  : null

                // Affichage adapté pour l'assistance
                const afficherPoids = (p) => p === null ? '—'
                  : estAssistance ? `${Math.abs(p)}kg assist.`
                  : `${p}kg`

                // Tendance : pour assistance, progresser = tendance positive (moins négatif)
                const afficherTendance = () => {
                  if (tendance === null) return null
                  if (estAssistance) {
                    // Pour assistance : tendance > 0 = moins d'assistance = progression
                    if (tendance > 0) return <span className="text-xs font-bold" style={{ color: '#22c55e' }}>▲ -{tendance}kg assist.</span>
                    if (tendance < 0) return <span className="text-xs font-bold" style={{ color: '#ef4444' }}>▼ +{Math.abs(tendance)}kg assist.</span>
                    return <span className="text-xs" style={{ color: 'var(--text-faint)' }}>→ stable</span>
                  }
                  return (
                    <span className="text-xs font-bold" style={{
                      color: tendance > 0 ? '#22c55e' : tendance < 0 ? '#ef4444' : 'var(--text-faint)'
                    }}>
                      {tendance > 0 ? `▲ +${tendance}kg` : tendance < 0 ? `▼ ${tendance}kg` : '→ stable'}
                    </span>
                  )
                }

                const contenu = (
                  <div className="card flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold" style={{ color: 'var(--text)' }}>{nom}</p>
                        {afficherTendance()}
                        {sansLienProg && (
                          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>(renommé)</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {nbSeances} séance{nbSeances > 1 ? 's' : ''}
                        {idsAvecCeNom.length > 1 && ` · ${idsAvecCeNom.length} jours`}
                        {estAssistance && <span style={{ color: '#8B5CF6' }}> · 🤝 assistance</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: estAssistance ? '#8B5CF6' : 'var(--orange)' }}>
                        {afficherPoids(dernierPoids)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>PR : {afficherPoids(pr)}</p>
                    </div>
                  </div>
                )

                return lien
                  ? <Link key={nom} href={lien}>{contenu}</Link>
                  : <div key={nom}>{contenu}</div>
              })}
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
