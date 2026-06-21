'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { calculerCaloriesCible, NIVEAUX_ACTIVITE, OBJECTIFS } from '@/lib/calculs'
import JaugeCalories from '@/app/components/JaugeCalories'

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

function aujourdHui() {
  return new Date().toISOString().split('T')[0]
}

export default function Profil() {
  // Mesures (poids/taille)
  const [poids, setPoids] = useState('')
  const [taille, setTaille] = useState('')
  const [historique, setHistorique] = useState([])

  // Profil métabolisme
  const [age, setAge] = useState('')
  const [sexe, setSexe] = useState('homme')
  const [niveauActivite, setNiveauActivite] = useState('modere')
  const [objectif, setObjectif] = useState('maintien')
  const [profilExiste, setProfilExiste] = useState(false)

  // Calories consommées aujourd'hui (somme des repas sélectionnés)
  const [caloriesConsommees, setCaloriesConsommees] = useState(0)

  const [loading, setLoading] = useState(true)
  const [editionProfil, setEditionProfil] = useState(false)

  useEffect(() => {
    chargerTout()
  }, [])

  async function chargerTout() {
    setLoading(true)

    // Mesures
    const { data: mesures } = await supabase
      .from('mesures')
      .select('*')
      .order('date_mesure', { ascending: false })
      .limit(10)
    setHistorique(mesures || [])
    if (mesures && mesures[0]) {
      setPoids(mesures[0].poids_kg)
      setTaille(mesures[0].taille_cm)
    }

    // Profil métabolisme (le plus récent)
    const { data: profils } = await supabase
      .from('profil')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)

    if (profils && profils[0]) {
      setAge(profils[0].age)
      setSexe(profils[0].sexe)
      setNiveauActivite(profils[0].niveau_activite)
      setObjectif(profils[0].objectif)
      setProfilExiste(true)
    } else {
      setEditionProfil(true) // pas de profil -> on ouvre direct le formulaire
    }

    // Calories consommées aujourd'hui via les repas sélectionnés
    const { data: repasJour } = await supabase
      .from('repas')
      .select('*, options_repas(kcal)')
      .eq('date_repas', aujourdHui())

    const total = (repasJour || []).reduce((acc, r) => {
      return acc + (r.options_repas?.kcal || 0)
    }, 0)
    setCaloriesConsommees(total)

    setLoading(false)
  }

  async function enregistrerMesure(e) {
    e.preventDefault()
    if (!poids || !taille) return
    const { error } = await supabase.from('mesures').insert([{
      poids_kg: Number(poids),
      taille_cm: Number(taille),
    }])
    if (!error) chargerTout()
  }

  async function enregistrerProfil(e) {
    e.preventDefault()
    if (!age || !poids || !taille) return

    const { error } = await supabase.from('profil').insert([{
      age: Number(age),
      sexe,
      niveau_activite: niveauActivite,
      objectif,
    }])
    if (!error) {
      setProfilExiste(true)
      setEditionProfil(false)
      chargerTout()
    }
  }

  const imcActuel = poids && taille ? calculerIMC(Number(poids), Number(taille)) : null
  const cat = imcActuel ? categorieIMC(imcActuel) : null

  const resultatCalories = (poids && taille && age && profilExiste)
    ? calculerCaloriesCible({
        poids: Number(poids),
        taille: Number(taille),
        age: Number(age),
        sexe,
        niveauActivite,
        objectif,
      })
    : null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Mon profil</h1>
      <p className="text-gray-500 mb-6">IMC, métabolisme et objectif calorique</p>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : (
        <>
          {/* Jauge de calories du jour, affichée seulement si profil complet */}
          {resultatCalories && !editionProfil && (
            <div className="mb-6">
              <JaugeCalories
                consomme={caloriesConsommees}
                objectif={resultatCalories.caloriesCible}
              />
              <div className="flex gap-2 mt-3 text-xs text-gray-500 justify-center">
                <span>Métabolisme de base : {resultatCalories.bmr} kcal</span>
                <span>·</span>
                <span>Dépense totale : {resultatCalories.tdee} kcal</span>
              </div>
            </div>
          )}

          {/* Formulaire mesures poids/taille */}
          <form onSubmit={enregistrerMesure} className="card flex flex-col gap-3 mb-4">
            <p className="font-semibold text-sm">Mesures</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Poids (kg)</label>
                <input
                  type="number" step="0.1" value={poids}
                  onChange={(e) => setPoids(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full"
                  placeholder="70"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Taille (cm)</label>
                <input
                  type="number" value={taille}
                  onChange={(e) => setTaille(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full"
                  placeholder="175"
                />
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

          {/* Formulaire profil métabolisme */}
          {!editionProfil ? (
            <button
              onClick={() => setEditionProfil(true)}
              className="w-full text-sm text-gray-500 underline text-center mb-6"
            >
              Modifier mon profil (âge, activité, objectif)
            </button>
          ) : (
            <form onSubmit={enregistrerProfil} className="card flex flex-col gap-3 mb-6">
              <p className="font-semibold text-sm">Profil & objectif</p>

              <div>
                <label className="text-xs text-gray-500">Âge</label>
                <input
                  type="number" value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Sexe</label>
                <div className="flex gap-2">
                  {['homme', 'femme'].map((s) => (
                    <button
                      type="button" key={s}
                      onClick={() => setSexe(s)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize ${
                        sexe === s ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Niveau d'activité</label>
                <div className="flex flex-col gap-2">
                  {NIVEAUX_ACTIVITE.map((n) => (
                    <button
                      type="button" key={n.value}
                      onClick={() => setNiveauActivite(n.value)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm ${
                        niveauActivite === n.value ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
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
                    <button
                      type="button" key={o.value}
                      onClick={() => setObjectif(o.value)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm ${
                        objectif === o.value ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      <p className="font-medium">{o.label}</p>
                      <p className={`text-xs ${objectif === o.value ? 'text-orange-100' : 'text-gray-400'}`}>{o.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary text-sm py-2 mt-2">
                {profilExiste ? 'Mettre à jour' : 'Calculer mon objectif'}
              </button>
            </form>
          )}

          {/* Historique des mesures */}
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2">Historique des mesures</p>
            {historique.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Aucune mesure enregistrée.</p>
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
    </div>
  )
}
