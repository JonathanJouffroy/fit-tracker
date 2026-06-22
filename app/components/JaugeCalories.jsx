'use client'

export default function JaugeCalories({ consomme, objectif }) {
  const pourcentage = objectif > 0 ? Math.min(100, (consomme / objectif) * 100) : 0
  const depasse = consomme > objectif
  const restant = objectif - consomme

  const couleur = depasse ? '#ef4444' : pourcentage > 85 ? '#f59e0b' : '#FF5722'

  return (
    <div className="card flex flex-col items-center gap-3">
      <p className="text-sm text-gray-500 font-medium">Calories du jour</p>

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
          <span className="text-3xl font-bold tabular-nums">{consomme}</span>
          <span className="text-xs text-gray-400">/ {objectif} kcal</span>
        </div>
      </div>

      <p className={`text-sm font-semibold ${depasse ? 'text-red-500' : 'text-gray-600'}`}>
        {depasse
          ? `${Math.abs(restant)} kcal au-dessus de l'objectif`
          : `${restant} kcal restantes aujourd'hui`}
      </p>
    </div>
  )
}
