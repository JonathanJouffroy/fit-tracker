'use client'
import { useState, useEffect } from 'react'
import { analyserProgression, progressionVersObjectif } from '@/lib/calculs'

const ICONE_STATUT = {
  debut: '🌱',
  progression: '📈',
  plateau: '⏸',
  regression: '📉',
  deload: '🔄',
  stable: '➡️',
}

const LABEL_STATUT = {
  debut: 'Débutant',
  progression: 'En progression',
  plateau: 'Plateau détecté',
  regression: 'Régression',
  deload: 'Reprise conseillée',
  stable: 'Stable',
}

export default function CoachExercice({ sessions, nomExercice, userId, supabase, onObjectifSaved }) {
  const [showFormObjectif, setShowFormObjectif] = useState(false)
  const [objectif, setObjectif] = useState(null)
  const [objectifId, setObjectifId] = useState(null)
  const [poidsCible, setPoidsCible] = useState('')
  const [dateCible, setDateCible] = useState('')
  const [loading, setLoading] = useState(false)

  // Charger l'objectif existant au montage
  useEffect(() => {
    if (!userId || !nomExercice || !supabase) return
    supabase.from('objectifs_exercice')
      .select('*')
      .eq('user_id', userId)
      .eq('exercice_nom', nomExercice)
      .single()
      .then(({ data }) => {
        if (data) {
          setObjectif(data)
          setObjectifId(data.id)
          setPoidsCible(data.poids_cible_kg)
          setDateCible(data.date_cible)
        }
      })
  }, [userId, nomExercice])

  const analyse = analyserProgression(sessions)
  const progObjectif = objectif ? progressionVersObjectif(sessions, objectif) : null

  async function sauvegarderObjectif(e) {
    e.preventDefault()
    if (!poidsCible || !dateCible || !userId) return
    setLoading(true)

    const { data } = await supabase.from('objectifs_exercice').upsert({
      user_id: userId,
      exercice_nom: nomExercice,
      poids_cible_kg: Number(poidsCible),
      date_cible: dateCible,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,exercice_nom' }).select().single()

    if (data) {
      setObjectif(data)
      setObjectifId(data.id)
    }
    setShowFormObjectif(false)
    setLoading(false)
    onObjectifSaved?.()
  }

  async function supprimerObjectif() {
    if (!objectifId) return
    await supabase.from('objectifs_exercice').delete().eq('id', objectifId)
    setObjectif(null)
    setObjectifId(null)
    setPoidsCible('')
    setDateCible('')
  }

  return (
    <div className="flex flex-col gap-3 mb-6">

      {/* Carte diagnostic principal */}
      <div className="card" style={{ borderLeft: `4px solid ${analyse.couleur}` }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{ICONE_STATUT[analyse.statut]}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                Coach — {LABEL_STATUT[analyse.statut]}
              </p>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: analyse.couleur + '22', color: analyse.couleur }}>
                {LABEL_STATUT[analyse.statut]}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {analyse.message}
            </p>
          </div>
        </div>

        {/* Suggestion de charge */}
        {analyse.suggestion && (
          <div className="mt-3 pt-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                CHARGE RECOMMANDÉE
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                {analyse.suggestion.raison}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: analyse.couleur }}>
                {analyse.suggestion.poids}kg
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Objectif personnel */}
      {!showFormObjectif && (
        <div>
          {objectif && progObjectif ? (
            <div className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  🎯 Objectif : {objectif.poids_cible_kg}kg
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowFormObjectif(true)}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                    Modifier
                  </button>
                  <button onClick={supprimerObjectif}
                    className="text-xs px-2 py-1 rounded-lg text-red-400"
                    style={{ background: 'var(--surface-2)' }}>
                    Suppr.
                  </button>
                </div>
              </div>

              {/* Barre de progression vers l'objectif */}
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>{progObjectif.poidsDepart}kg</span>
                  <span className="font-semibold" style={{ color: progObjectif.enAvance ? '#22c55e' : '#f59e0b' }}>
                    {progObjectif.poidsActuel}kg actuellement
                  </span>
                  <span>{progObjectif.poidsCible}kg</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${progObjectif.pourcentage}%`,
                      background: progObjectif.enAvance ? '#22c55e' : '#f59e0b',
                    }} />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span style={{ color: progObjectif.enAvance ? '#22c55e' : '#f59e0b' }}>
                    {progObjectif.enAvance
                      ? `+${progObjectif.avance}kg d'avance`
                      : `${Math.abs(progObjectif.avance)}kg de retard`}
                  </span>
                  <span style={{ color: 'var(--text-faint)' }}>
                    {progObjectif.joursRestants}j restants
                  </span>
                </div>
              </div>

              {/* Rythme nécessaire */}
              {progObjectif.joursRestants > 0 && progObjectif.poidsActuel < progObjectif.poidsCible && (
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  Il te faut gagner{' '}
                  <span className="font-semibold" style={{ color: 'var(--orange)' }}>
                    {Math.round(((progObjectif.poidsCible - progObjectif.poidsActuel) / (progObjectif.joursRestants / 7)) * 10) / 10}kg/semaine
                  </span>{' '}
                  pour atteindre ton objectif dans les temps.
                </p>
              )}

              {progObjectif.pourcentage >= 100 && (
                <p className="text-sm font-semibold text-green-500 text-center">
                  🎉 Objectif atteint !
                </p>
              )}
            </div>
          ) : (
            <button onClick={() => setShowFormObjectif(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface)' }}>
              🎯 Définir un objectif de poids pour cet exercice
            </button>
          )}
        </div>
      )}

      {/* Formulaire objectif */}
      {showFormObjectif && (
        <form onSubmit={sauvegarderObjectif} className="card flex flex-col gap-3">
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
            Objectif pour {nomExercice}
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Poids cible (kg)</label>
              <input type="number" step="0.5" min="0"
                value={poidsCible}
                onChange={(e) => setPoidsCible(e.target.value)}
                className="input" placeholder="Ex: 120" required />
            </div>
            <div className="flex-1">
              <label className="label">Date limite</label>
              <input type="date" value={dateCible}
                onChange={(e) => setDateCible(e.target.value)}
                className="input" required
                min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowFormObjectif(false)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 btn-primary text-sm py-2 disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
