'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'
import { useToast } from '@/app/components/Toast'
import ScannerCodeBarre from '@/app/components/ScannerCodeBarre'

const TYPES = [
  { value: 'petit-dejeuner', label: 'Petit-déjeuner', icon: '🍳' },
  { value: 'dejeuner', label: 'Déjeuner', icon: '🥗' },
  { value: 'diner', label: 'Dîner', icon: '🍝' },
  { value: 'collation', label: 'Collation', icon: '🍎' },
]

const OBJECTIF_LABELS = {
  perte_poids: { label: 'Perte de poids', color: '#3B82F6', bg: '#EFF6FF', icon: '📉' },
  maintien: { label: 'Maintien', color: '#22c55e', bg: '#F0FDF4', icon: '⚖️' },
  prise_masse: { label: 'Prise de masse', color: '#FF5722', bg: '#FFF3F0', icon: '💪' },
  tous: { label: 'Tous objectifs', color: '#6B7280', bg: '#F9FAFB', icon: '✓' },
}

function aujourdHui() { return new Date().toISOString().split('T')[0] }

export default function Repas() {
  const supabase = createClient()
  const toast = useToast()

  const [userId, setUserId] = useState(null)
  const [repas, setRepas] = useState([])
  const [loading, setLoading] = useState(true)

  // Onglet actif : 'catalogue' ou 'suggestions'
  const [onglet, setOnglet] = useState('catalogue')

  // Catalogue
  const [type, setType] = useState('petit-dejeuner')
  const [optionsParType, setOptionsParType] = useState({})
  const [ingredientsParOption, setIngredientsParOption] = useState({})
  const [optionOuverte, setOptionOuverte] = useState(null)
  const [modeLibre, setModeLibre] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Saisie libre
  const [nom, setNom] = useState('')
  const [kcalLibre, setKcalLibre] = useState('')
  const [proteinesLibre, setProteinesLibre] = useState('')
  const [glucidesLibre, setGlucidesLibre] = useState('')
  const [lipidesLibre, setLipidesLibre] = useState('')

  // Suggestions
  const [profil, setProfil] = useState(null) // profil utilisateur
  const [suggestions, setSuggestions] = useState([]) // options filtrées par objectif
  const [typeSuggestion, setTypeSuggestion] = useState('petit-dejeuner')
  const [caloriesRestantes, setCaloriesRestantes] = useState(null)
  const [suggestionOuverte, setSuggestionOuverte] = useState(null)

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Repas du jour
    const { data } = await supabase.from('repas')
      .select('*, options_repas(kcal, proteines_g, glucides_g, lipides_g)')
      .eq('user_id', user.id).eq('date_repas', aujourdHui()).order('created_at')
    setRepas(data || [])

    // Catalogue complet
    const { data: options } = await supabase.from('options_repas').select('*').order('objectif_cible').order('ordre')
    const groupes = {}
    options?.forEach((o) => { if (!groupes[o.type]) groupes[o.type] = []; groupes[o.type].push(o) })
    setOptionsParType(groupes)

    if (options?.length > 0) {
      const { data: ingredients } = await supabase.from('options_repas_ingredients').select('*').order('ordre')
      const groupesIng = {}
      ingredients?.forEach((i) => { if (!groupesIng[i.option_repas_id]) groupesIng[i.option_repas_id] = []; groupesIng[i.option_repas_id].push(i) })
      setIngredientsParOption(groupesIng)
    }

    // Profil utilisateur pour les suggestions
    const { data: profilData } = await supabase.from('profil').select('*').eq('user_id', user.id).single()
    const { data: mesures } = await supabase.from('mesures').select('poids_kg,taille_cm')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)

    if (profilData && mesures?.[0]) {
      const p = { ...profilData, ...mesures[0] }
      setProfil(p)

      // Calculer calories restantes
      const { calculerCaloriesCible } = await import('@/lib/calculs')
      const { caloriesCible } = calculerCaloriesCible({
        poids: mesures[0].poids_kg, taille: mesures[0].taille_cm,
        age: profilData.age, sexe: profilData.sexe,
        niveauActivite: profilData.niveau_activite, objectif: profilData.objectif,
      })
      const caloConso = (data || []).reduce((a, r) => a + (r.options_repas?.kcal || r.kcal_libre || 0), 0)
      setCaloriesRestantes(caloriesCible - caloConso)

      // Suggestions filtrées par objectif du profil
      const filtrees = (options || []).filter(o =>
        o.objectif_cible === profilData.objectif || o.objectif_cible === 'tous'
      )
      setSuggestions(filtrees)
    } else {
      setSuggestions(options || [])
    }

    setLoading(false)
  }

  async function choisirOption(option) {
    if (!userId) return
    await supabase.from('repas').insert([{
      user_id: userId, nom: option.nom, type: option.type,
      date_repas: aujourdHui(), option_repas_id: option.id,
    }])
    setOptionOuverte(null)
    setSuggestionOuverte(null)
    toast(`${option.nom} ajouté ✓`)
    charger()
  }

  async function ajouterRepasLibre(e) {
    e.preventDefault()
    if (!nom.trim() || !userId) return
    await supabase.from('repas').insert([{
      user_id: userId, nom, type,
      date_repas: aujourdHui(),
      kcal_libre: kcalLibre ? Number(kcalLibre) : null,
      proteines_libre: proteinesLibre ? Number(proteinesLibre) : null,
      glucides_libre: glucidesLibre ? Number(glucidesLibre) : null,
      lipides_libre: lipidesLibre ? Number(lipidesLibre) : null,
    }])
    setNom(''); setKcalLibre(''); setProteinesLibre(''); setGlucidesLibre(''); setLipidesLibre('')
    toast('Repas ajouté ✓')
    charger()
  }

  function onResultatScan({ nom: nomProduit, kcal, proteines, glucides, lipides }) {
    setShowScanner(false)
    setModeLibre(true)
    setNom(kcal ? `${nomProduit} (100g)` : nomProduit)
    if (kcal) setKcalLibre(String(kcal))
    if (proteines) setProteinesLibre(String(proteines))
    if (glucides) setGlucidesLibre(String(glucides))
    if (lipides) setLipidesLibre(String(lipides))
    toast(`Produit trouvé : ${nomProduit} 📦`)
  }

  async function toggleFait(r) {
    await supabase.from('repas').update({ fait: !r.fait }).eq('id', r.id)
    charger()
  }

  async function supprimer(id) {
    await supabase.from('repas').delete().eq('id', id)
    toast('Repas supprimé')
    charger()
  }

  const optionsDuType = (optionsParType[type] || []).filter(o => o.objectif_cible === 'tous')
  const suggestionsDuType = suggestions.filter(s => s.type === typeSuggestion)

  // Totaux macros du jour
  const totaux = repas.reduce((acc, r) => ({
    kcal: acc.kcal + (r.options_repas?.kcal || r.kcal_libre || 0),
    p: acc.p + (r.options_repas?.proteines_g || r.proteines_libre || 0),
    g: acc.g + (r.options_repas?.glucides_g || r.glucides_libre || 0),
    l: acc.l + (r.options_repas?.lipides_g || r.lipides_libre || 0),
  }), { kcal: 0, p: 0, g: 0, l: 0 })

  return (
    <div>
      {showScanner && <ScannerCodeBarre onResultat={onResultatScan} onFermer={() => setShowScanner(false)} />}

      <Header title="Repas du jour"
        subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />

      {/* Onglets */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'catalogue', label: '📋 Catalogue' },
          { id: 'suggestions', label: '✨ Suggestions' },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: onglet === o.id ? 'var(--orange)' : 'var(--surface)',
              color: onglet === o.id ? 'white' : 'var(--text-muted)',
              border: `1px solid ${onglet === o.id ? 'var(--orange)' : 'var(--border)'}`,
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* ======== ONGLET CATALOGUE ======== */}
      {onglet === 'catalogue' && (
        <>
          <div className="flex gap-2 flex-wrap mb-4">
            {TYPES.map((t) => (
              <button type="button" key={t.value} onClick={() => { setType(t.value); setOptionOuverte(null) }}
                className="px-3 py-1.5 rounded-full text-sm font-medium border"
                style={{
                  background: type === t.value ? 'var(--orange)' : 'var(--surface)',
                  color: type === t.value ? 'white' : 'var(--text-muted)',
                  borderColor: type === t.value ? 'var(--orange)' : 'var(--border)',
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {optionsDuType.length > 0 && !modeLibre && (
            <div className="flex flex-col gap-3 mb-4">
              {optionsDuType.map((option) => (
                <CarteOption key={option.id} option={option}
                  ingredients={ingredientsParOption[option.id] || []}
                  ouvert={optionOuverte === option.id}
                  onToggle={() => setOptionOuverte(optionOuverte === option.id ? null : option.id)}
                  onChoisir={() => choisirOption(option)}
                  caloriesRestantes={caloriesRestantes}
                />
              ))}
              <button type="button" onClick={() => setModeLibre(true)}
                className="text-sm underline text-center" style={{ color: 'var(--text-faint)' }}>
                Aucune de ces options, saisir autre chose
              </button>
            </div>
          )}

          {(optionsDuType.length === 0 || modeLibre) && (
            <FormulaireSaisieLibre
              nom={nom} setNom={setNom}
              kcalLibre={kcalLibre} setKcalLibre={setKcalLibre}
              proteinesLibre={proteinesLibre} setProteinesLibre={setProteinesLibre}
              glucidesLibre={glucidesLibre} setGlucidesLibre={setGlucidesLibre}
              lipidesLibre={lipidesLibre} setLipidesLibre={setLipidesLibre}
              onSubmit={ajouterRepasLibre}
              onScanner={() => setShowScanner(true)}
              onAnnuler={optionsDuType.length > 0 ? () => setModeLibre(false) : null}
            />
          )}
        </>
      )}

      {/* ======== ONGLET SUGGESTIONS ======== */}
      {onglet === 'suggestions' && (
        <>
          {/* Info objectif */}
          {profil ? (
            <div className="card mb-4 py-3 flex items-center gap-3">
              <span className="text-2xl">{OBJECTIF_LABELS[profil.objectif]?.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Objectif : {OBJECTIF_LABELS[profil.objectif]?.label}
                </p>
                {caloriesRestantes !== null && (
                  <p className="text-xs" style={{ color: caloriesRestantes < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                    {caloriesRestantes > 0
                      ? `${Math.round(caloriesRestantes)} kcal restantes aujourd'hui`
                      : `${Math.abs(Math.round(caloriesRestantes))} kcal au-dessus de l'objectif`}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="card mb-4 py-3 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Renseigne ton profil pour des suggestions personnalisées
              </p>
            </div>
          )}

          {/* Filtre type de repas */}
          <div className="flex gap-2 flex-wrap mb-4">
            {TYPES.map((t) => (
              <button key={t.value} onClick={() => { setTypeSuggestion(t.value); setSuggestionOuverte(null) }}
                className="px-3 py-1.5 rounded-full text-sm font-medium border"
                style={{
                  background: typeSuggestion === t.value ? 'var(--orange)' : 'var(--surface)',
                  color: typeSuggestion === t.value ? 'white' : 'var(--text-muted)',
                  borderColor: typeSuggestion === t.value ? 'var(--orange)' : 'var(--border)',
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 mb-4">
            {suggestionsDuType.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text-faint)' }}>
                Aucune suggestion pour ce type de repas.
              </p>
            ) : (
              suggestionsDuType.map((option) => (
                <CarteOption key={option.id} option={option}
                  ingredients={ingredientsParOption[option.id] || []}
                  ouvert={suggestionOuverte === option.id}
                  onToggle={() => setSuggestionOuverte(suggestionOuverte === option.id ? null : option.id)}
                  onChoisir={() => choisirOption(option)}
                  caloriesRestantes={caloriesRestantes}
                  afficherObjectif={!profil || profil.objectif === null}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Totaux macros du jour */}
      {repas.length > 0 && totaux.kcal > 0 && (
        <div className="card mb-4 py-3">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Total du jour</p>
          <div className="flex justify-between">
            {[
              { label: 'kcal', val: Math.round(totaux.kcal), color: 'var(--orange)' },
              { label: 'Protéines', val: `${Math.round(totaux.p)}g`, color: 'var(--text)' },
              { label: 'Glucides', val: `${Math.round(totaux.g)}g`, color: 'var(--text)' },
              { label: 'Lipides', val: `${Math.round(totaux.l)}g`, color: 'var(--text)' },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center">
                <p className="text-base font-bold" style={{ color }}>{val}</p>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste repas du jour */}
      {loading ? <p style={{ color: 'var(--text-muted)' }}>Chargement...</p> : (
        <div className="flex flex-col gap-3">
          {TYPES.map((t) => {
            const items = repas.filter((r) => r.type === t.value)
            if (items.length === 0) return null
            return (
              <div key={t.value}>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{t.icon} {t.label}</p>
                <div className="flex flex-col gap-2">
                  {items.map((r) => (
                    <div key={r.id} className="card flex items-center justify-between py-3">
                      <button onClick={() => toggleFait(r)} className="flex items-center gap-3 flex-1 text-left">
                        <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ background: r.fait ? '#22c55e' : 'transparent', borderColor: r.fait ? '#22c55e' : 'var(--border)' }}>
                          {r.fait && <span className="text-white text-xs">✓</span>}
                        </span>
                        <div>
                          <span className="text-sm" style={{
                            color: r.fait ? 'var(--text-faint)' : 'var(--text)',
                            textDecoration: r.fait ? 'line-through' : 'none',
                          }}>{r.nom}</span>
                          {(r.kcal_libre || r.options_repas?.kcal) && (
                            <p className="text-xs" style={{ color: 'var(--orange)' }}>
                              {r.options_repas?.kcal || r.kcal_libre} kcal
                            </p>
                          )}
                        </div>
                      </button>
                      <button onClick={() => supprimer(r.id)} className="text-sm px-2" style={{ color: 'var(--text-faint)' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {repas.length === 0 && (
            <p className="text-center py-8" style={{ color: 'var(--text-faint)' }}>Aucun repas ajouté pour aujourd'hui.</p>
          )}
        </div>
      )}
    </div>
  )
}

// -------- Carte option repas (catalogue + suggestions) --------
function CarteOption({ option, ingredients, ouvert, onToggle, onChoisir, caloriesRestantes, afficherObjectif }) {
  const objInfo = OBJECTIF_LABELS[option.objectif_cible]

  // Indicateur de compatibilité avec les calories restantes
  const compatible = caloriesRestantes === null || option.kcal <= caloriesRestantes
  const tropCalorique = caloriesRestantes !== null && option.kcal > caloriesRestantes

  return (
    <div className="card">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold" style={{ color: 'var(--text)' }}>{option.nom}</p>
              {afficherObjectif && option.objectif_cible !== 'tous' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: objInfo?.bg, color: objInfo?.color }}>
                  {objInfo?.icon} {objInfo?.label}
                </span>
              )}
              {tropCalorique && (
                <span className="text-xs" style={{ color: '#f59e0b' }}>⚠️ Dépasse l'objectif</span>
              )}
            </div>
            {option.profil && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{option.profil}</p>}
          </div>
          <span style={{ color: 'var(--text-faint)' }} className="text-sm ml-2">{ouvert ? '▲' : '▼'}</span>
        </div>
        <div className="flex gap-3 mt-2 text-xs font-medium flex-wrap">
          <span style={{ color: 'var(--orange)' }}>{option.kcal} kcal</span>
          <span style={{ color: 'var(--text-muted)' }}>P: {option.proteines_g}g</span>
          <span style={{ color: 'var(--text-muted)' }}>G: {option.glucides_g}g</span>
          <span style={{ color: 'var(--text-muted)' }}>L: {option.lipides_g}g</span>
          {option.poids_total_g && <span style={{ color: 'var(--text-faint)' }}>· {option.poids_total_g}g</span>}
        </div>
      </button>

      {ouvert && (
        <div className="mt-3 pt-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
          {ingredients.map((ing) => (
            <div key={ing.id} className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{ing.nom} {ing.quantite && `(${ing.quantite})`}</span>
              <span>{ing.kcal} kcal</span>
            </div>
          ))}
          {option.note_preparation && (
            <p className="text-xs italic mt-1 p-2 rounded-lg" style={{ color: 'var(--text-faint)', background: 'var(--surface-2)' }}>
              {option.note_preparation}
            </p>
          )}
          <button onClick={onChoisir} className="btn-primary mt-2 text-sm py-2">
            Choisir ce repas
          </button>
        </div>
      )}
    </div>
  )
}

// -------- Formulaire saisie libre --------
function FormulaireSaisieLibre({ nom, setNom, kcalLibre, setKcalLibre, proteinesLibre, setProteinesLibre,
  glucidesLibre, setGlucidesLibre, lipidesLibre, setLipidesLibre, onSubmit, onScanner, onAnnuler }) {
  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-3 mb-6">
      <button type="button" onClick={onScanner}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium border"
        style={{ borderColor: 'var(--orange)', color: 'var(--orange)', background: 'var(--orange-light)' }}>
        📷 Scanner un code-barres
      </button>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>ou saisir manuellement</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <input value={nom} onChange={(e) => setNom(e.target.value)}
        placeholder="Ex: Poulet riz brocolis" className="input" required />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="label">Calories</label>
          <input type="number" min="0" value={kcalLibre} onChange={(e) => setKcalLibre(e.target.value)} placeholder="kcal" className="input" />
        </div>
        <div className="flex-1">
          <label className="label">Protéines (g)</label>
          <input type="number" min="0" step="0.1" value={proteinesLibre} onChange={(e) => setProteinesLibre(e.target.value)} placeholder="g" className="input" />
        </div>
        <div className="flex-1">
          <label className="label">Glucides (g)</label>
          <input type="number" min="0" step="0.1" value={glucidesLibre} onChange={(e) => setGlucidesLibre(e.target.value)} placeholder="g" className="input" />
        </div>
        <div className="flex-1">
          <label className="label">Lipides (g)</label>
          <input type="number" min="0" step="0.1" value={lipidesLibre} onChange={(e) => setLipidesLibre(e.target.value)} placeholder="g" className="input" />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full py-2">Ajouter</button>
      {onAnnuler && (
        <button type="button" onClick={onAnnuler}
          className="w-full py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
          Annuler
        </button>
      )}
    </form>
  )
}
