'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { NIVEAUX_ACTIVITE, OBJECTIFS } from '@/lib/calculs'

const ETAPES = [
  { titre: 'Tes mesures', emoji: '📏', description: 'Pour calculer ton métabolisme de base' },
  { titre: 'Ton profil', emoji: '👤', description: 'Pour personnaliser tes recommandations' },
  { titre: 'Ton activité', emoji: '🏃', description: 'Pour estimer tes dépenses caloriques' },
  { titre: 'Ton objectif', emoji: '🎯', description: 'Pour adapter tes apports caloriques' },
]

export default function Onboarding() {
  const router = useRouter()
  const supabase = createClient()

  const [etape, setEtape] = useState(0)
  const [poids, setPoids] = useState('')
  const [taille, setTaille] = useState('')
  const [age, setAge] = useState('')
  const [sexe, setSexe] = useState('homme')
  const [niveauActivite, setNiveauActivite] = useState('modere')
  const [objectif, setObjectif] = useState('maintien')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  function etapeSuivante() {
    setErreur('')
    if (etape === 0) {
      if (!poids || !taille) { setErreur('Poids et taille sont obligatoires'); return }
      if (Number(poids) < 30 || Number(poids) > 300) { setErreur('Poids invalide'); return }
      if (Number(taille) < 100 || Number(taille) > 250) { setErreur('Taille invalide'); return }
    }
    if (etape === 1) {
      if (!age) { setErreur('L\'âge est obligatoire'); return }
      if (Number(age) < 10 || Number(age) > 120) { setErreur('Âge invalide'); return }
    }
    setEtape(e => e + 1)
  }

  async function terminer() {
    setLoading(true)
    setErreur('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: profilError } = await supabase.from('profil').upsert({
      user_id: user.id,
      age: Number(age), sexe,
      niveau_activite: niveauActivite,
      objectif,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (profilError) { setErreur(profilError.message); setLoading(false); return }

    const { error: mesureError } = await supabase.from('mesures').insert([{
      user_id: user.id,
      poids_kg: Number(poids),
      taille_cm: Number(taille),
    }])

    if (mesureError) { setErreur(mesureError.message); setLoading(false); return }

    router.push('/')
    router.refresh()
  }

  const estDerniereEtape = etape === ETAPES.length - 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {ETAPES.map((e, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex-1 h-1.5 rounded-full"
                style={{ background: i <= etape ? 'var(--orange)' : 'var(--surface-2)' }} />
            </div>
          ))}
        </div>

        {/* En-tête étape */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-3"
            style={{ background: 'var(--orange-light)' }}>
            {ETAPES[etape].emoji}
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{ETAPES[etape].titre}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{ETAPES[etape].description}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Étape {etape + 1} / {ETAPES.length}</p>
        </div>

        {/* Contenu de l'étape */}
        <div className="flex flex-col gap-4">

          {/* Étape 0 : Mesures */}
          {etape === 0 && (
            <div className="card flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">Poids (kg) *</label>
                  <input type="number" step="0.1" min="30" max="300"
                    value={poids} onChange={(e) => setPoids(e.target.value)}
                    className="input" placeholder="70" autoFocus required />
                </div>
                <div className="flex-1">
                  <label className="label">Taille (cm) *</label>
                  <input type="number" min="100" max="250"
                    value={taille} onChange={(e) => setTaille(e.target.value)}
                    className="input" placeholder="175" required />
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Ces mesures servent à calculer ton métabolisme de base (BMR) et tes besoins caloriques. Tu pourras les mettre à jour depuis ton profil.
              </p>
            </div>
          )}

          {/* Étape 1 : Profil */}
          {etape === 1 && (
            <div className="card flex flex-col gap-4">
              <div>
                <label className="label">Âge *</label>
                <input type="number" min="10" max="120"
                  value={age} onChange={(e) => setAge(e.target.value)}
                  className="input" placeholder="30" autoFocus required />
              </div>
              <div>
                <label className="label">Sexe</label>
                <div className="flex gap-2">
                  {['homme', 'femme'].map((s) => (
                    <button type="button" key={s} onClick={() => setSexe(s)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize"
                      style={{
                        background: sexe === s ? 'var(--orange)' : 'var(--surface-2)',
                        color: sexe === s ? 'white' : 'var(--text-muted)',
                      }}>
                      {s === 'homme' ? '♂ Homme' : '♀ Femme'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Étape 2 : Niveau d'activité */}
          {etape === 2 && (
            <div className="card flex flex-col gap-2">
              {NIVEAUX_ACTIVITE.map((n) => (
                <button type="button" key={n.value} onClick={() => setNiveauActivite(n.value)}
                  className="text-left px-3 py-3 rounded-xl border transition-all"
                  style={{
                    background: niveauActivite === n.value ? 'var(--orange)' : 'var(--surface)',
                    borderColor: niveauActivite === n.value ? 'var(--orange)' : 'var(--border)',
                    color: niveauActivite === n.value ? 'white' : 'var(--text)',
                  }}>
                  <p className="font-semibold text-sm">{n.label}</p>
                  <p className="text-xs mt-0.5" style={{
                    color: niveauActivite === n.value ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'
                  }}>{n.description}</p>
                </button>
              ))}
            </div>
          )}

          {/* Étape 3 : Objectif */}
          {etape === 3 && (
            <div className="card flex flex-col gap-2">
              {OBJECTIFS.map((o) => (
                <button type="button" key={o.value} onClick={() => setObjectif(o.value)}
                  className="text-left px-3 py-3 rounded-xl border"
                  style={{
                    background: objectif === o.value ? 'var(--orange)' : 'var(--surface)',
                    borderColor: objectif === o.value ? 'var(--orange)' : 'var(--border)',
                    color: objectif === o.value ? 'white' : 'var(--text)',
                  }}>
                  <p className="font-semibold text-sm">{o.label}</p>
                  <p className="text-xs mt-0.5" style={{
                    color: objectif === o.value ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'
                  }}>{o.description}</p>
                </button>
              ))}
            </div>
          )}

          {erreur && (
            <p className="text-sm text-center" style={{ color: '#ef4444' }}>{erreur}</p>
          )}

          {/* Navigation */}
          <div className="flex gap-2">
            {etape > 0 && (
              <button onClick={() => setEtape(e => e - 1)}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                ← Précédent
              </button>
            )}
            {estDerniereEtape ? (
              <button onClick={terminer} disabled={loading}
                className="flex-[2] btn-primary py-3 font-bold disabled:opacity-50">
                {loading ? 'Enregistrement...' : 'Commencer 🚀'}
              </button>
            ) : (
              <button onClick={etapeSuivante}
                className="flex-[2] btn-primary py-3 font-semibold">
                Suivant →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
