'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { NIVEAUX_ACTIVITE, OBJECTIFS } from '@/lib/calculs'

export default function Onboarding() {
  const router = useRouter()
  const supabase = createClient()

  const [poids, setPoids] = useState('')
  const [taille, setTaille] = useState('')
  const [age, setAge] = useState('')
  const [sexe, setSexe] = useState('homme')
  const [niveauActivite, setNiveauActivite] = useState('modere')
  const [objectif, setObjectif] = useState('maintien')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!poids || !taille || !age) { setErreur('Tous les champs sont obligatoires'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Enregistrer le profil
    const { error: profilError } = await supabase.from('profil').upsert({
      user_id: user.id,
      age: Number(age),
      sexe,
      niveau_activite: niveauActivite,
      objectif,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (profilError) { setErreur(profilError.message); setLoading(false); return }

    // Enregistrer la première mesure
    const { error: mesureError } = await supabase.from('mesures').insert([{
      user_id: user.id,
      poids_kg: Number(poids),
      taille_cm: Number(taille),
    }])

    if (mesureError) { setErreur(mesureError.message); setLoading(false); return }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-sm mx-auto">
        <div className="text-center mb-8">
          <p className="text-3xl mb-2">👤</p>
          <h1 className="text-xl font-bold">Crée ton profil</h1>
          <p className="text-gray-500 text-sm mt-1">Ces informations servent à calculer ton objectif calorique personnalisé</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Mesures */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
            <p className="font-semibold text-sm">Tes mesures</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Poids (kg)</label>
                <input type="number" step="0.1" value={poids} onChange={(e) => setPoids(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full" placeholder="70" required />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Taille (cm)</label>
                <input type="number" value={taille} onChange={(e) => setTaille(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full" placeholder="175" required />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Âge</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full" placeholder="30" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Sexe</label>
              <div className="flex gap-2">
                {['homme', 'femme'].map((s) => (
                  <button type="button" key={s} onClick={() => setSexe(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize ${
                      sexe === s ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Niveau d'activité */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2">
            <p className="font-semibold text-sm mb-1">Niveau d'activité</p>
            {NIVEAUX_ACTIVITE.map((n) => (
              <button type="button" key={n.value} onClick={() => setNiveauActivite(n.value)}
                className={`text-left px-3 py-2 rounded-lg border text-sm ${
                  niveauActivite === n.value ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                <p className="font-medium">{n.label}</p>
                <p className={`text-xs ${niveauActivite === n.value ? 'text-orange-100' : 'text-gray-400'}`}>{n.description}</p>
              </button>
            ))}
          </div>

          {/* Objectif */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2">
            <p className="font-semibold text-sm mb-1">Objectif</p>
            {OBJECTIFS.map((o) => (
              <button type="button" key={o.value} onClick={() => setObjectif(o.value)}
                className={`text-left px-3 py-2 rounded-lg border text-sm ${
                  objectif === o.value ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                <p className="font-medium">{o.label}</p>
                <p className={`text-xs ${objectif === o.value ? 'text-orange-100' : 'text-gray-400'}`}>{o.description}</p>
              </button>
            ))}
          </div>

          {erreur && <p className="text-red-500 text-sm text-center">{erreur}</p>}

          <button type="submit" disabled={loading}
            className="bg-orange-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50">
            {loading ? 'Enregistrement...' : 'Commencer mon programme 🚀'}
          </button>
        </form>
      </div>
    </div>
  )
}
