'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TYPES = [
  { value: 'petit-dejeuner', label: 'Petit-déjeuner', icon: '🍳' },
  { value: 'dejeuner', label: 'Déjeuner', icon: '🥗' },
  { value: 'diner', label: 'Dîner', icon: '🍝' },
  { value: 'collation', label: 'Collation', icon: '🍎' },
]

function aujourdHui() {
  return new Date().toISOString().split('T')[0]
}

export default function Repas() {
  const [repas, setRepas] = useState([])
  const [loading, setLoading] = useState(true)
  const [nom, setNom] = useState('')
  const [type, setType] = useState('petit-dejeuner')

  useEffect(() => {
    charger()
  }, [])

  async function charger() {
    setLoading(true)
    const { data } = await supabase
      .from('repas')
      .select('*')
      .eq('date_repas', aujourdHui())
      .order('created_at')
    setRepas(data || [])
    setLoading(false)
  }

  async function ajouterRepas(e) {
    e.preventDefault()
    if (!nom.trim()) return
    const { error } = await supabase.from('repas').insert([{ nom, type, date_repas: aujourdHui() }])
    if (!error) {
      setNom('')
      charger()
    }
  }

  async function toggleFait(r) {
    await supabase.from('repas').update({ fait: !r.fait }).eq('id', r.id)
    charger()
  }

  async function supprimer(id) {
    await supabase.from('repas').delete().eq('id', id)
    charger()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Repas du jour</h1>
      <p className="text-gray-500 mb-6">
        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      <form onSubmit={ajouterRepas} className="card flex flex-col gap-3 mb-6">
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex: Poulet riz brocolis"
          className="border rounded-lg px-3 py-2"
        />
        <div className="flex gap-2 flex-wrap">
          {TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setType(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                type === t.value ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <button type="submit" className="btn-primary">Ajouter</button>
      </form>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {TYPES.map((t) => {
            const items = repas.filter((r) => r.type === t.value)
            if (items.length === 0) return null
            return (
              <div key={t.value}>
                <p className="text-sm font-semibold text-gray-500 mb-2">{t.icon} {t.label}</p>
                <div className="flex flex-col gap-2">
                  {items.map((r) => (
                    <div key={r.id} className="card flex items-center justify-between py-3">
                      <button onClick={() => toggleFait(r)} className="flex items-center gap-3 flex-1 text-left">
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${r.fait ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                          {r.fait && <span className="text-white text-xs">✓</span>}
                        </span>
                        <span className={r.fait ? 'line-through text-gray-400' : ''}>{r.nom}</span>
                      </button>
                      <button onClick={() => supprimer(r.id)} className="text-gray-300 text-sm px-2">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {repas.length === 0 && (
            <p className="text-gray-400 text-center py-8">Aucun repas ajouté pour aujourd'hui.</p>
          )}
        </div>
      )}
    </div>
  )
}
