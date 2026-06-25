'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'
import { useToast } from '@/app/components/Toast'

const TYPES = [
  { value: 'petit-dejeuner', label: 'Petit-déjeuner', icon: '🍳' },
  { value: 'dejeuner', label: 'Déjeuner', icon: '🥗' },
  { value: 'diner', label: 'Dîner', icon: '🍝' },
  { value: 'collation', label: 'Collation', icon: '🍎' },
]

function aujourdHui() { return new Date().toISOString().split('T')[0] }

export default function Repas() {
  const supabase = createClient()
  const [userId, setUserId] = useState(null)
  const [repas, setRepas] = useState([])
  const [loading, setLoading] = useState(true)
  const [nom, setNom] = useState('')
  const [type, setType] = useState('petit-dejeuner')
  const [kcalLibre, setKcalLibre] = useState('')
  const [optionsParType, setOptionsParType] = useState({})
  const [ingredientsParOption, setIngredientsParOption] = useState({})
  const [optionOuverte, setOptionOuverte] = useState(null)
  const [modeLibre, setModeLibre] = useState(false)
  const toast = useToast()

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase.from('repas').select('*')
      .eq('user_id', user.id).eq('date_repas', aujourdHui()).order('created_at')
    setRepas(data || [])

    const { data: options } = await supabase.from('options_repas').select('*').order('ordre')
    const groupes = {}
    options?.forEach((o) => { if (!groupes[o.type]) groupes[o.type] = []; groupes[o.type].push(o) })
    setOptionsParType(groupes)

    if (options?.length > 0) {
      const { data: ingredients } = await supabase.from('options_repas_ingredients').select('*').order('ordre')
      const groupesIng = {}
      ingredients?.forEach((i) => { if (!groupesIng[i.option_repas_id]) groupesIng[i.option_repas_id] = []; groupesIng[i.option_repas_id].push(i) })
      setIngredientsParOption(groupesIng)
    }
    setLoading(false)
  }

  async function choisirOption(option) {
    if (!userId) return
    await supabase.from('repas').insert([{ user_id: userId, nom: option.nom, type: option.type, date_repas: aujourdHui(), option_repas_id: option.id }])
    setOptionOuverte(null)
    charger()
  }

  async function ajouterRepasLibre(e) {
    e.preventDefault()
    if (!nom.trim() || !userId) return
    await supabase.from('repas').insert([{
      user_id: userId, nom, type,
      date_repas: aujourdHui(),
      kcal_libre: kcalLibre ? Number(kcalLibre) : null,
    }])
    setNom(''); setKcalLibre('')
    toast('Repas ajouté ✓')
    charger()
  }

  async function toggleFait(r) {
    await supabase.from('repas').update({ fait: !r.fait }).eq('id', r.id)
    charger()
  }

  async function supprimer(id) {
    await supabase.from('repas').delete().eq('id', id)
    charger()
  }

  const optionsDuType = optionsParType[type] || []

  return (
    <div>
      <Header title="Repas du jour" subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />

      <div className="flex gap-2 flex-wrap mb-4">
        {TYPES.map((t) => (
          <button type="button" key={t.value} onClick={() => { setType(t.value); setOptionOuverte(null) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${type === t.value ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {optionsDuType.length > 0 && !modeLibre && (
        <div className="flex flex-col gap-3 mb-4">
          {optionsDuType.map((option) => {
            const estOuverte = optionOuverte === option.id
            const ingredients = ingredientsParOption[option.id] || []
            return (
              <div key={option.id} className="card">
                <button type="button" onClick={() => setOptionOuverte(estOuverte ? null : option.id)} className="w-full text-left">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold">{option.nom}</p>
                      {option.profil && <p className="text-xs text-gray-400 mt-0.5">{option.profil}</p>}
                    </div>
                    <span className="text-gray-300 text-sm ml-2">{estOuverte ? '▲' : '▼'}</span>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs font-medium">
                    <span className="text-orange-600">{option.kcal} kcal</span>
                    <span className="text-gray-500">P: {option.proteines_g}g</span>
                    <span className="text-gray-500">G: {option.glucides_g}g</span>
                    <span className="text-gray-500">L: {option.lipides_g}g</span>
                    {option.poids_total_g && <span className="text-gray-400">· {option.poids_total_g}g</span>}
                  </div>
                </button>

                {estOuverte && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
                    {ingredients.map((ing) => (
                      <div key={ing.id} className="flex justify-between text-xs text-gray-500">
                        <span>{ing.nom} {ing.quantite && `(${ing.quantite})`}</span>
                        <span>{ing.kcal} kcal</span>
                      </div>
                    ))}
                    {option.note_preparation && (
                      <p className="text-xs text-gray-400 italic mt-1 bg-gray-50 rounded-lg p-2">{option.note_preparation}</p>
                    )}
                    <button onClick={() => choisirOption(option)} className="btn-primary mt-2 text-sm py-2">Choisir ce repas</button>
                  </div>
                )}
              </div>
            )
          })}
          <button type="button" onClick={() => setModeLibre(true)} className="text-sm text-gray-400 underline text-center">
            Aucune de ces options, saisir autre chose
          </button>
        </div>
      )}

      {(optionsDuType.length === 0 || modeLibre) && (
        <form onSubmit={ajouterRepasLibre} className="card flex flex-col gap-3 mb-6">
          <input value={nom} onChange={(e) => setNom(e.target.value)}
            placeholder="Ex: Poulet riz brocolis" className="input" required />
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label">Calories (optionnel)</label>
              <input type="number" min="0" value={kcalLibre}
                onChange={(e) => setKcalLibre(e.target.value)}
                placeholder="Ex: 450" className="input" />
            </div>
            <button type="submit" className="btn-primary flex-1 py-2">Ajouter</button>
            {optionsDuType.length > 0 && (
              <button type="button" onClick={() => setModeLibre(false)}
                className="px-3 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      {loading ? <p style={{ color: 'var(--text-muted)' }}>Chargement...</p> : (
        <div className="flex flex-col gap-3">
          {TYPES.map((t) => {
            const items = repas.filter((r) => r.type === t.value)
            if (items.length === 0) return null
            const kcalType = items.reduce((a, r) => a + (r.kcal_libre || 0), 0)
            return (
              <div key={t.value}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{t.icon} {t.label}</p>
                  {kcalType > 0 && <p className="text-xs font-medium" style={{ color: 'var(--orange)' }}>{kcalType} kcal</p>}
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((r) => {
                    const kcal = r.kcal_libre
                    return (
                      <div key={r.id} className="card flex items-center justify-between py-3">
                        <button onClick={() => toggleFait(r)} className="flex items-center gap-3 flex-1 text-left">
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${r.fait ? 'bg-green-500 border-green-500' : ''}`}
                            style={{ borderColor: r.fait ? undefined : 'var(--border)' }}>
                            {r.fait && <span className="text-white text-xs">✓</span>}
                          </span>
                          <div>
                            <span className="text-sm" style={{ color: r.fait ? 'var(--text-faint)' : 'var(--text)', textDecoration: r.fait ? 'line-through' : 'none' }}>
                              {r.nom}
                            </span>
                            {kcal && <p className="text-xs" style={{ color: 'var(--orange)' }}>{kcal} kcal</p>}
                          </div>
                        </button>
                        <button onClick={() => supprimer(r.id)} className="text-sm px-2" style={{ color: 'var(--text-faint)' }}>✕</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {repas.length === 0 && <p className="text-center py-8" style={{ color: 'var(--text-faint)' }}>Aucun repas ajouté pour aujourd'hui.</p>}
        </div>
      )}
    </div>
  )
}
