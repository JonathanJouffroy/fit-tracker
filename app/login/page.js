'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErreur('')
    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setErreur(error.message); setLoading(false); return }
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) { setErreur(loginError.message); setLoading(false); return }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setErreur('Email ou mot de passe incorrect'); setLoading(false); return }
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1rem' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div className="text-center mb-8">
          <p className="text-4xl mb-2">🏋️</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Fit Tracker</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'Connecte-toi pour accéder à ton programme' : 'Crée ton compte gratuitement'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoFocus className="input" placeholder="ton@email.com" />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} className="input" placeholder="6 caractères minimum" />
          </div>

          {erreur && <p className="text-sm" style={{ color: '#ef4444' }}>{erreur}</p>}

          <button type="submit" disabled={loading} className="btn-primary py-3 font-semibold text-sm disabled:opacity-50">
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>

          <button type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErreur('') }}
            className="text-sm text-center underline"
            style={{ color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
