'use client'
import { useState } from 'react'
import { ACTIVITES_CARDIO, calculerCaloriesCardio } from '@/lib/calculs'

export default function FormCardio({ exo, poidsCorps, onTerminer, onAnnuler }) {
  const activite = ACTIVITES_CARDIO.find(a => a.id === exo.activite_cardio)
  const [valeurs, setValeurs] = useState({})
  const [loading, setLoading] = useState(false)

  if (!activite) return null

  const kcalEstime = calculerCaloriesCardio({
    activiteId: exo.activite_cardio,
    dureeMinutes: Number(valeurs.duree_minutes) || 0,
    poidsCorps,
    deniveleM: Number(valeurs.denivele_m) || 0,
  })

  // Allure calculée pour la course
  const allure = (() => {
    if (exo.activite_cardio !== 'course') return null
    const duree = Number(valeurs.duree_minutes)
    const dist = Number(valeurs.distance_m)
    if (!duree || !dist || dist <= 0) return null
    const minParKm = duree / dist
    const min = Math.floor(minParKm)
    const sec = Math.round((minParKm - min) * 60)
    return `${min}:${sec.toString().padStart(2, '0')}/km`
  })()

  async function valider() {
    const duree = Number(valeurs.duree_minutes)
    if (!duree || duree <= 0) return
    setLoading(true)
    await onTerminer({
      duree_minutes: duree,
      distance_m: valeurs.distance_m ? Number(valeurs.distance_m) : null,
      denivele_m: valeurs.denivele_m ? Number(valeurs.denivele_m) : null,
      nb_sauts: valeurs.nb_sauts ? Number(valeurs.nb_sauts) : null,
      note_cardio: valeurs.note_cardio || null,
      kcal: kcalEstime,
    })
    setLoading(false)
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">{activite.label.split(' ')[1]}</span>
        <p className="font-semibold" style={{ color: 'var(--text)' }}>{exo.nom}</p>
      </div>

      {activite.metriques.map((metrique) => (
        <div key={metrique.id}>
          <label className="label">
            {metrique.label}{metrique.required && ' *'}
          </label>
          <input
            type={metrique.type}
            min={metrique.type === 'number' ? '0' : undefined}
            step={metrique.type === 'number' ? '0.1' : undefined}
            value={valeurs[metrique.id] || ''}
            onChange={(e) => setValeurs((v) => ({ ...v, [metrique.id]: e.target.value }))}
            placeholder={metrique.placeholder}
            className="input"
          />
        </div>
      ))}

      {/* Infos calculées automatiquement */}
      <div className="flex gap-3 flex-wrap">
        {kcalEstime > 0 && poidsCorps && (
          <div className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>
            🔥 ~{kcalEstime} kcal
          </div>
        )}
        {allure && (
          <div className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            ⚡ {allure}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onAnnuler}
          className="flex-1 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
          Annuler
        </button>
        <button onClick={valider} disabled={loading || !valeurs.duree_minutes}
          className="flex-[2] btn-primary text-sm py-2 disabled:opacity-50">
          {loading ? 'Enregistrement...' : 'Valider la séance ✓'}
        </button>
      </div>
    </div>
  )
}
