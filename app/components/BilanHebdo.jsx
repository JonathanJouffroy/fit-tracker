'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const CLE_CACHE = 'bilan_hebdo_cache'
const CLE_DATE = 'bilan_hebdo_date'

function debutSemainePrecedente() {
  const d = new Date()
  const jour = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - jour - 6) // lundi semaine précédente
  d.setHours(0, 0, 0, 0)
  return d
}

function finSemainePrecedente() {
  const d = new Date()
  const jour = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - jour) // dimanche semaine précédente
  d.setHours(23, 59, 59, 999)
  return d
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function BilanHebdo({ poidsCorps, objectif, objectifKcal, objectifPas }) {
  const [bilan, setBilan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [ouvert, setOuvert] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Charger depuis le cache si disponible et de cette semaine
    try {
      const dateCachee = localStorage.getItem(CLE_DATE)
      const bilanCache = localStorage.getItem(CLE_CACHE)
      const lundiActuel = formatDate(debutSemainePrecedente())
      if (dateCachee === lundiActuel && bilanCache) {
        setBilan(JSON.parse(bilanCache))
        // Ne pas ouvrir automatiquement — l'utilisateur clique sur "Voir"
        setOuvert(false)
      } else if (estLundi()) {
        // Lundi → générer automatiquement mais ne pas ouvrir
        generer()
      }
    } catch {}
  }, [])

  function estLundi() {
    return new Date().getDay() === 1
  }

  async function collecterDonnees() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const debut = formatDate(debutSemainePrecedente())
    const fin = formatDate(finSemainePrecedente())

    const [
      { data: seancesLog },
      { data: seancesDuree },
      { data: repas },
      { data: pasData },
      { data: douleurs },
      { data: profilData },
    ] = await Promise.all([
      supabase.from('seances_log').select('exercice_nom, poids_kg, repetitions_faites').eq('user_id', user.id).gte('date_seance', debut).lte('date_seance', fin),
      supabase.from('seances_duree').select('date_seance, duree_secondes').eq('user_id', user.id).gte('date_seance', debut).lte('date_seance', fin),
      supabase.from('repas').select('date_repas, kcal_libre, proteines_libre, options_repas(kcal, proteines_g)').eq('user_id', user.id).gte('date_repas', debut).lte('date_repas', fin),
      supabase.from('pas_quotidiens').select('date, pas').eq('user_id', user.id).gte('date', debut).lte('date', fin),
      supabase.from('douleurs').select('zone, intensite, note').eq('user_id', user.id).gte('date_seance', debut).lte('date_seance', fin),
      supabase.from('profil').select('objectif, objectif_pas').eq('user_id', user.id).single(),
    ])

    // Séances
    const joursAvecSeance = new Set((seancesDuree || []).map(s => s.date_seance))
    const dureeTotal = Math.round((seancesDuree || []).reduce((a, s) => a + (s.duree_secondes || 0), 0) / 60)
    const freqExos = {}
    ;(seancesLog || []).forEach(l => {
      if (l.exercice_nom && !l.exercice_nom.includes(' — ')) {
        freqExos[l.exercice_nom] = (freqExos[l.exercice_nom] || 0) + 1
      }
    })
    const topExos = Object.entries(freqExos).sort((a,b) => b[1]-a[1]).slice(0,4).map(([nom]) => nom)
    const volume = Math.round((seancesLog || []).reduce((a, l) => {
      return a + (Math.abs(l.poids_kg || 0) * (l.repetitions_faites || 0))
    }, 0))

    // Nutrition
    const repasParJour = {}
    ;(repas || []).forEach(r => {
      if (!repasParJour[r.date_repas]) repasParJour[r.date_repas] = { kcal: 0, prot: 0 }
      const kcal = r.options_repas?.kcal || r.kcal_libre || 0
      const prot = r.options_repas?.proteines_g || r.proteines_libre || 0
      repasParJour[r.date_repas].kcal += kcal
      repasParJour[r.date_repas].prot += prot
    })
    const joursNutrition = Object.keys(repasParJour)
    const moyenneKcal = joursNutrition.length > 0
      ? Math.round(joursNutrition.reduce((a, j) => a + repasParJour[j].kcal, 0) / joursNutrition.length)
      : 0
    const moyenneProteines = joursNutrition.length > 0
      ? Math.round(joursNutrition.reduce((a, j) => a + repasParJour[j].prot, 0) / joursNutrition.length)
      : 0

    // Pas
    const objPas = profilData?.objectif_pas || objectifPas || 8000
    const pasMoyenne = (pasData || []).length > 0
      ? Math.round((pasData || []).reduce((a, p) => a + p.pas, 0) / (pasData || []).length)
      : 0
    const joursObjAtteint = (pasData || []).filter(p => p.pas >= objPas).length

    return {
      seances: { nombre: joursAvecSeance.size, dureeTotal, exercices: topExos, volume },
      nutrition: { joursEnregistres: joursNutrition.length, moyenneKcal, objectifKcal: objectifKcal || 0, moyenneProteines },
      pas: { moyenne: pasMoyenne, objectif: objPas, joursObjectifAtteint: joursObjAtteint },
      douleurs: douleurs || [],
      objectif: profilData?.objectif === 'perte_poids' ? 'perte de poids'
        : profilData?.objectif === 'prise_masse' ? 'prise de masse' : 'maintien',
    }
  }

  async function generer() {
    setLoading(true)
    setErreur(null)
    try {
      const donnees = await collecterDonnees()
      if (!donnees) throw new Error('Données non disponibles')

      const res = await fetch('/api/ia/bilan-hebdo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donnees }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      const data = await res.json()

      // Mettre en cache
      localStorage.setItem(CLE_CACHE, JSON.stringify(data.bilan))
      localStorage.setItem(CLE_DATE, formatDate(debutSemainePrecedente()))

      setBilan(data.bilan)
      setOuvert(false) // Ne pas ouvrir automatiquement
    } catch {
      setErreur('Impossible de générer le bilan. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  const COULEURS_STATUT = {
    bien: { bg: '#dcfce7', text: '#16a34a', border: '#22c55e' },
    moyen: { bg: '#fef9c3', text: '#ca8a04', border: '#eab308' },
    attention: { bg: '#fee2e2', text: '#dc2626', border: '#ef4444' },
  }

  // Semaine en cours ou passée
  const lundiPrec = debutSemainePrecedente()
  const dimPrec = finSemainePrecedente()
  const labelSemaine = `${lundiPrec.getDate()}/${lundiPrec.getMonth()+1} – ${dimPrec.getDate()}/${dimPrec.getMonth()+1}`

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Bilan hebdomadaire</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Semaine du {labelSemaine}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {bilan && (
            <button onClick={() => setOuvert(v => !v)}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              {ouvert ? '▲ Réduire' : '▼ Voir'}
            </button>
          )}
          <button onClick={generer} disabled={loading}
            className="text-xs px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-40"
            style={{ background: 'var(--orange)', color: 'white' }}>
            {loading ? '...' : bilan ? '↺' : '🤖 Générer'}
          </button>
        </div>
      </div>

      {erreur && (
        <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{erreur}</p>
      )}

      {loading && (
        <div className="flex items-center gap-2 mt-3">
          <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin flex-shrink-0" />
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Analyse de ta semaine en cours...
          </p>
        </div>
      )}

      {bilan && ouvert && (
        <div className="flex flex-col gap-3 mt-3">

          {/* En-tête avec note */}
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{bilan.titre}</p>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold" style={{ color: bilan.note_globale >= 7 ? '#22c55e' : bilan.note_globale >= 5 ? '#f59e0b' : '#ef4444' }}>
                {bilan.note_globale}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>/10</span>
            </div>
          </div>

          {/* Résumé */}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bilan.resume}</p>

          {/* Sections */}
          <div className="flex flex-col gap-2">
            {bilan.sections?.map((s, i) => {
              const c = COULEURS_STATUT[s.statut] || COULEURS_STATUT.moyen
              return (
                <div key={i} className="rounded-xl px-3 py-2 flex gap-2"
                  style={{ background: c.bg, borderLeft: `3px solid ${c.border}` }}>
                  <span className="text-sm flex-shrink-0">{s.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: c.text }}>{s.titre}</p>
                    <p className="text-xs" style={{ color: c.text, opacity: 0.85 }}>{s.contenu}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Points fort / à améliorer */}
          <div className="grid grid-cols-2 gap-2">
            {bilan.point_fort && (
              <div className="rounded-xl p-2.5" style={{ background: '#dcfce7' }}>
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#16a34a' }}>✅ Point fort</p>
                <p className="text-xs" style={{ color: '#166534' }}>{bilan.point_fort}</p>
              </div>
            )}
            {bilan.point_ameliorer && (
              <div className="rounded-xl p-2.5" style={{ background: '#fef9c3' }}>
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#ca8a04' }}>🎯 À travailler</p>
                <p className="text-xs" style={{ color: '#854d0e' }}>{bilan.point_ameliorer}</p>
              </div>
            )}
          </div>

          {/* Recommandations */}
          {bilan.recommandations?.length > 0 && (
            <div className="rounded-xl p-2.5 flex flex-col gap-1.5"
              style={{ background: 'var(--surface-2)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                RECOMMANDATIONS
              </p>
              {bilan.recommandations.map((r, i) => (
                <p key={i} className="text-xs" style={{ color: 'var(--text-muted)' }}>→ {r}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
