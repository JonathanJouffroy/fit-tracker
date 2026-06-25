'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Header({ title, subtitle }) {
  const router = useRouter()
  const supabase = createClient()

  async function seDeconnecter() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex justify-between items-start mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <button onClick={seDeconnecter} className="text-xs text-gray-400 mt-1 px-2 py-1 rounded-lg bg-gray-100">
        Déconnexion
      </button>
    </div>
  )
}
