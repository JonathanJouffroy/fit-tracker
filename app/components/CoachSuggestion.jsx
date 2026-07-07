'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { analyserProgression } from '@/lib/calculs'

export default function CoachSuggestion({ nomExercice, userId }) {
  const [suggestion, setSuggestion] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!nomExercice?.trim() || !userId) { setSuggestion(null); return }

    let annule = false

    const timer = setTimeout(async () => {
      setLoading(true)
      setSuggestion(null)
      try {
        const supabase = createClient()

        const { data: exos } = await supabase
          .from('exercices').select('id')
          .eq('user_id', userId).eq('nom', nomExercice.trim())

        if (annule || !exos?.length) return

        const ids = exos.map(e => e.id)
        const { data: logs } = await supabase
          .from('seances_log')
          .select('date_seance, poids_kg, repetitions_faites, exercice_id')
          .in('exercice_id', ids)
          .order('date_seance', { ascending: true })

        if (annule || !logs?.length) return

        const parDate = {}
        logs.forEach(l => {
          if (!parDate[l.date_seance]) parDate[l.date_seance] = []
          parDate[l.date_seance].push({
            poids: Number(l.poids_kg) || 0,
            reps: l.repetitions_faites || 0,
          })
        })

        const sessions = Object.entries(parDate).map(([date, series]) => ({
          date,
          series,
          // Garder poids_max pour compatibilité avec progressionVersObjectif
          poids_max: Math.max(...series.map(s => s.poids).filter(p => p > 0), 0) || null,
          reps_max: Math.max(...series.map(s => s.reps).filter(r => r > 0), 0) || null,
        }))

        if (annule || sessions.length === 0) return

        const diagnostic = analyserProgression(sessions)
        const derniere = sessions[sessions.length - 1]
        if (!annule) setSuggestion({ diagnostic, derniere })
      } catch {
        // Pas de suggestion si erreur
      } finally {
        if (!annule) setLoading(false)
      }
    }, 500)

    return () => {
      annule = true
      clearTimeout(timer)
    }
  }, [nomExercice, userId])

  if (!nomExercice?.trim()) return null

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: 'var(--surface-2)' }}>
        <div className="w-3 h-3 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Analyse en cours...</span>
      </div>
    )
  }

  if (!suggestion) return null

  const { diagnostic, derniere } = suggestion

  return (
    <div className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
      style={{ background: 'var(--surface-2)', borderLeft: `3px solid ${diagnostic.couleur}` }}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm">💡</span>
        <p className="text-xs font-semibold" style={{ color: diagnostic.couleur }}>
          Coach — {nomExercice}
        </p>
      </div>
      {derniere.poids_max && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Dernière séance : {derniere.poids_max}kg
          {derniere.reps_max ? ` × ${derniere.reps_max} reps` : ''}
        </p>
      )}
      {diagnostic.suggestion && (
        <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
          → Suggestion : {diagnostic.suggestion.poids}kg
          <span className="font-normal ml-1" style={{ color: 'var(--text-faint)' }}>
            ({diagnostic.suggestion.raison})
          </span>
        </p>
      )}
      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{diagnostic.message}</p>
    </div>
  )
}
