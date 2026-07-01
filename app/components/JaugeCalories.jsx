'use client'

export default function JaugeCalories({ consomme, objectif }) {
  const consommeOk = Number.isFinite(consomme) ? consomme : 0
  const objectifOk = Number.isFinite(objectif) && objectif > 0 ? objectif : null

  if (!objectifOk) {
    return (
      <div className="card flex flex-col items-center gap-2 py-8">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Renseigne ton profil pour voir tes calories cibles
        </p>
      </div>
    )
  }

  const pourcentage = Math.min(100, (consommeOk / objectifOk) * 100)
  const depasse = consommeOk > objectifOk
  const restant = Math.abs(objectifOk - consommeOk)

  const couleur = depasse ? '#ef4444' : pourcentage > 85 ? '#f59e0b' : '#FF5722'

  return (
    <div className="card flex flex-col items-center gap-3">
      <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Calories du jour</p>

      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#f0f0f0" strokeWidth="9" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={couleur}
            strokeWidth="9"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={2 * Math.PI * 45 * (1 - pourcentage / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
          />
        </svg>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold tabular-nums">{consommeOk}</span>
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>/ {objectifOk} kcal</span>
        </div>
      </div>

      <p className="text-sm font-semibold" style={{ color: depasse ? '#ef4444' : 'var(--text-muted)' }}>
        {depasse
          ? `${restant} kcal au-dessus de l'objectif`
          : `${restant} kcal restantes aujourd'hui`}
      </p>
    </div>
  )
}
