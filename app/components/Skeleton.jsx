'use client'

// Bloc générique animé
export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: 'var(--surface-2)', ...style }}
    />
  )
}

// Carte skeleton (remplace une .card)
export function SkeletonCard({ lignes = 2, height }) {
  return (
    <div className="card flex flex-col gap-3" style={height ? { height } : {}}>
      {Array.from({ length: lignes }).map((_, i) => (
        <Skeleton key={i} style={{ height: '14px', width: i === 0 ? '60%' : '40%' }} />
      ))}
    </div>
  )
}

// Liste de cartes skeleton
export function SkeletonListe({ nb = 4, lignes = 2 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: nb }).map((_, i) => (
        <SkeletonCard key={i} lignes={lignes} />
      ))}
    </div>
  )
}

// Skeleton pour la jauge circulaire (profil)
export function SkeletonJauge() {
  return (
    <div className="card flex flex-col items-center gap-3 mb-6">
      <Skeleton style={{ height: '12px', width: '120px' }} />
      <Skeleton style={{ width: '176px', height: '176px', borderRadius: '50%' }} />
      <Skeleton style={{ height: '12px', width: '160px' }} />
    </div>
  )
}

// Skeleton pour le graphique barres (profil)
export function SkeletonGraphique() {
  return (
    <div className="card mb-4">
      <Skeleton style={{ height: '12px', width: '140px', marginBottom: '12px' }} />
      <div className="flex items-end gap-1" style={{ height: '100px' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end gap-1">
            <Skeleton style={{ height: `${30 + Math.random() * 60}px`, borderRadius: '6px 6px 0 0' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton pour la page séance (exercices)
export function SkeletonExercice() {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton style={{ height: '16px', width: '55%' }} />
          <Skeleton style={{ height: '12px', width: '70%' }} />
        </div>
        <Skeleton style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
      </div>
      <div className="flex gap-2 mt-1">
        <Skeleton style={{ height: '40px', flex: 1 }} />
        <Skeleton style={{ height: '40px', flex: 1 }} />
        <Skeleton style={{ height: '40px', width: '100px' }} />
      </div>
      <div className="flex gap-1 mt-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} style={{ flex: 1, height: '6px' }} />
        ))}
      </div>
    </div>
  )
}

// Skeleton pour les options repas
export function SkeletonRepas() {
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton style={{ height: '15px', width: '65%' }} />
          <Skeleton style={{ height: '11px', width: '85%' }} />
        </div>
        <Skeleton style={{ width: '16px', height: '16px' }} />
      </div>
      <div className="flex gap-3 mt-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ height: '11px', width: '45px' }} />
        ))}
      </div>
    </div>
  )
}

// Skeleton pour les stats (3 cards en grille)
export function SkeletonStats({ nb = 3 }) {
  return (
    <div className={`grid gap-2 mb-4`} style={{ gridTemplateColumns: `repeat(${nb}, 1fr)` }}>
      {Array.from({ length: nb }).map((_, i) => (
        <div key={i} className="card flex flex-col items-center gap-2 py-3">
          <Skeleton style={{ height: '22px', width: '60px' }} />
          <Skeleton style={{ height: '11px', width: '50px' }} />
        </div>
      ))}
    </div>
  )
}
