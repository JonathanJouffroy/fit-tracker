'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { calculerCaloriesCible, calculerCaloriesExercice, NIVEAUX_ACTIVITE, OBJECTIFS } from '@/lib/calculs'
import JaugeCalories from '@/app/components/JaugeCalories'
import CourbeObjectifPoids from '@/app/components/CourbeObjectifPoids'
import Header from '@/app/components/Header'
import { useToast } from '@/app/components/Toast'
import { SkeletonJauge, SkeletonGraphique, SkeletonListe } from '@/app/components/Skeleton'

function calculerIMC(poids, taille) {
  const tailleM = taille / 100
  return poids / (tailleM * tailleM)
}

function categorieIMC(imc) {
  if (imc < 18.5) return { label: 'Insuffisance pondérale', color: 'text-blue-500' }
  if (imc < 25) return { label: 'Corpulence normale', color: 'text-green-500' }
  if (imc < 30) return { label: 'Surpoids', color: 'text-orange-500' }
  return { label: 'Obésité', color: 'text-red-500' }
}

function formatDate(d) { return d.toISOString().split('T')[0] }
function labelJour(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
}

export default function Profil() {
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [poids, setPoids] = useState('')
  const [taille, setTaille] = useState('')
  const [historique, setHistorique] = useState([])
  const [age, setAge] = useState('')
  const [sexe, setSexe] = useState('homme')
  const [niveauActivite, setNiveauActivite] = useState('modere')
  const [objectif, setObjectif] = useState('maintien')
  const [profilId, setProfilId] = useState(null)
  const [caloriesConsommees, setCaloriesConsommees] = useState(0)
  const [caloriesBrulees, setCaloriesBrulees] = useState(0)
  const [calories7jours, setCalories7jours] = useState([]) // [{date, consomme, brule}]
  const [caloriesMois, setCaloriesMois] = useState([])    // [{date, consomme, brule}]
  const [loading, setLoading] = useState(true)
  const [editionProfil, setEditionProfil] = useState(false)
  const [poidsCible, setPoidsCible] = useState('')
  const [dateCible, setDateCible] = useState('')
  const [objectifPoidsId, setObjectifPoidsId] = useState(null)
  const [showFormObjectif, setShowFormObjectif] = useState(false)
  const toast = useToast()

  async function seDeconnecter() {
    if (!confirm('Se déconnecter ?')) return
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  useEffect(() => { chargerTout() }, [])

  async function chargerTout() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Mesures — tri par created_at pour garantir la plus récente même si même date
    const { data: mesures } = await supabase.from('mesures').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setHistorique(mesures || [])
    const derniereMesure = mesures?.[0]
    if (derniereMesure) { setPoids(derniereMesure.poids_kg); setTaille(derniereMesure.taille_cm) }

    // Profil
    const { data: profil } = await supabase.from('profil').select('*')
      .eq('user_id', user.id).single()
    if (profil) {
      setAge(profil.age); setSexe(profil.sexe)
      setNiveauActivite(profil.niveau_activite); setObjectif(profil.objectif)
      setProfilId(profil.id)
    }

    // Calories consommées aujourd'hui
    const today = formatDate(new Date())
    const { data: repasJour } = await supabase.from('repas')
      .select('*, options_repas(kcal)').eq('user_id', user.id).eq('date_repas', today)
    const totalConso = (repasJour || []).reduce((acc, r) => {
      return acc + (r.options_repas?.kcal || r.kcal_libre || 0)
    }, 0)
    setCaloriesConsommees(totalConso)

    const poidsCorps = derniereMesure?.poids_kg

    // Charger TOUS les exercices de l'utilisateur en une seule requête
    // (évite les joins RLS qui échouent silencieusement sur seances_log → exercices)
    const { data: tousExercices } = await supabase.from('exercices')
      .select('id, repetitions, poids_charge_kg').eq('user_id', user.id)
    const exoParId = {}
    tousExercices?.forEach((e) => { exoParId[e.id] = e })

    // Fonction utilitaire : calcule les kcal brûlées depuis une liste de logs
    function calcBrule(logs, poidsC) {
      if (!poidsC || !logs?.length) return 0
      const parExo = {}
      logs.forEach((l) => {
        const exo = exoParId[l.exercice_id]
        if (!exo) return
        if (!parExo[l.exercice_id]) parExo[l.exercice_id] = { count: 0, exo }
        parExo[l.exercice_id].count += 1
      })
      return Object.values(parExo).reduce((acc, { count, exo }) =>
        acc + calculerCaloriesExercice({ series: count, repetitions: exo.repetitions, poidsCharge: exo.poids_charge_kg, poidsCorps: poidsC }), 0)
    }

    // Calories brûlées aujourd'hui
    const { data: logsJour } = await supabase.from('seances_log')
      .select('exercice_id').eq('user_id', user.id).eq('date_seance', today)
    setCaloriesBrulees(calcBrule(logsJour, poidsCorps))

    // ---- Historique 7 derniers jours ----
    const dates7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); return formatDate(d)
    })

    const [{ data: repas7 }, { data: logs7 }] = await Promise.all([
      supabase.from('repas').select('date_repas, options_repas(kcal)')
        .eq('user_id', user.id).gte('date_repas', dates7[0]).lte('date_repas', dates7[6]),
      supabase.from('seances_log').select('date_seance, exercice_id')
        .eq('user_id', user.id).gte('date_seance', dates7[0]).lte('date_seance', dates7[6]),
    ])

    const stat7 = dates7.map((date) => ({
      date,
      consomme: (repas7 || []).filter(r => r.date_repas === date).reduce((a, r) => a + (r.options_repas?.kcal || r.kcal_libre || 0), 0),
      brule: calcBrule((logs7 || []).filter(l => l.date_seance === date), poidsCorps),
    }))
    setCalories7jours(stat7)

    // ---- Historique mois en cours ----
    const debutMois = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const [{ data: repasMois }, { data: logsMois }] = await Promise.all([
      supabase.from('repas').select('date_repas, options_repas(kcal)')
        .eq('user_id', user.id).gte('date_repas', debutMois),
      supabase.from('seances_log').select('date_seance, exercice_id')
        .eq('user_id', user.id).gte('date_seance', debutMois),
    ])

    const joursUniques = [...new Set([
      ...(repasMois || []).map(r => r.date_repas),
      ...(logsMois || []).map(l => l.date_seance),
    ])].sort().reverse()

    const statMois = joursUniques.map((date) => ({
      date,
      consomme: (repasMois || []).filter(r => r.date_repas === date).reduce((a, r) => a + (r.options_repas?.kcal || r.kcal_libre || 0), 0),
      brule: calcBrule((logsMois || []).filter(l => l.date_seance === date), poidsCorps),
    }))
    setCaloriesMois(statMois)

    // ---- Objectif de poids ----
    const { data: objPoids } = await supabase.from('objectif_poids')
      .select('*').eq('user_id', user.id).single()
    if (objPoids) {
      setPoidsCible(objPoids.poids_cible_kg)
      setDateCible(objPoids.date_cible)
      setObjectifPoidsId(objPoids.id)
    }

    setLoading(false)
  }

  async function enregistrerObjectifPoids(e) {
    e.preventDefault()
    if (!poidsCible || !dateCible || !userId) return
    await supabase.from('objectif_poids').upsert({
      user_id: userId,
      poids_cible_kg: Number(poidsCible),
      date_cible: dateCible,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setShowFormObjectif(false)
    toast('Objectif enregistré ✓')
    chargerTout()
  }

  async function enregistrerMesure(e) {
    e.preventDefault()
    if (!poids || !taille || !userId) return
    const { error } = await supabase.from('mesures').insert([{
      user_id: userId, poids_kg: Number(poids), taille_cm: Number(taille)
    }])
    if (!error) {
      toast('Mesure enregistrée ✓')
      await chargerTout()
    }
  }

  async function enregistrerProfil(e) {
    e.preventDefault()
    if (!age || !userId) return
    await supabase.from('profil').upsert({
      ...(profilId ? { id: profilId } : {}),
      user_id: userId, age: Number(age), sexe, niveau_activite: niveauActivite, objectif,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setEditionProfil(false)
    chargerTout()
  }

  const imcActuel = poids && taille ? calculerIMC(Number(poids), Number(taille)) : null
  const cat = imcActuel ? categorieIMC(imcActuel) : null
  const resultatCalories = (poids && taille && age && profilId)
    ? calculerCaloriesCible({ poids: Number(poids), taille: Number(taille), age: Number(age), sexe, niveauActivite, objectif })
    : null

  // Échelle max pour le graphique
  const maxVal = Math.max(...calories7jours.map(d => Math.max(d.consomme, d.brule)), resultatCalories?.caloriesCible || 0, 100)

  return (
    <div>
      <Header title="Mon profil" subtitle="IMC, métabolisme & calories" />

      {loading ? (
        <>
          <SkeletonJauge />
          <SkeletonGraphique />
          <SkeletonListe nb={3} lignes={2} />
        </>
      ) : (
        <>
          {/* Jauge calories du jour */}
          {resultatCalories && !editionProfil && (
            <div className="mb-6">
              <JaugeCalories consomme={caloriesConsommees} objectif={resultatCalories.caloriesCible} />
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs text-gray-500 justify-center">
                <span>BMR : {resultatCalories.bmr} kcal</span>
                <span>· TDEE : {resultatCalories.tdee} kcal</span>
                <span>· Objectif : {resultatCalories.caloriesCible} kcal</span>
                {caloriesBrulees > 0 && <span className="text-green-600 font-medium">· 🔥 {caloriesBrulees} kcal brûlées</span>}
              </div>
            </div>
          )}

          {/* Courbe objectif de poids */}
          {poidsCible && dateCible && historique.length > 0 && (
            <CourbeObjectifPoids
              mesures={[...historique].reverse()}
              poidsDepart={historique[historique.length - 1]?.poids_kg || Number(poids)}
              poidsCible={Number(poidsCible)}
              dateDebut={historique[historique.length - 1]?.date_mesure || new Date().toISOString().split('T')[0]}
              dateCible={dateCible}
            />
          )}

          {/* Formulaire objectif de poids */}
          {!showFormObjectif ? (
            <button onClick={() => setShowFormObjectif(true)}
              className="w-full text-sm underline text-center mb-4"
              style={{ color: 'var(--text-muted)' }}>
              {poidsCible ? `Objectif : ${poidsCible}kg avant le ${new Date(dateCible + 'T12:00:00').toLocaleDateString('fr-FR')} · Modifier` : '+ Définir un objectif de poids'}
            </button>
          ) : (
            <form onSubmit={enregistrerObjectifPoids} className="card mb-4 flex flex-col gap-3">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Objectif de poids</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">Poids cible (kg)</label>
                  <input type="number" step="0.1" value={poidsCible}
                    onChange={(e) => setPoidsCible(e.target.value)}
                    className="input" placeholder="65" required />
                </div>
                <div className="flex-1">
                  <label className="label">Date limite</label>
                  <input type="date" value={dateCible}
                    onChange={(e) => setDateCible(e.target.value)}
                    className="input" required
                    min={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowFormObjectif(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary text-sm py-2">
                  Enregistrer
                </button>
              </div>
            </form>
          )}

          {/* Graphique 7 derniers jours */}
          {calories7jours.length > 0 && (
            <div className="card mb-4">
              <p className="font-semibold text-sm mb-3">7 derniers jours</p>
              <div className="flex items-end gap-1 h-28">
                {calories7jours.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '88px' }}>
                      {d.consomme > 0 && (
                        <div className="w-full rounded-t bg-orange-400"
                          style={{ height: `${Math.round((d.consomme / maxVal) * 88)}px` }}
                          title={`${d.consomme} kcal mangées`} />
                      )}
                      {d.brule > 0 && (
                        <div className="w-full rounded-t bg-green-400"
                          style={{ height: `${Math.round((d.brule / maxVal) * 88)}px` }}
                          title={`${d.brule} kcal brûlées`} />
                      )}
                      {d.consomme === 0 && d.brule === 0 && (
                        <div className="w-full rounded-t bg-gray-100" style={{ height: '4px' }} />
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400 text-center leading-tight">{labelJour(d.date)}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-gray-500 justify-center">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-400 inline-block" />Mangées</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400 inline-block" />Brûlées</span>
              </div>
            </div>
          )}

          {/* Liste mois en cours */}
          {caloriesMois.length > 0 && (
            <div className="card mb-6">
              <p className="font-semibold text-sm mb-3">Mois en cours</p>
              <div className="flex flex-col gap-2">
                {caloriesMois.map((d) => (
                  <div key={d.date} className="flex items-center justify-between text-sm">
                    <p className="text-gray-500 w-24">{new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <div className="flex gap-3 text-xs">
                      {d.consomme > 0 && <span className="text-orange-600 font-medium">{d.consomme} kcal 🍽️</span>}
                      {d.brule > 0 && <span className="text-green-600 font-medium">{d.brule} kcal 🔥</span>}
                      {d.consomme === 0 && d.brule === 0 && <span className="text-gray-300">—</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulaire mesures */}
          <form onSubmit={enregistrerMesure} className="card flex flex-col gap-3 mb-4">
            <p className="font-semibold text-sm">Mesures</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Poids (kg)</label>
                <input type="number" step="0.1" value={poids} onChange={(e) => setPoids(e.target.value)} className="border rounded-lg px-3 py-2 w-full" placeholder="70" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Taille (cm)</label>
                <input type="number" value={taille} onChange={(e) => setTaille(e.target.value)} className="border rounded-lg px-3 py-2 w-full" placeholder="175" />
              </div>
            </div>
            <button type="submit" className="btn-primary text-sm py-2">Enregistrer la mesure</button>
          </form>

          {imcActuel && (
            <div className="card flex flex-col items-center gap-1 mb-4 py-3">
              <p className="text-xs text-gray-500">IMC</p>
              <p className="text-3xl font-bold">{imcActuel.toFixed(1)}</p>
              <p className={`text-sm font-semibold ${cat.color}`}>{cat.label}</p>
            </div>
          )}

          {!editionProfil ? (
            <button onClick={() => setEditionProfil(true)} className="w-full text-sm text-gray-500 underline text-center mb-6">
              Modifier mon profil (âge, activité, objectif)
            </button>
          ) : (
            <form onSubmit={enregistrerProfil} className="card flex flex-col gap-3 mb-6">
              <p className="font-semibold text-sm">Profil & objectif</p>
              <div>
                <label className="text-xs text-gray-500">Âge</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="border rounded-lg px-3 py-2 w-full" placeholder="30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Sexe</label>
                <div className="flex gap-2">
                  {['homme', 'femme'].map((s) => (
                    <button type="button" key={s} onClick={() => setSexe(s)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize ${sexe === s ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Niveau d'activité</label>
                <div className="flex flex-col gap-2">
                  {NIVEAUX_ACTIVITE.map((n) => (
                    <button type="button" key={n.value} onClick={() => setNiveauActivite(n.value)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm ${niveauActivite === n.value ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      <p className="font-medium">{n.label}</p>
                      <p className={`text-xs ${niveauActivite === n.value ? 'text-orange-100' : 'text-gray-400'}`}>{n.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Objectif</label>
                <div className="flex flex-col gap-2">
                  {OBJECTIFS.map((o) => (
                    <button type="button" key={o.value} onClick={() => setObjectif(o.value)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm ${objectif === o.value ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      <p className="font-medium">{o.label}</p>
                      <p className={`text-xs ${objectif === o.value ? 'text-orange-100' : 'text-gray-400'}`}>{o.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditionProfil(false)} className="flex-1 py-2 rounded-xl bg-gray-100 text-sm font-medium">Annuler</button>
                <button type="submit" className="flex-1 btn-primary text-sm py-2">Enregistrer</button>
              </div>
            </form>
          )}

          {/* Historique mesures */}
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2">Historique des mesures</p>
            {historique.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Aucune mesure enregistrée.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {historique.map((m) => {
                  const imc = calculerIMC(m.poids_kg, m.taille_cm)
                  const c = categorieIMC(imc)
                  return (
                    <div key={m.id} className="card flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{m.poids_kg} kg · {m.taille_cm} cm</p>
                        <p className="text-xs text-gray-400">{new Date(m.date_mesure).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <p className={`font-semibold ${c.color}`}>{imc.toFixed(1)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Bouton déconnexion */}
      <button onClick={seDeconnecter}
        className="w-full mt-6 py-3 rounded-xl text-sm font-medium"
        style={{ background: 'var(--surface-2)', color: '#ef4444', border: '1px solid #fee2e2' }}>
        Déconnexion
      </button>
    </div>
  )
}
