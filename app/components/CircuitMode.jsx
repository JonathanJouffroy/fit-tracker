'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { calculerCaloriesExercice } from '@/lib/calculs'

function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch {}
}

// ---- Écran de configuration du circuit ----
function ConfigCircuit({ exercices, onDemarrer, onAnnuler }) {
  const [selectionnes, setSelectionnes] = useState(
    exercices.filter(e => e.type_exercice !== 'cardio').map(e => e.id)
  )
  const [tours, setTours] = useState(3)
  const [reposEntreExos, setReposEntreExos] = useState(15)
  const [reposEntreTours, setReposEntreTours] = useState(60)

  function toggleExo(id) {
    setSelectionnes(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const exosValides = exercices.filter(e =>
    e.type_exercice !== 'cardio' && selectionnes.includes(e.id)
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={onAnnuler} style={{ color: 'var(--orange)' }} className="text-sm">← Annuler</button>
        <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>⚡ Configurer le circuit</p>
        <div style={{ width: 60 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">

        {/* Sélection exercices */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>EXERCICES DU CIRCUIT</p>
          <div className="flex flex-col gap-2">
            {exercices.filter(e => e.type_exercice !== 'cardio').map(exo => (
              <button key={exo.id} onClick={() => toggleExo(exo.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                style={{
                  background: selectionnes.includes(exo.id) ? 'var(--orange)' : 'var(--surface)',
                  border: `1px solid ${selectionnes.includes(exo.id) ? 'var(--orange)' : 'var(--border)'}`,
                }}>
                <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    background: selectionnes.includes(exo.id) ? 'white' : 'transparent',
                    borderColor: selectionnes.includes(exo.id) ? 'white' : 'var(--border)',
                  }}>
                  {selectionnes.includes(exo.id) && <span style={{ color: 'var(--orange)', fontSize: 10 }}>✓</span>}
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: selectionnes.includes(exo.id) ? 'white' : 'var(--text)' }}>
                    {exo.nom}
                  </p>
                  <p className="text-xs" style={{ color: selectionnes.includes(exo.id) ? 'rgba(255,255,255,0.7)' : 'var(--text-faint)' }}>
                    {exo.series}×{exo.repetitions}
                    {exo.poids_charge_kg > 0 ? ` · ${exo.poids_charge_kg}kg` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Paramètres */}
        <div className="card flex flex-col gap-4">
          <div>
            <label className="label">Nombre de tours</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setTours(t => Math.max(1, t - 1))}
                className="w-10 h-10 rounded-xl text-xl font-bold"
                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>−</button>
              <span className="text-2xl font-bold w-10 text-center" style={{ color: 'var(--text)' }}>{tours}</span>
              <button onClick={() => setTours(t => Math.min(10, t + 1))}
                className="w-10 h-10 rounded-xl text-xl font-bold"
                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>+</button>
            </div>
          </div>

          <div>
            <label className="label">Repos entre exercices (secondes)</label>
            <div className="flex gap-2 flex-wrap">
              {[10, 15, 20, 30, 45].map(s => (
                <button key={s} onClick={() => setReposEntreExos(s)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    background: reposEntreExos === s ? 'var(--orange)' : 'var(--surface-2)',
                    color: reposEntreExos === s ? 'white' : 'var(--text-muted)',
                  }}>
                  {s}s
                </button>
              ))}
              <input type="number" min="5" max="120" value={reposEntreExos}
                onChange={e => setReposEntreExos(Number(e.target.value))}
                className="input w-20 text-sm" />
            </div>
          </div>

          <div>
            <label className="label">Repos entre tours (secondes)</label>
            <div className="flex gap-2 flex-wrap">
              {[45, 60, 90, 120].map(s => (
                <button key={s} onClick={() => setReposEntreTours(s)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    background: reposEntreTours === s ? 'var(--orange)' : 'var(--surface-2)',
                    color: reposEntreTours === s ? 'white' : 'var(--text-muted)',
                  }}>
                  {s}s
                </button>
              ))}
              <input type="number" min="10" max="300" value={reposEntreTours}
                onChange={e => setReposEntreTours(Number(e.target.value))}
                className="input w-20 text-sm" />
            </div>
          </div>
        </div>

        {/* Résumé */}
        {exosValides.length > 0 && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {exosValides.length} exercices · {tours} tours ·{' '}
              ~{Math.round((exosValides.length * reposEntreExos + reposEntreTours) * tours / 60)} min estimées
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => exosValides.length >= 2 && onDemarrer({ exos: exosValides, tours, reposEntreExos, reposEntreTours })}
          disabled={exosValides.length < 2}
          className="w-full btn-primary py-4 text-base font-bold disabled:opacity-40">
          {exosValides.length < 2 ? 'Sélectionne au moins 2 exercices' : `⚡ Démarrer le circuit (${tours} tours)`}
        </button>
      </div>
    </div>
  )
}

// ---- Timer de repos ----
function TimerReposCircuit({ duree, label, onTermine }) {
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
    <div className="flex flex-col items-center gap-4 py-8">
      <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>
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

// ---- Écran principal du circuit ----
export default function CircuitMode({ exercices, userId, poidsCorps, onTerminer }) {
  const supabase = createClient()
  const [phase, setPhase] = useState('config') // config | running | repos-exo | repos-tour | termine
  const [config, setConfig] = useState(null)
  const [tourActuel, setTourActuel] = useState(1)
  const [exoActuelIdx, setExoActuelIdx] = useState(0)
  const [repsInput, setRepsInput] = useState({})
  const [logsCircuit, setLogsCircuit] = useState([])

  function demarrer(cfg) {
    setConfig(cfg)
    const repsInit = {}
    cfg.exos.forEach(e => { repsInit[e.id] = e.repetitions })
    setRepsInput(repsInit)
    setPhase('running')
  }

  async function validerExercice() {
    const exo = config.exos[exoActuelIdx]
    const reps = Number(repsInput[exo.id]) || exo.repetitions

    // Logger dans seances_log
    await supabase.from('seances_log').insert([{
      user_id: userId,
      exercice_id: exo.id,
      exercice_nom: exo.nom,
      serie_numero: tourActuel,
      repetitions_faites: reps,
      poids_kg: exo.poids_charge_kg || null,
    }])

    setLogsCircuit(prev => [...prev, { exoId: exo.id, nom: exo.nom, tour: tourActuel, reps }])

    // Prochain exercice ou fin de tour
    const estDernierExo = exoActuelIdx === config.exos.length - 1
    const estDernierTour = tourActuel === config.tours

    if (!estDernierExo) {
      setPhase('repos-exo')
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

  // ---- CONFIG ----
  if (phase === 'config') {
    return <ConfigCircuit exercices={exercices} onDemarrer={demarrer} onAnnuler={onTerminer} />
  }

  // ---- REPOS ENTRE EXERCICES ----
  if (phase === 'repos-exo') {
    const prochain = config.exos[exoActuelIdx + 1]
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
        style={{ background: 'var(--bg)' }}>
        <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
          Prochain : <span className="font-semibold" style={{ color: 'var(--orange)' }}>{prochain?.nom}</span>
        </p>
        <TimerReposCircuit duree={config.reposEntreExos} label="Repos" onTermine={apresReposExo} />
      </div>
    )
  }

  // ---- REPOS ENTRE TOURS ----
  if (phase === 'repos-tour') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
        style={{ background: 'var(--bg)' }}>
        <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
          Tour {tourActuel}/{config.tours} terminé 💪
        </p>
        <TimerReposCircuit duree={config.reposEntreTours} label="Repos entre tours" onTermine={apresReposTour} />
      </div>
    )
  }

  // ---- TERMINE ----
  if (phase === 'termine') {
    const kcalTotal = poidsCorps ? logsCircuit.reduce((total, l) => {
      const exo = config.exos.find(e => e.id === l.exoId)
      if (!exo) return total
      return total + (calculerCaloriesExercice({
        series: 1, repetitions: l.reps,
        poidsCharge: exo.poids_charge_kg || 0, poidsCorps,
      }))
    }, 0) : 0

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 gap-4"
        style={{ background: 'var(--bg)' }}>
        <span className="text-5xl">🏆</span>
        <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Circuit terminé !</p>
        <div className="card w-full max-w-xs flex flex-col gap-2 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {config.tours} tours · {config.exos.length} exercices · {logsCircuit.length} séries
          </p>
          {kcalTotal > 0 && (
            <p className="text-xl font-bold" style={{ color: 'var(--orange)' }}>
              🔥 {Math.round(kcalTotal)} kcal
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {logsCircuit.slice(0, 6).map((l, i) => (
            <div key={i} className="flex justify-between text-sm px-2">
              <span style={{ color: 'var(--text-muted)' }}>Tour {l.tour} · {l.nom}</span>
              <span style={{ color: 'var(--text)' }}>{l.reps} reps</span>
            </div>
          ))}
        </div>
        <button onClick={onTerminer} className="btn-primary w-full max-w-xs py-3 font-bold">
          Terminer
        </button>
      </div>
    )
  }

  // ---- RUNNING ----
  const exo = config.exos[exoActuelIdx]
  const progression = ((tourActuel - 1) * config.exos.length + exoActuelIdx) / (config.tours * config.exos.length)

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => {
          if (confirm('Abandonner le circuit ?')) onTerminer()
        }} className="text-sm" style={{ color: 'var(--text-faint)' }}>✕ Abandonner</button>
        <div className="text-center">
          <p className="text-xs font-semibold" style={{ color: 'var(--orange)' }}>
            TOUR {tourActuel}/{config.tours}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Exercice {exoActuelIdx + 1}/{config.exos.length}
          </p>
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Barre de progression */}
      <div className="w-full h-1" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full transition-all" style={{ width: `${progression * 100}%`, background: 'var(--orange)' }} />
      </div>

      {/* Contenu */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        {/* Nom exercice */}
        <div className="text-center">
          <p className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>{exo.nom}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {exo.repetitions} reps cibles
            {exo.poids_charge_kg > 0 && ` · ${exo.poids_charge_kg}kg`}
          </p>
        </div>

        {/* Saisie reps réelles */}
        <div className="card w-full max-w-xs flex flex-col items-center gap-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>REPS EFFECTUÉES</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setRepsInput(r => ({ ...r, [exo.id]: Math.max(1, (r[exo.id] || exo.repetitions) - 1) }))}
              className="w-12 h-12 rounded-xl text-2xl font-bold"
              style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>−</button>
            <input type="number" min="1"
              value={repsInput[exo.id] || exo.repetitions}
              onChange={e => setRepsInput(r => ({ ...r, [exo.id]: Number(e.target.value) }))}
              className="text-4xl font-bold w-20 text-center bg-transparent border-none outline-none tabular-nums"
              style={{ color: 'var(--text)' }} />
            <button onClick={() => setRepsInput(r => ({ ...r, [exo.id]: (r[exo.id] || exo.repetitions) + 1 }))}
              className="w-12 h-12 rounded-xl text-2xl font-bold"
              style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>+</button>
          </div>
        </div>

        {/* Exercices suivants */}
        {config.exos.length > 1 && (
          <div className="w-full max-w-xs">
            <p className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>Suite du circuit</p>
            <div className="flex gap-1 flex-wrap">
              {config.exos.map((e, i) => (
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
          </div>
        )}
      </div>

      {/* Bouton valider */}
      <div className="px-4 pb-6 pt-3 flex-shrink-0">
        <button onClick={validerExercice} className="w-full btn-primary py-4 text-lg font-bold">
          {exoActuelIdx === config.exos.length - 1 && tourActuel === config.tours
            ? '🏆 Terminer le circuit'
            : exoActuelIdx === config.exos.length - 1
              ? `✓ Fin du tour ${tourActuel}`
              : '✓ Exercice suivant'}
        </button>
      </div>
    </div>
  )
}
