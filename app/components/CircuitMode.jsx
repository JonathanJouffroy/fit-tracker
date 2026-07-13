'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { calculerCaloriesExercice } from '@/lib/calculs'

function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    function jouerBip(delai) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.6, ctx.currentTime + delai)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delai + 0.4)
      osc.start(ctx.currentTime + delai)
      osc.stop(ctx.currentTime + delai + 0.4)
    }
    jouerBip(0)
    jouerBip(0.5)
  } catch {}
}

// ---- Timer de repos ----
function TimerRepos({ duree, label, prochain, onTermine }) {
  const [restant, setRestant] = useState(duree)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRestant(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current)
          bip()
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          onTermine()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const pct = (restant / duree) * 100

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {prochain && (
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
          Prochain : <span className="font-semibold" style={{ color: 'var(--orange)' }}>{prochain}</span>
        </p>
      )}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-2)" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none"
            stroke="var(--orange)" strokeWidth="8"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
            strokeLinecap="round" />
        </svg>
        <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>{restant}s</p>
      </div>
      <button onClick={onTermine}
        className="text-sm px-4 py-2 rounded-xl"
        style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
        Passer →
      </button>
    </div>
  )
}

// ---- Timer exercice (gainage etc) ----
function TimerExercice({ duree, onTermine }) {
  const [restant, setRestant] = useState(duree)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRestant(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current)
          bip()
          if (navigator.vibrate) navigator.vibrate([200])
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const pct = (restant / duree) * 100

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-2)" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none"
            stroke="#22c55e" strokeWidth="8"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
            strokeLinecap="round" />
        </svg>
        <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>{restant}s</p>
      </div>
      {restant === 0 && (
        <button onClick={onTermine} className="btn-primary px-6 py-2 text-sm">Suivant ✓</button>
      )}
    </div>
  )
}

