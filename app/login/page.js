'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'register'
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
      // Après inscription, on connecte directement
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-2">🏋️</p>
          <h1 className="text-2xl font-bold">Fit Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login' ? 'Connecte-toi pour accéder à ton programme' : 'Crée ton compte gratuitement'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Email</label>
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required autoFocus
              className="border rounded-lg px-3 py-2.5 w-full text-sm"
              placeholder="ton@email.com"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Mot de passe</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              required minLength={6}
              className="border rounded-lg px-3 py-2.5 w-full text-sm"
              placeholder="6 caractères minimum"
            />
          </div>

          {erreur && <p className="text-red-500 text-sm">{erreur}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-orange-600 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErreur('') }}
            className="text-sm text-gray-500 text-center underline"
          >
            {mode === 'login' ? 'Pas encore de compte ? S\'inscrire' : 'Déjà un compte ? Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
