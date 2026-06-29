'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'
import { SkeletonListe, SkeletonGraphique } from '@/app/components/Skeleton'
import { ErreurChargement } from '@/app/components/Erreur'

function formatDate(dateStr) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return "Aujourd'hui"
  if (dateStr === yesterday) return 'Hier'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

function getMacros(r) {
  // Les valeurs _libre sont déjà recalculées selon la quantité au moment de l'insert
  return {
    kcal: Math.round(r.options_repas?.kcal || r.kcal_libre || 0),
    p: r.options_repas?.proteines_g || r.proteines_libre || 0,
    g: r.options_repas?.glucides_g || r.glucides_libre || 0,
    l: r.options_repas?.lipides_g || r.lipides_libre || 0,
  }
}

const TYPES = {
  'petit-dejeuner': { label: 'Petit-déjeuner', icon: '🍳' },
  'dejeuner': { label: 'Déjeuner', icon: '🥗' },
  'diner': { label: 'Dîner', icon: '🍝' },
  'collation': { label: 'Collation', icon: '🍎' },
}

export default function NutritionHistorique() {
  const supabase = createClient()
  const router = useRouter()
  const [periode, setPeriode] = useState(7)
  const [jours, setJours] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [objectifKcal, setObjectifKcal] = useState(null)
  const [jourOuvert, setJourOuvert] = useState(null)

  useEffect(() => { charger() }, [periode])

  async function charger() {
    setLoading(true)
    setErreur(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profil }, { data: mesures }] = await Promise.all([
        supabase.from('profil').select('*').eq('user_id', user.id).single(),
        supabase.from('mesures').select('poids_kg,taille_cm').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(1),
      ])

      if (profil && mesures?.[0]) {
        const { calculerCaloriesCible } = await import('@/lib/calculs')
        const { caloriesCible } = calculerCaloriesCible({
          poids: mesures[0].poids_kg, taille: mesures[0].taille_cm,
          age: profil.age, sexe: profil.sexe,
          niveauActivite: profil.niveau_activite, objectif: profil.objectif,
        })
        setObjectifKcal(caloriesCible)
      }

      const dateDebut = new Date(Date.now() - (periode - 1) * 86400000).toISOString().split('T')[0]
      const { data: repas } = await supabase.from('repas')
        .select('*, options_repas(kcal, proteines_g, glucides_g, lipides_g)')
        .eq('user_id', user.id)
        .gte('date_repas', dateDebut)
        .order('date_repas', { ascending: false })
        .order('created_at', { ascending: true })

      const parDate = {}
      repas?.forEach(r => {
        if (!parDate[r.date_repas]) parDate[r.date_repas] = []
        parDate[r.date_repas].push(r)
      })

      // Générer tous les jours de la période, du plus récent au plus ancien
      const tousLesJours = Array.from({ length: periode }, (_, i) => {
        const d = new Date(Date.now() - i * 86400000)
        return d.toISOString().split('T')[0]
      })

      const result = tousLesJours.map(date => {
        const repasJour = parDate[date] || []
        const totaux = repasJour.reduce((acc, r) => {
          const m = getMacros(r)
          return { kcal: acc.kcal + m.kcal, p: acc.p + m.p, g: acc.g + m.g, l: acc.l + m.l }
        }, { kcal: 0, p: 0, g: 0, l: 0 })
        return { date, repas: repasJour, ...totaux }
      })

      setJours(result)
    } catch (e) {
      setErreur("Impossible de charger l'historique nutrition.")
    } finally {
      setLoading(false)
    }
  }

  const joursAvecRepas = jours.filter(j => j.repas.length > 0)
  const moyKcal = joursAvecRepas.length > 0 ? Math.round(joursAvecRepas.reduce((a, j) => a + j.kcal, 0) / joursAvecRepas.length) : 0
  const moyP = joursAvecRepas.length > 0 ? Math.round(joursAvecRepas.reduce((a, j) => a + j.p, 0) / joursAvecRepas.length) : 0
  const moyG = joursAvecRepas.length > 0 ? Math.round(joursAvecRepas.reduce((a, j) => a + j.g, 0) / joursAvecRepas.length) : 0
  const moyL = joursAvecRepas.length > 0 ? Math.round(joursAvecRepas.reduce((a, j) => a + j.l, 0) / joursAvecRepas.length) : 0
  const maxKcal = Math.max(...jours.map(j => j.kcal), objectifKcal || 0, 1)

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm mb-3" style={{ color: 'var(--orange)' }}>← Retour</button>
      <Header title="Nutrition" subtitle="Historique de tes apports" />

      {/* Toggle période */}
      <div className="flex gap-2 mb-4">
        {[7, 30].map(p => (
          <button key={p} onClick={() => setPeriode(p)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: periode === p ? 'var(--orange)' : 'var(--surface)',
              color: periode === p ? 'white' : 'var(--text-muted)',
              border: `1px solid ${periode === p ? 'var(--orange)' : 'var(--border)'}`,
            }}>
            {p} jours
          </button>
        ))}
      </div>

      {loading ? (
        <>
          <SkeletonGraphique />
          <SkeletonListe nb={5} lignes={2} />
        </>
      ) : erreur ? (
        <ErreurChargement message={erreur} onReessayer={charger} />
      ) : (
        <>
          {/* Stats moyennes */}
          {joursAvecRepas.length > 0 && (
            <div className="card mb-4">
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                MOYENNE — {joursAvecRepas.length} jour{joursAvecRepas.length > 1 ? 's' : ''} renseigné{joursAvecRepas.length > 1 ? 's' : ''}
              </p>
              <div className="flex justify-between">
                {[
                  { label: 'kcal', val: moyKcal, color: 'var(--orange)', sub: objectifKcal ? `/ ${objectifKcal}` : null },
                  { label: 'Protéines', val: `${moyP}g`, color: 'var(--text)' },
                  { label: 'Glucides', val: `${moyG}g`, color: 'var(--text)' },
                  { label: 'Lipides', val: `${moyL}g`, color: 'var(--text)' },
                ].map(({ label, val, color, sub }) => (
                  <div key={label} className="text-center">
                    <p className="text-xl font-bold" style={{ color }}>{val}</p>
                    {sub && <p className="text-xs" style={{ color: 'var(--orange)' }}>{sub}</p>}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graphique barres calories */}
          {joursAvecRepas.length > 0 && (
            <div className="card mb-4">
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>CALORIES PAR JOUR</p>
              <div className="flex items-end gap-1" style={{ height: '100px' }}>
                {[...jours].reverse().map(j => {
                  const h = j.kcal > 0 ? Math.max(4, (j.kcal / maxKcal) * 100) : 0
                  const depasse = objectifKcal && j.kcal > objectifKcal
                  const isOuvert = jourOuvert === j.date
                  return (
                    <button key={j.date} onClick={() => setJourOuvert(isOuvert ? null : j.date)}
                      className="flex-1 flex flex-col items-center gap-1">
                      {j.kcal > 0 && (
                        <span style={{ fontSize: '8px', color: isOuvert ? 'var(--orange)' : 'var(--text-faint)' }}>
                          {j.kcal}
                        </span>
                      )}
                      <div className="w-full rounded-t-sm transition-all"
                        style={{
                          height: `${h}%`,
                          minHeight: j.kcal > 0 ? '4px' : '2px',
                          background: j.kcal === 0 ? 'var(--surface-2)' : depasse ? '#ef4444' : isOuvert ? 'var(--orange)' : '#FF572260',
                        }} />
                      <span style={{ fontSize: '9px', color: isOuvert ? 'var(--orange)' : 'var(--text-faint)' }}>
                        {new Date(j.date + 'T12:00:00').getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>
              {objectifKcal && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 border-t border-dashed" style={{ borderColor: '#FF572260' }} />
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--orange)' }}>
                    objectif {objectifKcal} kcal
                  </span>
                  <div className="flex-1 border-t border-dashed" style={{ borderColor: '#FF572260' }} />
                </div>
              )}
            </div>
          )}

          {/* Liste des jours */}
          <div className="flex flex-col gap-3">
            {jours.map(jour => {
              const estOuvert = jourOuvert === jour.date
              const repasParType = Object.entries(TYPES)
                .map(([type, meta]) => ({ type, ...meta, items: jour.repas.filter(r => r.type === type) }))
                .filter(t => t.items.length > 0)

              return (
                <div key={jour.date} className="card">
                  <button onClick={() => setJourOuvert(estOuvert ? null : jour.date)} className="w-full text-left">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-semibold" style={{ color: 'var(--text)' }}>{formatDate(jour.date)}</p>
                        {jour.kcal > 0 ? (
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-sm font-medium" style={{ color: 'var(--orange)' }}>
                              {jour.kcal} kcal
                            </span>
                            {objectifKcal && (
                              <span className="text-xs" style={{ color: jour.kcal > objectifKcal ? '#ef4444' : '#22c55e' }}>
                                {jour.kcal > objectifKcal
                                  ? `+${jour.kcal - objectifKcal} surplus`
                                  : `-${objectifKcal - jour.kcal} déficit`}
                              </span>
                            )}
                            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                              P:{Math.round(jour.p)}g G:{Math.round(jour.g)}g L:{Math.round(jour.l)}g
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Aucun repas enregistré</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {jour.kcal > 0 && objectifKcal && (
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                            <div className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (jour.kcal / objectifKcal) * 100)}%`,
                                background: jour.kcal > objectifKcal ? '#ef4444' : 'var(--orange)',
                              }} />
                          </div>
                        )}
                        <span style={{ color: 'var(--text-faint)' }}>{estOuvert ? '▲' : '▼'}</span>
                      </div>
                    </div>
                  </button>

                  {estOuvert && jour.repas.length > 0 && (
                    <div className="mt-3 pt-3 flex flex-col gap-4" style={{ borderTop: '1px solid var(--border)' }}>
                      {repasParType.map(({ type, icon, label, items }) => (
                        <div key={type}>
                          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                            {icon} {label}
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {items.map((r, i) => {
                              const m = getMacros(r)
                              return (
                                <div key={i} className="flex justify-between items-start text-sm">
                                  <div className="flex-1 mr-2">
                                    <span style={{ color: 'var(--text)' }}>{r.nom}</span>
                                    {r.quantite_g && (
                                      <span className="ml-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                                        ({r.quantite_g}g)
                                      </span>
                                    )}
                                    {(m.p > 0 || m.g > 0 || m.l > 0) && (
                                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                                        P:{m.p}g · G:{m.g}g · L:{m.l}g
                                      </p>
                                    )}
                                  </div>
                                  {m.kcal > 0 && (
                                    <span className="font-medium whitespace-nowrap" style={{ color: 'var(--orange)' }}>
                                      {m.kcal} kcal
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Récap du jour */}
                      <div className="rounded-xl px-3 py-2.5 flex justify-between"
                        style={{ background: 'var(--surface-2)' }}>
                        {[
                          { label: 'Total', val: `${jour.kcal} kcal`, color: 'var(--orange)' },
                          { label: 'Prot.', val: `${Math.round(jour.p)}g`, color: 'var(--text)' },
                          { label: 'Gluc.', val: `${Math.round(jour.g)}g`, color: 'var(--text)' },
                          { label: 'Lip.', val: `${Math.round(jour.l)}g`, color: 'var(--text)' },
                        ].map(({ label, val, color }) => (
                          <div key={label} className="text-center">
                            <p className="text-sm font-bold" style={{ color }}>{val}</p>
                            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