// ---- Composant principal ----
export default function CircuitMode({ circuit, exosCircuit, userId, poidsCorps, onTerminer }) {
  const supabase = createClient()
  const [phase, setPhase] = useState('running') // running | repos-exo | repos-tour | termine
  const [tourActuel, setTourActuel] = useState(1)
  const [exoActuelIdx, setExoActuelIdx] = useState(0)
  const [repsInput, setRepsInput] = useState(() => {
    const init = {}
    exosCircuit.forEach(e => { if (e.repetitions) init[e.id] = e.repetitions })
    return init
  })
  const [timerActif, setTimerActif] = useState(false)
  const [logsCircuit, setLogsCircuit] = useState([])

  const exo = exosCircuit[exoActuelIdx]
  const estDernierExo = exoActuelIdx === exosCircuit.length - 1
  const estDernierTour = tourActuel === circuit.tours
  const sansReposEntreExos = circuit.repos_entre_exos === 0

  async function validerExercice() {
    // Logger dans seances_log
    await supabase.from('seances_log').insert([{
      user_id: userId,
      exercice_nom: `${circuit.nom} — ${exo.nom}`,
      serie_numero: tourActuel,
      repetitions_faites: repsInput[exo.id] || null,
      duree_minutes: exo.duree_secondes ? exo.duree_secondes / 60 : null,
      poids_kg: null,
    }])

    setLogsCircuit(prev => [...prev, {
      nom: exo.nom,
      tour: tourActuel,
      reps: repsInput[exo.id] || null,
      duree: exo.duree_secondes || null,
    }])

    if (!estDernierExo) {
      // Repos entre exercices ou enchaîner directement
      if (sansReposEntreExos) {
        setExoActuelIdx(i => i + 1)
      } else {
        setPhase('repos-exo')
      }
    } else if (!estDernierTour) {
      setPhase('repos-tour')
    } else {
      setPhase('termine')
    }
  }

  function apresReposExo() {
    setExoActuelIdx(i => i + 1)
    setPhase('running')
  }

  function apresReposTour() {
    setTourActuel(t => t + 1)
    setExoActuelIdx(0)
    setPhase('running')
  }

  // ---- REPOS ENTRE EXERCICES ----
  if (phase === 'repos-exo') {
    const prochain = exosCircuit[exoActuelIdx + 1]
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
        style={{ background: 'var(--bg)' }}>
        <TimerRepos
          duree={circuit.repos_entre_exos}
          label="Repos"
          prochain={prochain?.nom}
          onTermine={apresReposExo}
        />
      </div>
    )
  }

  // ---- REPOS ENTRE TOURS ----
  if (phase === 'repos-tour') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
        style={{ background: 'var(--bg)' }}>
        <p className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>
          Tour {tourActuel}/{circuit.tours} terminé 💪
        </p>
        <TimerRepos
          duree={circuit.repos_entre_tours}
          label="Repos entre tours"
          prochain={exosCircuit[0]?.nom}
          onTermine={apresReposTour}
        />
      </div>
    )
  }

  // ---- TERMINE ----
  if (phase === 'termine') {
    const kcalTotal = poidsCorps ? logsCircuit.reduce((total, l) => {
      const exoRef = exosCircuit.find(e => e.nom === l.nom)
      if (!exoRef || !l.reps) return total
      return total + calculerCaloriesExercice({
        series: 1, repetitions: l.reps,
        poidsCharge: 0, poidsCorps,
      })
    }, 0) : 0

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 gap-5"
        style={{ background: 'var(--bg)' }}>
        <span className="text-5xl">🏆</span>
        <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Circuit terminé !</p>
        <div className="card w-full max-w-xs text-center">
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            {circuit.tours} tours · {exosCircuit.length} exercices
          </p>
          {kcalTotal > 0 && (
            <p className="text-xl font-bold" style={{ color: 'var(--orange)' }}>
              🔥 {Math.round(kcalTotal)} kcal
            </p>
          )}
        </div>
        <div className="w-full max-w-xs flex flex-col gap-1">
          {logsCircuit.map((l, i) => (
            <div key={i} className="flex justify-between text-sm px-1">
              <span style={{ color: 'var(--text-muted)' }}>Tour {l.tour} · {l.nom}</span>
              <span style={{ color: 'var(--text)' }}>
                {l.reps ? `${l.reps} reps` : l.duree ? `${l.duree}s` : '✓'}
              </span>
            </div>
          ))}
        </div>
        <button onClick={() => onTerminer(Math.round(kcalTotal))} className="btn-primary w-full max-w-xs py-3 font-bold">
          Terminer
        </button>
      </div>
    )
  }

  // ---- RUNNING ----
  const progression = ((tourActuel - 1) * exosCircuit.length + exoActuelIdx) / (circuit.tours * exosCircuit.length)
  const hasReps = !!exo.repetitions
  const hasDuree = !!exo.duree_secondes

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => { if (confirm('Abandonner le circuit ?')) onTerminer(0) }}
          className="text-sm" style={{ color: 'var(--text-faint)' }}>✕</button>
        <div className="text-center">
          <p className="text-xs font-bold" style={{ color: 'var(--orange)' }}>
            {circuit.nom} · Tour {tourActuel}/{circuit.tours}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            {exoActuelIdx + 1}/{exosCircuit.length}
          </p>
        </div>
        <div style={{ width: 32 }} />
      </div>

      {/* Barre de progression */}
      <div className="w-full h-1 flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full transition-all" style={{ width: `${progression * 100}%`, background: 'var(--orange)' }} />
      </div>

      {/* Contenu */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        <p className="text-3xl font-bold text-center" style={{ color: 'var(--text)' }}>{exo.nom}</p>

        {/* Timer si durée */}
        {hasDuree && (
          <TimerExercice key={`${tourActuel}-${exoActuelIdx}`} duree={exo.duree_secondes} onTermine={validerExercice} />
        )}

        {/* Reps si répétitions */}
        {hasReps && (
          <div className="card w-full max-w-xs flex flex-col items-center gap-3">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>REPS EFFECTUÉES</p>
            <div className="flex items-center gap-4">
              <button onClick={() => setRepsInput(r => ({ ...r, [exo.id]: Math.max(1, (r[exo.id] || exo.repetitions) - 1) }))}
                className="w-12 h-12 rounded-xl text-2xl font-bold"
                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>−</button>
              <span className="text-4xl font-bold tabular-nums w-16 text-center"
                style={{ color: 'var(--text)' }}>
                {repsInput[exo.id] || exo.repetitions}
              </span>
              <button onClick={() => setRepsInput(r => ({ ...r, [exo.id]: (r[exo.id] || exo.repetitions) + 1 }))}
                className="w-12 h-12 rounded-xl text-2xl font-bold"
                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>+</button>
            </div>
          </div>
        )}

        {/* Si ni reps ni durée : juste un indicateur */}
        {!hasReps && !hasDuree && (
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Fais l'exercice puis valide</p>
        )}

        {/* Pastilles exercices */}
        <div className="flex gap-1.5 flex-wrap justify-center">
          {exosCircuit.map((e, i) => (
            <span key={e.id} className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: i === exoActuelIdx ? 'var(--orange)' : 'var(--surface-2)',
                color: i === exoActuelIdx ? 'white' : i < exoActuelIdx ? 'var(--text-faint)' : 'var(--text-muted)',
                textDecoration: i < exoActuelIdx ? 'line-through' : 'none',
              }}>
              {e.nom.length > 12 ? e.nom.slice(0, 11) + '…' : e.nom}
            </span>
          ))}
        </div>

        {sansReposEntreExos && !estDernierExo && (
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>⚡ Enchaînement direct</p>
        )}
      </div>

      {/* Bouton valider — caché si timer actif (on valide automatiquement) */}
      {!hasDuree && (
        <div className="px-4 pb-6 pt-3 flex-shrink-0">
          <button onClick={validerExercice} className="w-full btn-primary py-4 text-lg font-bold">
            {estDernierExo && estDernierTour ? '🏆 Terminer le circuit'
              : estDernierExo ? `✓ Fin du tour ${tourActuel}`
              : sansReposEntreExos ? `⚡ Enchaîner → ${exosCircuit[exoActuelIdx + 1]?.nom}`
              : '✓ Exercice suivant'}
          </button>
        </div>
      )}
    </div>
  )
}
