'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import RestTimer from '@/app/components/RestTimer'
import AutocompleteInput from '@/app/components/AutocompleteInput'
import { useToast } from '@/app/components/Toast'
import { calculerCaloriesExercice } from '@/lib/calculs'

export default function SeanceJour() {
  const { jour: jourId } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const [jour, setJour] = useState(null)
  const [exercices, setExercices] = useState([])
  const [loading, setLoading] = useState(true)
  const [exoActifTimer, setExoActifTimer] = useState(null)
  const [poidsCorps, setPoidsCorps] = useState(null)
  const [userId, setUserId] = useState(null)
  const [seriesFaites, setSeriesFaites] = useState({})
  const [poidsSerieEnCours, setPoidsSerieEnCours] = useState({})
  const [nomsExistants, setNomsExistants] = useState([])

  // Map nom → liste d'IDs pour construire le lien progression
  const [idsByNom, setIdsByNom] = useState({})

  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [series, setSeries] = useState(3)
  const [repetitions, setRepetitions] = useState(10)
  const [repos, setRepos] = useState(60)
  const [poidsCharge, setPoidsCharge] = useState('')

  const [exoEnEdition, setExoEnEdition] = useState(null)
  const [editNom, setEditNom] = useState('')
  const [editSeries, setEditSeries] = useState(3)
  const [editRepetitions, setEditRepetitions] = useState(10)
  const [editRepos, setEditRepos] = useState(60)
  const [editPoidsCharge, setEditPoidsCharge] = useState('')

  const storageKey = `seance-${jourId}-${new Date().toISOString().split('T')[0]}`

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const { seriesFaites: sf, poidsSerieEnCours: psc } = JSON.parse(saved)
        if (sf) setSeriesFaites(sf)
        if (psc) setPoidsSerieEnCours(psc)
      }
    } catch {}
    chargerTout()
  }, [jourId])

  useEffect(() => {
    if (Object.keys(seriesFaites).length === 0) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ seriesFaites, poidsSerieEnCours }))
    } catch {}
  }, [seriesFaites, poidsSerieEnCours])

  async function chargerTout() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [{ data: jourData }, { data: exosData }, { data: mesures }, { data: tousExos }] = await Promise.all([
      supabase.from('jours').select('*').eq('id', jourId).single(),
      supabase.from('exercices').select('*').eq('jour_id', jourId).eq('user_id', user.id).order('ordre'),
      supabase.from('mesures').select('poids_kg').eq('user_id', user.id).order('date_mesure', { ascending: false }).limit(1),
      // Tous les exercices de l'utilisateur pour construire la map nom→IDs
      supabase.from('exercices').select('id, nom').eq('user_id', user.id),
    ])

    setJour(jourData)
    setExercices(exosData || [])
    setPoidsCorps(mesures?.[0]?.poids_kg || null)

    // Construire nom → [id1, id2, ...] pour le lien progression
    const map = {}
    tousExos?.forEach((e) => {
      if (!map[e.nom]) map[e.nom] = []
      map[e.nom].push(e.id)
    })
    setIdsByNom(map)
    setNomsExistants([...new Set((tousExos || []).map((e) => e.nom))].sort())

    setPoidsSerieEnCours((prev) => {
      const next = { ...prev }
      exosData?.forEach((e) => { if (!(e.id in next)) next[e.id] = e.poids_charge_kg || '' })
      return next
    })
    setLoading(false)
  }

  async function rechargerExercices(uid) {
    const { data: exosData } = await supabase.from('exercices').select('*')
      .eq('jour_id', jourId).eq('user_id', uid).order('ordre')
    setExercices(exosData || [])
    // Mettre à jour aussi la map idsByNom
    const { data: tousExos } = await supabase.from('exercices').select('id, nom').eq('user_id', uid)
    const map = {}
    tousExos?.forEach((e) => {
      if (!map[e.nom]) map[e.nom] = []
      map[e.nom].push(e.id)
    })
    setIdsByNom(map)
    setPoidsSerieEnCours((prev) => {
      const next = { ...prev }
      exosData?.forEach((e) => { if (!(e.id in next)) next[e.id] = e.poids_charge_kg || '' })
      return next
    })
  }

  // Construit le lien progression avec tous les IDs du même nom
  function lienProgression(exo) {
    const ids = idsByNom[exo.nom] || [exo.id]
    return `/progression/exercice/${ids[0]}?ids=${ids.join(',')}`
  }

  async function ajouterExercice(e) {
    e.preventDefault()
    if (!nom.trim() || !userId) return
    const { error } = await supabase.from('exercices').insert([{
      user_id: userId, jour_id: jourId, nom,
      series: Number(series), repetitions: Number(repetitions),
      repos_secondes: Number(repos),
      poids_charge_kg: poidsCharge ? Number(poidsCharge) : 0,
      ordre: exercices.length,
    }])
    if (error) { toast('Erreur lors de l\'ajout', 'error'); return }
    setNom(''); setSeries(3); setRepetitions(10); setRepos(60); setPoidsCharge('')
    setShowForm(false)
    toast(`${nom} ajouté ✓`)
    rechargerExercices(userId)
  }

  function ouvrirEdition(exo) {
    setExoEnEdition(exo)
    setEditNom(exo.nom)
    setEditSeries(exo.series)
    setEditRepetitions(exo.repetitions)
    setEditRepos(exo.repos_secondes)
    setEditPoidsCharge(exo.poids_charge_kg || '')
    setShowForm(false)
  }

  async function sauvegarderEdition(e) {
    e.preventDefault()
    if (!editNom.trim() || !exoEnEdition) return
    const { error } = await supabase.from('exercices').update({
      nom: editNom,
      series: Number(editSeries),
      repetitions: Number(editRepetitions),
      repos_secondes: Number(editRepos),
      poids_charge_kg: editPoidsCharge ? Number(editPoidsCharge) : 0,
    }).eq('id', exoEnEdition.id)
    if (error) { toast('Erreur lors de la modification', 'error'); return }
    toast(`${editNom} modifié ✓`)
    setExoEnEdition(null)
    rechargerExercices(userId)
  }

  async function supprimerExercice(id, nomExo) {
    await supabase.from('exercices').delete().eq('id', id)
    setSeriesFaites((s) => { const n = { ...s }; delete n[id]; return n })
    setPoidsSerieEnCours((s) => { const n = { ...s }; delete n[id]; return n })
    toast(`${nomExo} supprimé`)
    rechargerExercices(userId)
  }

  async function terminerSerie(exercice) {
    const fait = (seriesFaites[exercice.id] || 0) + 1
    setSeriesFaites((s) => ({ ...s, [exercice.id]: fait }))
    const poidsSerie = parseFloat(poidsSerieEnCours[exercice.id]) || null
    await supabase.from('seances_log').insert([{
      user_id: userId,
      exercice_id: exercice.id,
      exercice_nom: exercice.nom, // snapshot du nom au moment du log
      serie_numero: fait,
      repetitions_faites: exercice.repetitions,
      poids_kg: poidsSerie,
    }])
    if (fait < exercice.series) {
      setExoActifTimer({ exerciceId: exercice.id, duree: exercice.repos_secondes })
    } else {
      setExoActifTimer(null)
      toast(`${exercice.nom} terminé 💪`)
    }
  }

  if (loading) return <p className="pt-6" style={{ color: 'var(--text-muted)' }}>Chargement...</p>

  function kcalExo(exo, nbSeries) {
    return calculerCaloriesExercice({ series: nbSeries, repetitions: exo.repetitions, poidsCharge: exo.poids_charge_kg, poidsCorps })
  }

  const kcalPrevu = exercices.reduce((a, e) => a + kcalExo(e, e.series), 0)
  const kcalFait = exercices.reduce((a, e) => a + kcalExo(e, seriesFaites[e.id] || 0), 0)

  return (
    <div>
      <button onClick={() => router.push('/')} className="text-sm mb-3" style={{ color: 'var(--orange)' }}>← Retour</button>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>{jour?.nom}</h1>

      {!poidsCorps && (
        <p className="text-xs mb-3" style={{ color: 'var(--orange)' }}>
          Renseigne ton poids dans Profil pour voir les calories dépensées.
        </p>
      )}

      {poidsCorps && exercices.length > 0 && (
        <div className="card flex items-center justify-between mb-6 py-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Calories de la séance</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Estimation (méthode MET)</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>{kcalFait}</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>/ {kcalPrevu} kcal prévues</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {exercices.map((exo) => {
          const fait = seriesFaites[exo.id] || 0
          const timerActif = exoActifTimer?.exerciceId === exo.id
          const termine = fait >= exo.series
          const enEdition = exoEnEdition?.id === exo.id

          return (
            <div key={exo.id} className="flex flex-col gap-3">
              <div className="card" style={{ opacity: termine && !enEdition ? 0.6 : 1 }}>
                {enEdition ? (
                  <form onSubmit={sauvegarderEdition} className="flex flex-col gap-3">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Modifier l'exercice</p>
                    <div>
                      <label className="label">Nom</label>
                      <AutocompleteInput value={editNom} onChange={setEditNom} suggestions={nomsExistants} placeholder="Nom de l'exercice" />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="label">Séries</label>
                        <input type="number" min="1" value={editSeries} onChange={(e) => setEditSeries(e.target.value)} className="input" />
                      </div>
                      <div className="flex-1">
                        <label className="label">Reps</label>
                        <input type="number" min="1" value={editRepetitions} onChange={(e) => setEditRepetitions(e.target.value)} className="input" />
                      </div>
                      <div className="flex-1">
                        <label className="label">Repos (s)</label>
                        <input type="number" min="0" step="5" value={editRepos} onChange={(e) => setEditRepos(e.target.value)} className="input" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Poids par défaut (kg)</label>
                      <input type="number" min="0" step="0.5" value={editPoidsCharge} onChange={(e) => setEditPoidsCharge(e.target.value)} className="input" placeholder="Ex: 20" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setExoEnEdition(null)}
                        className="flex-1 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                        Annuler
                      </button>
                      <button type="submit" className="flex-1 btn-primary text-sm py-2">Enregistrer</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold" style={{ color: 'var(--text)' }}>{exo.nom}</p>
                          <Link href={lienProgression(exo)} className="text-xs underline" style={{ color: 'var(--orange)' }}>
                            Progression →
                          </Link>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {exo.series}×{exo.repetitions}
                          {exo.poids_charge_kg > 0 && ` · ${exo.poids_charge_kg}kg`}
                          {' · '}{exo.repos_secondes}s
                        </p>
                        {poidsCorps && (
                          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--orange)' }}>
                            ~{kcalExo(exo, exo.series)} kcal
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button onClick={() => ouvrirEdition(exo)}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>✏️</button>
                        <button onClick={() => supprimerExercice(exo.id, exo.nom)}
                          style={{ color: 'var(--text-faint)' }}>✕</button>
                      </div>
                    </div>

                    {!termine ? (
                      <div className="mt-3 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="label">Poids série {fait + 1} (kg)</label>
                          <input type="number" step="0.5" min="0"
                            value={poidsSerieEnCours[exo.id] || ''}
                            onChange={(e) => setPoidsSerieEnCours((p) => ({ ...p, [exo.id]: e.target.value }))}
                            className="input text-sm" placeholder="Ex: 20" />
                        </div>
                        <button onClick={() => terminerSerie(exo)}
                          className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
                          Série {fait + 1} ✓
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold mt-3 text-green-500">✓ {exo.series} séries terminées</p>
                    )}

                    <div className="flex gap-1 mt-3">
                      {Array.from({ length: exo.series }).map((_, i) => (
                        <div key={i} className="flex-1 h-1.5 rounded-full"
                          style={{ background: i < fait ? '#22c55e' : 'var(--surface-2)' }} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {timerActif && <RestTimer dureeSecondes={exoActifTimer.duree} onTermine={() => {}} />}
            </div>
          )
        })}

        {exercices.length === 0 && (
          <p className="text-center py-8" style={{ color: 'var(--text-faint)' }}>
            Aucun exercice ce jour. Jour de repos ou ajoute-en un ci-dessous.
          </p>
        )}
      </div>

      {!showForm && !exoEnEdition ? (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full mt-6">+ Ajouter un exercice</button>
      ) : showForm && (
        <form onSubmit={ajouterExercice} className="card mt-6 flex flex-col gap-3">
          <div>
            <label className="label">Nom de l'exercice</label>
            <AutocompleteInput value={nom} onChange={setNom} suggestions={nomsExistants} placeholder="Ex: Squat, Développé couché..." />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label">Séries</label>
              <input type="number" min="1" value={series} onChange={(e) => setSeries(e.target.value)} className="input" />
            </div>
            <div className="flex-1">
              <label className="label">Répétitions</label>
              <input type="number" min="1" value={repetitions} onChange={(e) => setRepetitions(e.target.value)} className="input" />
            </div>
            <div className="flex-1">
              <label className="label">Repos (s)</label>
              <input type="number" min="0" step="5" value={repos} onChange={(e) => setRepos(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Poids par défaut (kg) — optionnel</label>
            <input type="number" min="0" step="0.5" value={poidsCharge}
              onChange={(e) => setPoidsCharge(e.target.value)} className="input" placeholder="Ex: 20" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
              Annuler
            </button>
            <button type="submit" className="flex-1 btn-primary">Ajouter</button>
          </div>
        </form>
      )}
    </div>
  )
}
