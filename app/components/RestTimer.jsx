'use client'
import { useEffect, useRef, useState } from 'react'

export default function RestTimer({ dureeSecondes, onTermine }) {
  const [tempsRestant, setTempsRestant] = useState(dureeSecondes)
  const [enCours, setEnCours] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    setTempsRestant(dureeSecondes)
    setEnCours(true)
  }, [dureeSecondes])

  useEffect(() => {
    if (!enCours) return

    intervalRef.current = setInterval(() => {
      setTempsRestant((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current)
          setEnCours(false)
          // Vibration si supportée (mobile)
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          onTermine?.()
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [enCours])

  function ajouterTemps(secondes) {
    setTempsRestant((t) => Math.max(0, t + secondes))
    if (tempsRestant <= 0) setEnCours(true)
  }

  function togglePause() {
    setEnCours((e) => !e)
  }

  const minutes = Math.floor(tempsRestant / 60)
  const secs = tempsRestant % 60
  const pourcentage = ((dureeSecondes - tempsRestant) / dureeSecondes) * 100

  return (
    <div className="card flex flex-col items-center gap-4">
      <p className="text-sm text-gray-500 font-medium">Temps de repos</p>

      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#f0f0f0" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={tempsRestant === 0 ? '#22c55e' : '#FF5722'}
            strokeWidth="8"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={2 * Math.PI * 45 * (1 - pourcentage / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span className="text-3xl font-bold tabular-nums">
          {minutes}:{secs.toString().padStart(2, '0')}
        </span>
      </div>

      <div className="flex gap-2 w-full">
        <button onClick={() => ajouterTemps(-15)} className="flex-1 py-2 rounded-xl bg-gray-100 font-medium text-sm">
          -15s
        </button>
        <button onClick={togglePause} className="flex-[2] py-2 rounded-xl bg-orange-600 text-white font-semibold text-sm">
          {enCours ? 'Pause' : tempsRestant === 0 ? 'Relancer' : 'Reprendre'}
        </button>
        <button onClick={() => ajouterTemps(15)} className="flex-1 py-2 rounded-xl bg-gray-100 font-medium text-sm">
          +15s
        </button>
      </div>

      {tempsRestant === 0 && (
        <p className="text-green-600 font-semibold text-sm">Repos terminé, c'est reparti 💪</p>
      )}
    </div>
  )
}
