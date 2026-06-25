'use client'
import { useEffect, useRef, useState } from 'react'

export default function TimerSeance({ actif }) {
  const [secondes, setSecondes] = useState(0)
  const [demarre, setDemarre] = useState(false)
  const intervalRef = useRef(null)

  // Démarre dès que actif passe à true (premier clic sur "Série terminée")
  useEffect(() => {
    if (actif && !demarre) {
      setDemarre(true)
    }
  }, [actif])

  useEffect(() => {
    if (!demarre) return
    intervalRef.current = setInterval(() => setSecondes((s) => s + 1), 1000)
    return () => clearInterval(intervalRef.current)
  }, [demarre])

  if (!demarre) return null

  const h = Math.floor(secondes / 3600)
  const m = Math.floor((secondes % 3600) / 60)
  const s = secondes % 60

  const label = h > 0
    ? `${h}h ${m.toString().padStart(2, '0')}min`
    : `${m}min ${s.toString().padStart(2, '0')}s`

  return (
    <div className="card flex items-center justify-between py-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">⏱️</span>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Durée de la séance</p>
          <p className="font-bold text-lg tabular-nums" style={{ color: 'var(--text)' }}>{label}</p>
        </div>
      </div>
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
    </div>
  )
}
