'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import RestTimer from '@/app/components/RestTimer'
import TimerSeance from '@/app/components/TimerSeance'
import AutocompleteInput from '@/app/components/AutocompleteInput'
import FormCardio from '@/app/components/FormCardio'
import GifExercice from '@/app/components/GifExercice'
import Drawer from '@/app/components/Drawer'
import CircuitMode from '@/app/components/CircuitMode'
import { useToast } from '@/app/components/Toast'
import { SkeletonExercice } from '@/app/components/Skeleton'
import { ErreurChargement } from '@/app/components/Erreur'
import { calculerCaloriesExercice, calculerCaloriesCardio, ACTIVITES_CARDIO } from '@/lib/calculs'
import CoachSuggestion from '@/app/components/CoachSuggestion'


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
  const [nomsExistants, setNomsExistants] = useState([])
  const [idsByNom, setIdsByNom] = useState({})
  const [cardioEnCours, setCardioEnCours] = useState(null)
  const [drawerExo, setDrawerExo] = useState(null)
  const [kcalCardioTotal, setKcalCardioTotal] = useState(0)
  const [kcalCircuitTotal, setKcalCircuitTotal] = useState(0)
  const [logsJourMemo, setLogsJourMemo] = useState([])
  const [circuitEnCours, setCircuitEnCours] = useState(null)
  const [circuits, setCircuits] = useState([])
  const [dragId, setDragId] = useState(null) // id de l'exercice en cours de déplacement

  // Formulaire ajout
  const [showForm, setShowForm] = useState(false)
  const [typeForm, setTypeForm] = useState('muscu')
  const [nom, setNom] = useState('')
  const [series, setSeries] = useState(3)
  const [repetitions, setRepetitions] = useState(10)
  const [repos, setRepos] = useState(60)
  const [poidsCharge, setPoidsCharge] = useState('')
  const [activiteCardio, setActiviteCardio] = useState('natation')

  // Formulaire circuit
  const [nomCircuit, setNomCircuit] = useState('')
  const [toursCircuit, setToursCircuit] = useState(3)
  const [reposEntreExos, setReposEntreExos] = useState(15)
  const [reposEntreTours, setReposEntreTours] = useState(60)
  const [exosCircuitForm, setExosCircuitForm] = useState([
    { id: Date.now(), nom: '', repetitions: '', duree_secondes: '' }
  ])

  // Formulaire édition
  const [exoEnEdition, setExoEnEdition] = useState(null)
  const [editNom, setEditNom] = useState('')
  const [editSeries, setEditSeries] = useState(3)
  const [editRepetitions, setEditRepetitions] = useState(10)
  const [editRepos, setEditRepos] = useState(60)
  const [editPoidsCharge, setEditPoidsCharge] = useState('')
  const [editNote, setEditNote] = useState('')

  const d = new Date()
  const dateLocale = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const storageKey = `seance-${jourId}-${dateLocale}`

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

      // Cache localStorage pour la table jours (données statiques)
      const cacheKey = `jour-${jourId}`
      let jourData = null
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) jourData = JSON.parse(cached)
      } catch {}

      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      const [
        { data: exosData },
        { data: mesures },
        { data: tousExos },
        { data: circuitsData },
        jourResult,
      ] = await Promise.race([
        Promise.all([
          supabase.from('exercices').select('*').eq('jour_id', jourId).eq('user_id', user.id).order('ordre'),
          supabase.from('mesures').select('poids_kg').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('exercices').select('id, nom').eq('user_id', user.id),
          supabase.from('circuits').select('*, circuit_exercices(*)').eq('user_id', user.id).eq('jour_id', jourId).order('created_at'),
          jourData ? Promise.resolve(null) : supabase.from('jours').select('*').eq('id', jourId).single(),
        ]),
        timeout,
      ])

      // Mettre à jour le cache si on vient de charger le jour
      if (jourResult?.data) {
        jourData = jourResult.data
        try { localStorage.setItem(cacheKey, JSON.stringify(jourData)) } catch {}
      }

      setJour(jourData)
      setExercices(exosData || [])
      setPoidsCorps(mesures?.[0]?.poids_kg || null)
      setCircuits(circuitsData || [])

      // Charger les logs du jour pour initialiser seriesFaites et kcalCardioTotal
      const { data: logsJour } = await supabase.from('seances_log')
        .select('exercice_id, serie_numero, kcal, duree_minutes')
        .eq('user_id', user.id)
        .eq('date_seance', (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })())

      if (logsJour?.length) {
        const sf = {}
        let kcalCardio = 0
        logsJour.forEach(l => {
          if (!sf[l.exercice_id]) sf[l.exercice_id] = 0
          sf[l.exercice_id]++
          if (l.kcal) kcalCardio += l.kcal
        })
        setSeriesFaites(sf)
        setKcalCardioTotal(kcalCardio)
        setLogsJourMemo(logsJour)
      }

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
    return `/progression/exercice/${ids[0]}?nom=${encodeURIComponent(exo.nom)}`
  }

  async function ajouterCircuit(e) {
    e.preventDefault()
    const exosValides = exosCircuitForm.filter(ex => ex.nom.trim())
    if (!nomCircuit.trim() || exosValides.length < 2) return

    const { data: circuit, error } = await supabase.from('circuits').insert([{
      user_id: userId,
      jour_id: Number(jourId),
      nom: nomCircuit.trim(),
      tours: toursCircuit,
      repos_entre_exos: reposEntreExos,
      repos_entre_tours: reposEntreTours,
    }]).select().single()

    if (error) { toast('Erreur lors de la création du circuit', 'error'); return }

    const exosInsert = exosValides.map((ex, i) => ({
      circuit_id: circuit.id,
      nom: ex.nom.trim(),
      repetitions: ex.repetitions ? Number(ex.repetitions) : null,
      duree_secondes: ex.duree_secondes ? Number(ex.duree_secondes) : null,
      ordre: i,
    }))
    await supabase.from('circuit_exercices').insert(exosInsert)

    toast(`Circuit "${nomCircuit}" créé ✓`)
    setShowForm(false)
    setNomCircuit('')
    setToursCircuit(3)
    setReposEntreExos(15)
    setReposEntreTours(60)
    setExosCircuitForm([{ id: Date.now(), nom: '', repetitions: '', duree_secondes: '' }])
    chargerTout()
  }

  async function supprimerCircuit(circuitId, circuitNom) {
    if (!confirm(`Supprimer le circuit "${circuitNom}" ?`)) return
    await supabase.from('circuits').delete().eq('id', circuitId)
    setCircuits(prev => prev.filter(c => c.id !== circuitId))
    toast(`Circuit supprimé`)
  }

  function ajouterExoCircuit() {
    setExosCircuitForm(prev => [...prev, { id: Date.now(), nom: '', repetitions: '', duree_secondes: '' }])
  }

  function modifierExoCircuit(id, champ, valeur) {
    setExosCircuitForm(prev => prev.map(ex => ex.id === id ? { ...ex, [champ]: valeur } : ex))
  }

  function supprimerExoCircuit(id) {
    setExosCircuitForm(prev => prev.filter(ex => ex.id !== id))
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
    setEditNote(exo.note || '')
    setShowForm(false)
  }

  async function sauvegarderEdition(e) {
    e.preventDefault()
    if (!editNom.trim() || !exoEnEdition) return
    const { error } = await supabase.from('exercices').update({
      nom: editNom, series: Number(editSeries),
      repetitions: Number(editRepetitions), repos_secondes: Number(editRepos),
      poids_charge_kg: editPoidsCharge ? Number(editPoidsCharge) : 0,
      note: editNote.trim() || null,
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

  async function deplacerExercice(idSource, idCible) {
    if (idSource === idCible) return
    const liste = [...exercices]
    const iSource = liste.findIndex(e => e.id === idSource)
    const iCible = liste.findIndex(e => e.id === idCible)
    if (iSource === -1 || iCible === -1) return
    const [deplace] = liste.splice(iSource, 1)
    liste.splice(iCible, 0, deplace)
    setExercices(liste)
    // Persister le nouvel ordre en DB
    await Promise.all(liste.map((e, i) =>
      supabase.from('exercices').update({ ordre: i }).eq('id', e.id)
    ))
  }

  async function terminerSerie(exercice) {
    const fait = (seriesFaites[exercice.id] || 0) + 1
    setSeriesFaites((s) => ({ ...s, [exercice.id]: fait }))
    const poidsSerie = parseFloat(poidsSerieEnCours[exercice.id]) || null
    const repsEffectives = Number(repsReelles[exercice.id]) || exercice.repetitions
    await supabase.from('seances_log').insert([{
      user_id: userId, exercice_id: exercice.id, exercice_nom: exercice.nom,
      serie_numero: fait, repetitions_faites: repsEffectives, poids_kg: poidsSerie,
    }])
    setLogsJourMemo(prev => [...prev, {
      exercice_id: exercice.id,
      repetitions_faites: repsEffectives,
    }])
    if (fait < exercice.series) {
      setExoActifTimer({ exerciceId: exercice.id, duree: exercice.repos_secondes })
    } else {
      setExoActifTimer(null)
      toast(`${exercice.nom} terminé 💪`)
    }
  }

  async function terminerCardio(exo, metriques) {
    const kcalCardio = poidsCorps ? Math.round(calculerCaloriesCardio({
      activiteId: exo.activite_cardio,
      dureeMinutes: metriques.duree_minutes || 0,
      poidsCorps,
      deniveleM: metriques.denivele_m || 0,
    })) : 0

    // Insert minimal d'abord (sans les colonnes optionnelles)
    const { data: logData, error: erreurInsert } = await supabase
      .from('seances_log')
      .insert([{
        user_id: userId,
        exercice_id: exo.id,
        exercice_nom: exo.nom,
        serie_numero: 1,
        repetitions_faites: 0,
        poids_kg: null,
        duree_minutes: metriques.duree_minutes || null,
        distance_m: metriques.distance_m || null,
        denivele_m: metriques.denivele_m ? Math.round(metriques.denivele_m) : null,
        nb_sauts: metriques.nb_sauts ? Math.round(metriques.nb_sauts) : null,
        note_cardio: metriques.note_cardio || null,
        kcal: kcalCardio || null,
      }])
      .select('id')

    if (erreurInsert) {
      toast(`Erreur: ${erreurInsert.message}`, 'error')
      return
    }

    setSeriesFaites((s) => ({ ...s, [exo.id]: 1 }))
    setKcalCardioTotal((prev) => prev + (kcalCardio || 0))
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
    if (nbSeries === 0) return 0
    const reps = Number(repsReelles[exo.id]) || exo.repetitions
    // Calculer série par série (même méthode que l'historique)
    return calculerCaloriesExercice({ series: nbSeries, repetitions: reps, poidsCharge: exo.poids_charge_kg, poidsCorps })
  }

  const exosMuscu = exercices.filter(e => e.type_exercice !== 'cardio')
  const exosCardio = exercices.filter(e => e.type_exercice === 'cardio')
  const kcalPrevu = Math.round(exosMuscu.reduce((a, e) => a + kcalExo(e, e.series), 0))

  // Calcul en temps réel pendant la séance : seriesFaites × repsReelles
  const kcalMuscuFait = exosMuscu.reduce((total, exo) => {
    const nbFaites = seriesFaites[exo.id] || 0
    if (nbFaites === 0) return total
    const reps = Number(repsReelles[exo.id]) || exo.repetitions
    return total + calculerCaloriesExercice({
      series: nbFaites,
      repetitions: reps,
      poidsCharge: exo.poids_charge_kg || 0,
      poidsCorps,
    })
  }, 0)
  const kcalTotalFait = Math.round(kcalMuscuFait + kcalCardioTotal + kcalCircuitTotal)
  return (
    <>
    <div>
      <button onClick={() => router.push('/')} className="text-sm mb-3" style={{ color: 'var(--orange)' }}>← Retour</button>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>{jour?.nom}</h1>

      <TimerSeance jourId={jourId} />

      {!poidsCorps && (
        <p className="text-xs mb-3" style={{ color: 'var(--orange)' }}>
          Renseigne ton poids dans Profil pour voir les calories dépensées.
        </p>
      )}

      {poidsCorps && (exosMuscu.length > 0 || exosCardio.length > 0 || circuits.length > 0) && (
        <div className="card flex items-center justify-between mb-6 py-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Calories brûlées</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {kcalMuscuFait > 0 && `Muscu: ${Math.round(kcalMuscuFait)} kcal`}
              {kcalMuscuFait > 0 && kcalCardioTotal > 0 && ' · '}
              {kcalCardioTotal > 0 && `Cardio: ${kcalCardioTotal} kcal`}
              {kcalCircuitTotal > 0 && (kcalMuscuFait > 0 || kcalCardioTotal > 0) && ' · '}
              {kcalCircuitTotal > 0 && `Circuit: ${kcalCircuitTotal} kcal`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>{kcalTotalFait}</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>/ {kcalPrevu} kcal prévues (muscu)</p>
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
            <div key={exo.id} className="flex flex-col gap-3"
              draggable
              onDragStart={() => setDragId(exo.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragId && dragId !== exo.id) deplacerExercice(dragId, exo.id) }}
              style={{ opacity: dragId === exo.id ? 0.5 : 1, cursor: 'grab' }}>
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
                    <div>
                      <label className="label">📝 Note personnelle</label>
                      <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Ex: Genou gauche fragile, prise large, gainage..."
                        rows={2} className="input resize-none text-sm" />
                    </div>
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
                            ~{Math.round(kcalExo(exo, exo.series))} kcal
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        {/* Bouton infos (note + technique) → ouvre le drawer */}
                        {(exo.note || !isCardio) && (
                          <button onClick={() => setDrawerExo(exo)}
                            className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                            style={{ background: 'var(--surface-2)', color: exo.note ? 'var(--orange)' : 'var(--text-faint)' }}>
                            {exo.note ? '📝' : 'ℹ️'}
                          </button>
                        )}
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

                    {!isCardio && (
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
                          className="text-sm py-2 px-4 whitespace-nowrap rounded-xl font-semibold"
                          style={{
                            background: termine ? 'var(--surface-2)' : 'var(--orange)',
                            color: termine ? 'var(--text-muted)' : 'white',
                          }}>
                          {termine ? `+ Série ${fait + 1}` : `Série ${fait + 1} ✓`}
                        </button>
                      </div>
                    )}
                    {!isCardio && termine && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                        ✓ {exo.series} séries prévues — tu peux en ajouter d'autres
                      </p>
                    )}
                    {!isCardio && (
                      <div className="flex gap-1 mt-3">
                        {Array.from({ length: Math.max(exo.series, fait) }).map((_, i) => (
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

        {exercices.length === 0 && circuits.length === 0 && (
          <p className="text-center py-8" style={{ color: 'var(--text-faint)' }}>
            Aucun exercice ce jour. Jour de repos ou ajoute-en un ci-dessous.
          </p>
        )}

        {/* Circuits */}
        {circuits.map(circuit => {
          const exosTriés = [...(circuit.circuit_exercices || [])].sort((a, b) => a.ordre - b.ordre)
          return (
            <div key={circuit.id} className="card" style={{ borderLeft: '3px solid var(--orange)' }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text)' }}>⚡ {circuit.nom}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {circuit.tours} tours · {exosTriés.length} exercices ·{' '}
                    {circuit.repos_entre_exos === 0 ? 'enchaîné' : `${circuit.repos_entre_exos}s entre exos`}
                  </p>
                </div>
                <button onClick={() => supprimerCircuit(circuit.id, circuit.nom)}
                  className="text-sm" style={{ color: 'var(--text-faint)' }}>✕</button>
              </div>
              <div className="flex flex-col gap-1 mb-3">
                {exosTriés.map((ex, i) => (
                  <div key={ex.id} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-xs text-center" style={{ color: 'var(--orange)' }}>{i + 1}</span>
                    <span style={{ color: 'var(--text)' }}>{ex.nom}</span>
                    <span style={{ color: 'var(--text-faint)' }}>
                      {ex.repetitions ? `${ex.repetitions} reps` : ''}
                      {ex.repetitions && ex.duree_secondes ? ' · ' : ''}
                      {ex.duree_secondes ? `${ex.duree_secondes}s` : ''}
                      {!ex.repetitions && !ex.duree_secondes ? '—' : ''}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setCircuitEnCours({ circuit, exos: exosTriés })}
                className="w-full btn-primary py-2 text-sm font-semibold">
                ▶ Démarrer le circuit
              </button>
            </div>
          )
        })}
      </div>

      {!showForm && !exoEnEdition ? (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full mt-6">+ Ajouter un exercice</button>
      ) : showForm && (
        <form onSubmit={typeForm === 'circuit' ? ajouterCircuit : ajouterExercice} className="card mt-6 flex flex-col gap-3">
          {/* Toggle Muscu / Cardio / Circuit */}
          <div className="flex gap-2">
            {[['muscu', '🏋️ Muscu'], ['cardio', '🏃 Cardio'], ['circuit', '⚡ Circuit']].map(([t, label]) => (
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

          {typeForm !== 'circuit' && (
            <div>
              <label className="label">Nom</label>
              <AutocompleteInput value={nom} onChange={setNom} suggestions={nomsExistants}
                placeholder={typeForm === 'cardio' ? 'Ex: Sortie natation matinale' : 'Ex: Squat, Développé couché...'} />
            </div>
          )}

          {typeForm === 'muscu' && nom.trim() && (
              <CoachSuggestion nomExercice={nom} userId={userId} />
          )}

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
          ) : typeForm === 'circuit' ? (
            <>
              {/* Nom du circuit */}
              <div>
                <label className="label">Nom du circuit</label>
                <input type="text" value={nomCircuit} onChange={e => setNomCircuit(e.target.value)}
                  className="input" placeholder="Ex: Circuit abdos, Cardio tabata..." required />
              </div>

              {/* Config globale */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label">Tours</label>
                  <input type="number" min="1" max="10" value={toursCircuit}
                    onChange={e => setToursCircuit(e.target.value)}
                    onBlur={e => setToursCircuit(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    className="input" />
                </div>
                <div className="flex-1">
                  <label className="label">Repos/tours (s)</label>
                  <input type="number" min="0" step="5" value={reposEntreTours}
                    onChange={e => setReposEntreTours(e.target.value)}
                    onBlur={e => setReposEntreTours(Math.max(0, Number(e.target.value) || 0))}
                    className="input" />
                </div>
              </div>

              {/* Repos entre exercices */}
              <div>
                <label className="label">Repos entre exercices (s) — 0 = enchaîner</label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 10, 15, 20, 30].map(s => (
                    <button key={s} type="button" onClick={() => setReposEntreExos(s)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium"
                      style={{
                        background: reposEntreExos === s ? 'var(--orange)' : 'var(--surface-2)',
                        color: reposEntreExos === s ? 'white' : 'var(--text-muted)',
                      }}>
                      {s === 0 ? '⚡ 0s' : `${s}s`}
                    </button>
                  ))}
                  <input type="number" min="0" max="120" value={reposEntreExos}
                    onChange={e => setReposEntreExos(e.target.value)}
                    onBlur={e => setReposEntreExos(Math.max(0, Number(e.target.value) || 0))}
                    className="input w-20 text-sm" />
                </div>
              </div>

              {/* Exercices du circuit */}
              <div>
                <label className="label">Exercices du circuit</label>
                <div className="flex flex-col gap-2">
                  {exosCircuitForm.map((ex, i) => (
                    <div key={ex.id} className="rounded-xl p-3 flex flex-col gap-2"
                      style={{ background: 'var(--surface-2)' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold w-5 text-center"
                          style={{ color: 'var(--orange)' }}>{i + 1}</span>
                        <input type="text" value={ex.nom}
                          onChange={e => modifierExoCircuit(ex.id, 'nom', e.target.value)}
                          className="input flex-1 text-sm" placeholder="Nom de l'exercice" />
                        {exosCircuitForm.length > 2 && (
                          <button type="button" onClick={() => supprimerExoCircuit(ex.id)}
                            className="text-sm" style={{ color: 'var(--text-faint)' }}>✕</button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs mb-1 block" style={{ color: 'var(--text-faint)' }}>
                            Reps (optionnel)
                          </label>
                          <input type="number" min="1" value={ex.repetitions}
                            onChange={e => modifierExoCircuit(ex.id, 'repetitions', e.target.value)}
                            className="input text-sm" placeholder="—" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs mb-1 block" style={{ color: 'var(--text-faint)' }}>
                            Durée en s (optionnel)
                          </label>
                          <input type="number" min="5" step="5" value={ex.duree_secondes}
                            onChange={e => modifierExoCircuit(ex.id, 'duree_secondes', e.target.value)}
                            className="input text-sm" placeholder="—" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={ajouterExoCircuit}
                    className="text-sm py-2 rounded-xl"
                    style={{ background: 'var(--surface-2)', color: 'var(--orange)' }}>
                    + Ajouter un exercice au circuit
                  </button>
                </div>
              </div>
            </>
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

    {/* Drawer infos exercice : note + technique */}
    <Drawer
      ouvert={!!drawerExo}
      onFermer={() => setDrawerExo(null)}
      titre={drawerExo?.nom || ''}>
      {drawerExo && (
        <div className="flex flex-col gap-4">
          {/* Note */}
          {drawerExo.note ? (
            <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--orange)' }}>📝 Ta note</p>
              <p className="text-sm italic" style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{drawerExo.note}</p>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
              Aucune note pour cet exercice. Ajoutes-en une via ✏️ pour noter tes sensations ou tes indications techniques.
            </p>
          )}

          {/* Technique */}
          {drawerExo.type_exercice !== 'cardio' && (
            <div>
              <GifExercice nomExercice={drawerExo.nom} />
            </div>
          )}
        </div>
      )}
    </Drawer>

    {/* Mode circuit — plein écran, après le Drawer */}
    {circuitEnCours && (
      <CircuitMode
        circuit={circuitEnCours.circuit}
        exosCircuit={circuitEnCours.exos}
        userId={userId}
        poidsCorps={poidsCorps}
        onTerminer={(kcalCircuit) => {
          setCircuitEnCours(null)
          if (kcalCircuit > 0) setKcalCircuitTotal(prev => prev + kcalCircuit)
          chargerTout()
        }}
      />
    )}
    </>
  )
}
