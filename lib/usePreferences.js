'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const CLE = 'fit_tracker_prefs'

export function usePreferences() {
  const [prefs, setPrefs] = useState({ mode_nutrition: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CLE)
      if (cached) setPrefs(JSON.parse(cached))
    } catch {}

    async function sync() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profil')
          .select('mode_nutrition').eq('user_id', user.id).single()
        if (data) {
          const newPrefs = { mode_nutrition: data.mode_nutrition ?? true }
          setPrefs(newPrefs)
          localStorage.setItem(CLE, JSON.stringify(newPrefs))
        }
      } catch {}
      setLoading(false)
    }
    sync()
  }, [])

  return { prefs, loading }
}
