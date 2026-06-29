'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import RestTimer from '@/app/components/RestTimer'
import TimerSeance from '@/app/components/TimerSeance'
import AutocompleteInput from '@/app/components/AutocompleteInput'
import FormCardio from '@/app/components/FormCardio'
import { useToast } from '@/app/components/Toast'
import { SkeletonExercice } from '@/app/components/Skeleton'
import { ErreurChargement } from '@/app/components/Erreur'
import { calculerCaloriesExercice, ACTIVITES_CARDIO } from '@/lib/calculs'

export default function SeanceJour() {
  const { jour: jourId } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const [jour, setJour] = useState(null)
  const [exercices, setExercices] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [exoActifTimer, setExoActifTimer] = useState(null)
  const [poidsCorps, setPoidsCorps] = useState(null)
  const [userId, setUserId] = useState(null)
  const [seriesFaites, setSeriesFaites] = useState({})
  const [poidsSerieEnCours, setPoidsSerieEnCours] = useState({})
  const [repsReelles, setRepsReelles] = useState({})
  const [seanceCommencee, setSeanceCommencee] = useState(false)
  const [nomsExistants, setNomsExistants] = useState([])
  const [idsByNom, setIdsByNom] = useState({})
  const [cardioEnCours, setCardioEnCours] = useState(null)

  // Formulaire ajout
  const [showForm, setShowForm] = useState(false)
  const [typeForm, setTypeForm] = useState('muscu')
  const [nom, setNom] = useState('')
  const [series, setSeries] = useState(3)
  const [repetitions, setRepetitions] = useState(10)
  const [repos, setRepos] = useState(60)
  const [poidsCharge, setPoidsCharge] = useState('')
  const [activiteCardio, setActiviteCardio] = useState('natation')

  // Formulaire édition
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
    setErreur(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      const [[{ data: jourData }, { data: exosData }, { data: mesures }, { data: tousExos }]] = await Promise.all([
        Promise.race([
          Promise.all([
            supabase.from('jours').select('*').eq('id', jourId).single(),
            supabase.from('exercices').select('*').eq('jour_id', jourId).eq('user_id', user.id).order('ordre'),
            supabase.from('mesures').select('poids_kg').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
            supabase.from('exercices').select('id, nom').eq('user_id', user.id),
          ]),
          timeout,
        ]),
      ])

      setJour(jourData)
      setExercices(exosData || [])
      setPoidsCorps(mesures?.[0]?.poids_kg || null)

      const map = {}
      tousExos?.forEach((e) => { if (!map[e.nom]) map[e.nom] = []; map[e.nom].push(e.id) })
      setIdsByNom(map)
      setNomsExistants([...new Set((tousExos || []).map((e) => e.nom))].sort())

      setPoidsSerieEnCours((prev) => {
        const next = { ...prev }
        exosData?.forEach((e) => { if (!(e.id in next)) next[e.id] = e.poids_charge_kg || '' })
        return next
      })
      setRepsReelles((prev) => {
        const next = { ...prev }
        exosData?.forEach((e) => { if (!(e.id in next)) next[e.id] = e.repetitions })
        return next
      })
    } catch (e) {
      setErreur(e.message === 'timeout'
        ? 'Connexion trop lente. Supabase est peut-être indisponible.'
        : 'Impossible de charger la séance. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }

  async function rechargerExercices(uid) {
    const { data: exosData } = await supabase.from('exercices').select('*')
      .eq('jour_id', jourId).eq('user_id', uid).order('ordre')
    setExercices(exosData || [])
    const { data: tousExos } = await supabase.from('exercices').select('id, nom').eq('user_id', uid)
    const map = {}
    tousExos?.forEach((e) => { if (!map[e.nom]) map[e.nom] = []; map[e.nom].push(e.id) })
    setIdsByNom(map)
    setPoidsSerieEnCours((prev) => {
      const next = { ...prev }
      exosData?.forEach((e) => { if (!(e.id in next)) next[e.id] = e.poids_charge_kg || '' })
      return next
    })
  }

  function lienProgression(exo) {
    const ids = idsByNom[exo.nom] || [exo.id]
    return `/progression/exercice/${ids[0]}?ids=${ids.join(',')}`
  }

  async function ajouterExercice(e) {
    e.preventDefault()
    if (!nom.trim() || !userId) return
    const { error } = await supabase.from('exercices').insert([{
      user_id: userId, jour_id: jourId, nom,
      type_exercice: typeForm,
      activite_cardio: typeForm === 'cardio' ? activiteCardio : null,
      series: typeForm === 'muscu' ? Number(series) : 1,
      repetitions: typeForm === 'muscu' ? Number(repetitions) : 0,
      repos_secondes: typeForm === 'muscu' ? Number(repos) : 0,
      poids_charge_kg: typeForm === 'muscu' && poidsCharge ? Number(poidsCharge) : 0,
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
    setEditNom(exo.nom); setEditSeries(exo.series)
    setEditRepetitions(exo.repetitions); setEditRepos(exo.repos_secondes)
    setEditPoidsCharge(exo.poids_charge_kg || '')
    setShowForm(false)
  }

  async function sauvegarderEdition(e) {
    e.preventDefault()
    if (!editNom.trim() || !exoEnEdition) return
    const { error } = await supabase.from('exercices').update({
      nom: editNom, series: Number(editSeries),
      repetitions: Number(editRepetitions), repos_secondes: Number(editRepos),
      poids_charge_kg: editPoidsCharge ? Number(editPoidsCharge) : 0,
    }).eq('id', exoEnEdition.id)
    if (error) { toast('Erreur lors de la modification', 'error'); return }
    toast(`${editNom} modifié ✓`)
    setExoEnEdition(null)
    rechargerExercices(userId)
  }

  async function supprimerExercice(id, nomExo) {
    if (!confirm(`Supprimer "${nomExo}" ? Cette action est irréversible.`)) return
    await supabase.from('exercices').delete().eq('id', id)
    setSeriesFaites((s) => { const n = { ...s }; delete n[id]; return n })
    setPoidsSerieEnCours((s) => { const n = { ...s }; delete n[id]; return n })
    setRepsReelles((s) => { const n = { ...s }; delete n[id]; return n })
    toast(`${nomExo} supprimé`)
    rechargerExercices(userId)
  }

  async function terminerSerie(exercice) {
    const fait = (seriesFaites[exercice.id] || 0) + 1
    setSeriesFaites((s) => ({ ...s, [exercice.id]: fait }))
    if (!seanceCommencee) setSeanceCommencee(true)
    const poidsSerie = parseFloat(poidsSerieEnCours[exercice.id]) || null
    const repsEffectives = Number(repsReelles[exercice.id]) || exercice.repetitions
    await supabase.from('seances_log').insert([{
      user_id: userId, exercice_id: exercice.id, exercice_nom: exercice.nom,
      serie_numero: fait, repetitions_faites: repsEffectives, poids_kg: poidsSerie,
    }])
    if (fait < exercice.series) {
      setExoActifTimer({ exerciceId: exercice.id, duree: exercice.repos_secondes })
    } else {
      setExoActifTimer(null)
      toast(`${exercice.nom} terminé 💪`)
    }
  }

  async function terminerCardio(exo, metriques) {
    if (!seanceCommencee) setSeanceCommencee(true)
    await supabase.from('seances_log').insert([{
      user_id: userId, exercice_id: exo.id, exercice_nom: exo.nom,
      serie_numero: 1, repetitions_faites: 0, poids_kg: null,
      duree_minutes: metriques.duree_minutes,
      distance_m: metriques.distance_m,
      denivele_m: metriques.denivele_m,
      nb_sauts: metriques.nb_sauts,
      note_cardio: metriques.note_cardio,
    }])
    setSeriesFaites((s) => ({ ...s, [exo.id]: 1 }))
    setCardioEnCours(null)
    toast(`${exo.nom} enregistré 💪`)
  }

  if (loading) return (
    <div className="pt-6">
      <div className="h-5 w-20 rounded-lg mb-3 animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <div className="h-8 w-40 rounded-lg mb-6 animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonExercice key={i} />)}
      </div>
    </div>
  )

  if (erreur) return (
    <div className="pt-6">
      <button onClick={() => router.push('/')} className="text-sm mb-4" style={{ color: 'var(--orange)' }}>← Retour</button>
      <ErreurChargement message={erreur} onReessayer={chargerTout} />
    </div>
  )

  function kcalExo(exo, nbSeries) {
    if (exo.type_exercice === 'cardio') return 0
    return calculerCaloriesExercice({ series: nbSeries, repetitions: exo.repetitions, poidsCharge: exo.poids_charge_kg, poidsCorps })
  }

  const exosMuscu = exercices.filter(e => e.type_exercice !== 'cardio')
  const kcalPrevu = exosMuscu.reduce((a, e) => a + kcalExo(e, e.series), 0)
  const kcalFait = exosMuscu.reduce((a, e) => a + kcalExo(e, seriesFaites[e.id] || 0), 0)

  return (
    <div>
      <button onClick={() => router.push('/')} className="text-sm mb-3" style={{ color: 'var(--orange)' }}>← Retour</button>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>{jour?.nom}</h1>

      <TimerSeance actif={seanceCommencee} jourId={jourId} />

      {!poidsCorps && (
        <p className="text-xs mb-3" style={{ color: 'var(--orange)' }}>
          Renseigne ton poids dans Profil pour voir les calories dépensées.
        </p>
      )}

      {poidsCorps && exosMuscu.length > 0 && (
        <div className="card flex items-center justify-between mb-6 py-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Calories muscu</p>
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
          const isCardio = exo.type_exercice === 'cardio'
          const activite = ACTIVITES_CARDIO.find(a => a.id === exo.activite_cardio)
          const termine = isCardio ? fait >= 1 : fait >= exo.series
          const enEdition = exoEnEdition?.id === exo.id

          return (
            <div key={exo.id} className="flex flex-col gap-3">
              {cardioEnCours?.id === exo.id && (
                <FormCardio exo={exo} poidsCorps={poidsCorps}
                  onTerminer={(m) => terminerCardio(exo, m)}
                  onAnnuler={() => setCardioEnCours(null)} />
              )}

              <div className="card" style={{ opacity: termine && !enEdition ? 0.6 : 1 }}>
                {enEdition ? (
                  <form onSubmit={sauvegarderEdition} className="flex flex-col gap-3">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Modifier l'exercice</p>
                    <div>
                      <label className="label">Nom</label>
                      <AutocompleteInput value={editNom} onChange={setEditNom} suggestions={nomsExistants} placeholder="Nom" />
                    </div>
                    {!isCardio && (
                      <div className="flex gap-2">
                        <div className="flex-1"><label className="label">Séries</label>
                          <input type="number" min="1" value={editSeries} onChange={(e) => setEditSeries(e.target.value)} className="input" /></div>
                        <div className="flex-1"><label className="label">Reps</label>
                          <input type="number" min="1" value={editRepetitions} onChange={(e) => setEditRepetitions(e.target.value)} className="input" /></div>
                        <div className="flex-1"><label className="label">Repos (s)</label>
                          <input type="number" min="0" step="5" value={editRepos} onChange={(e) => setEditRepos(e.target.value)} className="input" /></div>
                        <div className="flex-1"><label className="label">Poids (kg)</label>
                          <input type="number" min="0" step="0.5" value={editPoidsCharge} onChange={(e) => setEditPoidsCharge(e.target.value)} className="input" /></div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setExoEnEdition(null)}
                        className="flex-1 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>Annuler</button>
                      <button type="submit" className="flex-1 btn-primary text-sm py-2">Enregistrer</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold" style={{ color: 'var(--text)' }}>{exo.nom}</p>
                          {isCardio ? (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: '#EFF6FF', color: '#3B82F6' }}>Cardio</span>
                          ) : (
                            <Link href={lienProgression(exo)} className="text-xs underline" style={{ color: 'var(--orange)' }}>
                              Progression →
                            </Link>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {isCardio
                            ? activite?.label || exo.activite_cardio
                            : `${exo.series}×${exo.repetitions}${exo.poids_charge_kg > 0 ? ` · ${exo.poids_charge_kg}kg` : ''} · ${exo.repos_secondes}s`}
                        </p>
                        {!isCardio && poidsCorps && (
                          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--orange)' }}>
                            ~{kcalExo(exo, exo.series)} kcal
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button onClick={() => ouvrirEdition(exo)}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>✏️</button>
                        <button onClick={() => supprimerExercice(exo.id, exo.nom)} style={{ color: 'var(--text-faint)' }}>✕</button>
                      </div>
                    </div>

                    {isCardio && !termine && cardioEnCours?.id !== exo.id && (
                      <button onClick={() => setCardioEnCours(exo)} className="btn-primary text-sm py-2 mt-3 w-full">
                        Enregistrer ma séance cardio
                      </button>
                    )}
                    {isCardio && termine && <p className="text-sm font-semibold mt-3 text-green-500">✓ Séance enregistrée</p>}

                    {!isCardio && !termine && (
                      <div className="mt-3 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="label">Reps série {fait + 1}</label>
                          <input type="number" min="1"
                            value={repsReelles[exo.id] ?? exo.repetitions}
                            onChange={(e) => setRepsReelles((r) => ({ ...r, [exo.id]: e.target.value }))}
                            className="input text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="label">Poids (kg)</label>
                          <input type="number" step="0.5" min="0"
                            value={poidsSerieEnCours[exo.id] || ''}
                            onChange={(e) => setPoidsSerieEnCours((p) => ({ ...p, [exo.id]: e.target.value }))}
                            className="input text-sm" placeholder="0" />
                        </div>
                        <button onClick={() => terminerSerie(exo)}
                          className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
                          Série {fait + 1} ✓
                        </button>
                      </div>
                    )}
                    {!isCardio && termine && <p className="text-sm font-semibold mt-3 text-green-500">✓ {exo.series} séries terminées</p>}
                    {!isCardio && (
                      <div className="flex gap-1 mt-3">
                        {Array.from({ length: exo.series }).map((_, i) => (
                          <div key={i} className="flex-1 h-1.5 rounded-full"
                            style={{ background: i < fait ? '#22c55e' : 'var(--surface-2)' }} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {timerActif && !isCardio && (
                <RestTimer key={`${exo.id}-${fait}`} dureeSecondes={exoActifTimer.duree} onTermine={() => {}} />
              )}
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
          {/* Toggle Muscu / Cardio */}
          <div className="flex gap-2">
            {[['muscu', '🏋️ Musculation'], ['cardio', '🏃 Cardio']].map(([t, label]) => (
              <button key={t} type="button" onClick={() => setTypeForm(t)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{
                  background: typeForm === t ? 'var(--orange)' : 'var(--surface-2)',
                  color: typeForm === t ? 'white' : 'var(--text-muted)',
                }}>
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Nom</label>
            <AutocompleteInput value={nom} onChange={setNom} suggestions={nomsExistants}
              placeholder={typeForm === 'cardio' ? 'Ex: Sortie natation matinale' : 'Ex: Squat, Développé couché...'} />
          </div>

          {typeForm === 'cardio' ? (
            <div>
              <label className="label">Activité</label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITES_CARDIO.map((a) => (
                  <button key={a.id} type="button" onClick={() => setActiviteCardio(a.id)}
                    className="text-left px-3 py-2 rounded-xl text-sm"
                    style={{
                      background: activiteCardio === a.id ? 'var(--orange)' : 'var(--surface-2)',
                      color: activiteCardio === a.id ? 'white' : 'var(--text)',
                    }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="flex-1"><label className="label">Séries</label>
                  <input type="number" min="1" value={series} onChange={(e) => setSeries(e.target.value)} className="input" /></div>
                <div className="flex-1"><label className="label">Répétitions</label>
                  <input type="number" min="1" value={repetitions} onChange={(e) => setRepetitions(e.target.value)} className="input" /></div>
                <div className="flex-1"><label className="label">Repos (s)</label>
                  <input type="number" min="0" step="5" value={repos} onChange={(e) => setRepos(e.target.value)} className="input" /></div>
              </div>
              <div>
                <label className="label">Poids par défaut (kg) — optionnel</label>
                <input type="number" min="0" step="0.5" value={poidsCharge}
                  onChange={(e) => setPoidsCharge(e.target.value)} className="input" placeholder="Ex: 20" />
              </div>
            </>
          )}

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
