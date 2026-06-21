'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function Imc() {
  const [poids, setPoids] = useState('')
  const [taille, setTaille] = useState('')
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    charger()
  }, [])

  async function charger() {
    setLoading(true)
    const { data } = await supabase
      .from('mesures')
      .select('*')
      .order('date_mesure', { ascending: false })
      .limit(10)
    setHistorique(data || [])
    if (data && data[0]) {
      setPoids(data[0].poids_kg)
      setTaille(data[0].taille_cm)
    }
    setLoading(false)
  }

  async function enregistrer(e) {
    e.preventDefault()
    if (!poids || !taille) return
    const { error } = await supabase.from('mesures').insert([{
      poids_kg: Number(poids),
      taille_cm: Number(taille),
    }])
    if (!error) charger()
  }

  const imcActuel = poids && taille ? calculerIMC(Number(poids), Number(taille)) : null
  const cat = imcActuel ? categorieIMC(imcActuel) : null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Calcul IMC</h1>
      <p className="text-gray-500 mb-6">Indice de masse corporelle</p>

      <form onSubmit={enregistrer} className="card flex flex-col gap-3 mb-6">
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
        <button type="submit" className="btn-primary">Enregistrer la mesure</button>
      </form>

      {imcActuel && (
        <div className="card flex flex-col items-center gap-2 mb-6">
          <p className="text-sm text-gray-500">Ton IMC</p>
          <p className="text-4xl font-bold">{imcActuel.toFixed(1)}</p>
          <p className={`font-semibold ${cat.color}`}>{cat.label}</p>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-gray-500 mb-2">Historique</p>
        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : historique.length === 0 ? (
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
    </div>
  )
}
