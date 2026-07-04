'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'
import JaugeCalories from '@/app/components/JaugeCalories'
import GoogleFitSteps from '@/app/components/GoogleFitSteps'
import { SkeletonCard, SkeletonJauge } from '@/app/components/Skeleton'
import { ErreurChargement } from '@/app/components/Erreur'

// Composant séparé pour useSearchParams (doit être dans un Suspense)
function GoogleFitCallback() {
  const searchParams = useSearchParams()
  useEffect(() => {
    const googleFit = searchParams.get('google_fit')
    if (googleFit) {
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])
  return null
}

function aujourdHui() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const TYPES_REPAS = [
  { value: 'petit-dejeuner', label: 'Petit-déj', icon: '🍳' },
  { value: 'dejeuner', label: 'Déjeuner', icon: '🥗' },
  { value: 'diner', label: 'Dîner', icon: '🍝' },
  { value: 'collation', label: 'Collation', icon: '🍎' },
]

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)

  const [jourSemaine, setJourSemaine] = useState(null)
  const [exercices, setExercices] = useState([])
  const [seriesFaites, setSeriesFaites] = useState(0)
  const [seriesTotal, setSeriesTotal] = useState(0)
  const [cardioFait, setCardioFait] = useState(0)
  const [cardioTotal, setCardioTotal] = useState(0)
  const [dureeSeance, setDureeSeance] = useState(null)
  const [kcalBrulees, setKcalBrulees] = useState(0)

  const [repas, setRepas] = useState([])
  const [caloriesCible, setCaloriesCible] = useState(null)
  const [caloriesConsommees, setCaloriesConsommees] = useState(0)

  const [poidsAujourdhui, setPoidsAujourdhui] = useState(null)
  const [dernierPoids, setDernierPoids] = useState(null)

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    setErreur(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const today = aujourdHui()
      const numeroJour = new Date().getDay() === 0 ? 7 : new Date().getDay() // 1=lundi..7=dimanche

      const [
        { data: jourData },
        { data: exosData },
        { data: logsData },
        { data: dureesData },
        { data: repasData },
        { data: profilData },
        { data: mesuresData },
      ] = await Promise.all([
        supabase.from('jours').select('*').eq('numero', numeroJour).single(),
        supabase.from('exercices').select('*').eq('user_id', user.id),
        supabase.from('seances_log').select('exercice_id, exercice_nom, serie_numero, repetitions_faites, kcal, duree_minutes').eq('user_id', user.id).eq('date_seance', today),
        supabase.from('seances_duree').select('duree_secondes').eq('user_id', user.id).eq('date_seance', today).order('created_at', { ascending: false }).limit(1),
        supabase.from('repas').select('*, options_repas(kcal)').eq('user_id', user.id).eq('date_repas', today),
        supabase.from('profil').select('*').eq('user_id', user.id).single(),
        supabase.from('mesures').select('poids_kg, taille_cm, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(2),
      ])

      setJourSemaine(jourData)

      const exosJour = (exosData || []).filter(e => e.jour_id === jourData?.id)
      setExercices(exosJour)

      const exosMuscu = exosJour.filter(e => e.type_exercice !== 'cardio')
      const exosCardio = exosJour.filter(e => e.type_exercice === 'cardio')
      setSeriesTotal(exosMuscu.reduce((a, e) => a + (e.series || 0), 0))

      const logsParExo = {}
      const logsParNom = {}
      logsData?.forEach(l => {
        // Les logs circuit ont exercice_nom formaté "Circuit X — Exo Y" — on les ignore pour le comptage
        if (l.exercice_nom?.includes(' — ')) return
        if (l.exercice_id) {
          const key = String(l.exercice_id)
          logsParExo[key] = (logsParExo[key] || 0) + 1
        }
        if (l.exercice_nom) {
          logsParNom[l.exercice_nom] = (logsParNom[l.exercice_nom] || 0) + 1
        }
      })

      const seriesFaitesCount = exosMuscu.reduce((a, e) => {
        const count = logsParExo[String(e.id)] || logsParNom[e.nom] || 0
        return a + Math.min(count, e.series || 0)
      }, 0)
      setSeriesFaites(seriesFaitesCount)

      setCardioTotal(exosCardio.length)
      setCardioFait(exosCardio.filter(e =>
        (logsParExo[String(e.id)] || 0) >= 1 ||
        (logsParNom[e.nom] || 0) >= 1
      ).length)

      // Calories brûlées — cardio (kcal stocké) + muscu (recalculé)
      const poids = mesuresData?.[0]?.poids_kg || null
      let kcalBruleesTotal = 0
      if (logsData?.length) {
        const { calculerCaloriesCardio: calcCardio, calculerCaloriesExercice: calcMuscu } = await import('@/lib/calculs')

        // Calories cardio et circuit — logs avec kcal stocké ou duree_minutes
        logsData.forEach(l => {
          // Logs circuit → ignorer pour muscu, mais compter kcal si stocké
          if (l.exercice_nom?.includes(' — ')) {
            if (l.kcal) kcalBruleesTotal += l.kcal
            return
          }
          // Log cardio : kcal stocké en priorité, sinon recalcul
          const exoMatch = exosJour.find(e =>
            (String(e.id) === String(l.exercice_id) || e.nom === l.exercice_nom) &&
            e.type_exercice === 'cardio'
          )
          if (exoMatch) {
            if (l.kcal) {
              kcalBruleesTotal += l.kcal
            } else if (l.duree_minutes && poids && exoMatch.activite_cardio) {
              kcalBruleesTotal += calcCardio({
                activiteId: exoMatch.activite_cardio,
                dureeMinutes: l.duree_minutes,
                poidsCorps: poids,
              })
            }
          }
        })

        // Calories muscu — série par série (même méthode que l'historique)
        if (poids) {
          logsData.forEach(l => {
            // Ignorer les logs circuit
            if (l.exercice_nom?.includes(' — ')) return
            const exo = exosJour.find(e => String(e.id) === String(l.exercice_id))
            if (!exo || exo.type_exercice === 'cardio') return
            kcalBruleesTotal += calcMuscu({
              series: 1,
              repetitions: l.repetitions_faites || exo.repetitions || 10,
              poidsCharge: exo.poids_charge_kg || 0,
              poidsCorps: poids,
            })
          })
        }
      }
      setKcalBrulees(Math.round(kcalBruleesTotal))

      setDureeSeance(dureesData?.[0]?.duree_secondes || null)

      setRepas(repasData || [])
      const conso = (repasData || []).reduce((a, r) => a + (r.options_repas?.kcal || r.kcal_libre || 0), 0)
      setCaloriesConsommees(conso)

      if (profilData && mesuresData?.[0]?.poids_kg && mesuresData?.[0]?.taille_cm && profilData.age && profilData.sexe) {
        try {
          const { calculerCaloriesCible } = await import('@/lib/calculs')
          const { caloriesCible: cible } = calculerCaloriesCible({
            poids: mesuresData[0].poids_kg, taille: mesuresData[0].taille_cm,
            age: profilData.age, sexe: profilData.sexe,
            niveauActivite: profilData.niveau_activite, objectif: profilData.objectif,
          })
          if (Number.isFinite(cible) && cible > 0) setCaloriesCible(cible)
        } catch {}
      }

      if (mesuresData?.[0]) {
        const dm = new Date(mesuresData[0].created_at)
        const dateMesure = `${dm.getFullYear()}-${String(dm.getMonth()+1).padStart(2,'0')}-${String(dm.getDate()).padStart(2,'0')}`
        if (dateMesure === today) setPoidsAujourdhui(mesuresData[0].poids_kg)
        setDernierPoids(mesuresData[0].poids_kg)
      }
    } catch (e) {
      setErreur('Impossible de charger le résumé du jour. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }

  const dateAffichee = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const seanceCompletee = (seriesTotal > 0 && seriesFaites >= seriesTotal) || (cardioTotal > 0 && cardioFait >= cardioTotal)
  const seanceCommencee = seriesFaites > 0 || cardioFait > 0
  const aucunExercicePrevu = seriesTotal === 0 && cardioTotal === 0

  function formatDuree(s) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`
    return `${m}min`
  }

  if (loading) return (
    <div className="pt-6">
      <div className="h-8 w-40 rounded-lg mb-1 animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <div className="h-4 w-28 rounded-lg mb-6 animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <SkeletonJauge />
      <SkeletonCard lignes={3} />
      <div className="mt-3"><SkeletonCard lignes={3} /></div>
    </div>
  )

  if (erreur) return (
    <div className="pt-6">
      <ErreurChargement message={erreur} onReessayer={charger} />
    </div>
  )

  return (
    <div>
      {/* Nettoyage URL après callback OAuth Google Fit */}
      <Suspense fallback={null}>
        <GoogleFitCallback />
      </Suspense>

      <Header title="Aujourd'hui" subtitle={dateAffichee.charAt(0).toUpperCase() + dateAffichee.slice(1)} />

      {/* Jauge calories */}
      {caloriesCible && (
        <div className="mb-4">
          <JaugeCalories consomme={caloriesConsommees} objectif={caloriesCible} />
        </div>
      )}

      {/* Pas du jour via Google Fit */}
      <GoogleFitSteps poidsCorps={dernierPoids} />

      {/* Carte séance du jour */}
      <Link href={jourSemaine ? `/seance/${jourSemaine.id}` : '/'}>
        <div className="card mb-3" style={{
          borderLeft: `4px solid ${seanceCompletee ? '#22c55e' : seanceCommencee ? 'var(--orange)' : 'var(--border)'}`
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {seanceCompletee ? '✅' : seanceCommencee ? '🏋️' : aucunExercicePrevu ? '😴' : '⏳'}
              </span>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>
                  {aucunExercicePrevu ? 'Jour de repos' : jourSemaine?.nom || 'Séance'}
                </p>
                {!aucunExercicePrevu && (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {seriesTotal > 0 && `${seriesFaites}/${seriesTotal} séries`}
                    {seriesTotal > 0 && cardioTotal > 0 && ' · '}
                    {cardioTotal > 0 && `${cardioFait}/${cardioTotal} cardio`}
                    {kcalBrulees > 0 && ` · 🔥 ${kcalBrulees} kcal`}
                  </p>
                )}
                {dureeSeance && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--orange)' }}>
                    ⏱️ {formatDuree(dureeSeance)}
                  </p>
                )}
              </div>
            </div>
            <span style={{ color: 'var(--text-faint)' }}>→</span>
          </div>
        </div>
      </Link>

      {/* Carte repas du jour */}
      <Link href="/repas">
        <div className="card mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍽️</span>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>Repas</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {repas.length} repas · {caloriesConsommees} kcal
                </p>
              </div>
            </div>
            <span style={{ color: 'var(--text-faint)' }}>→</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            {TYPES_REPAS.map(t => {
              const fait = repas.some(r => r.type === t.value)
              return (
                <div key={t.value} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg"
                  style={{ background: fait ? 'var(--orange-light)' : 'var(--surface-2)' }}>
                  <span style={{ opacity: fait ? 1 : 0.4 }}>{t.icon}</span>
                  <span className="text-xs" style={{ color: fait ? 'var(--orange)' : 'var(--text-faint)' }}>
                    {t.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Link>

      {/* Carte poids du jour */}
      <Link href="/profil">
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚖️</span>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>Poids</p>
                {poidsAujourdhui ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {poidsAujourdhui}kg — mesuré aujourd'hui
                  </p>
                ) : dernierPoids ? (
                  <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                    Pas encore pesé aujourd'hui (dernier : {dernierPoids}kg)
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                    Aucune mesure enregistrée
                  </p>
                )}
              </div>
            </div>
            <span style={{ color: 'var(--text-faint)' }}>→</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
