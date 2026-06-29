'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from './components/Header'
import { SkeletonListe } from './components/Skeleton'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [jours, setJours] = useState([])
  const [compteurs, setCompteurs] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verifierEtCharger()
  }, [])

  async function verifierEtCharger() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Vérifier que le profil a été rempli (onboarding)
    const { data: profil } = await supabase.from('profil').select('id').eq('user_id', user.id).single()
    if (!profil) { router.push('/onboarding'); return }

    const { data: joursData } = await supabase.from('jours').select('*').order('numero')
    const { data: exosData } = await supabase.from('exercices').select('jour_id').eq('user_id', user.id)

    const counts = {}
    exosData?.forEach((e) => { counts[e.jour_id] = (counts[e.jour_id] || 0) + 1 })

    setJours(joursData || [])
    setCompteurs(counts)
    setLoading(false)
  }

  const jourActuelNumero = (() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  })()

  return (
    <div>
      <Header title="Ma semaine" subtitle="Planning d'entraînement" />

      <Link href="/programmes" className="flex items-center justify-between card mb-4 py-3">
        <div className="flex items-center gap-2">
          <span>📋</span>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Changer de programme</p>
        </div>
        <span style={{ color: 'var(--text-faint)' }}>›</span>
      </Link>

      {loading ? (
        <SkeletonListe nb={7} lignes={2} />
      ) : (
        <div className="flex flex-col gap-3">
          {jours.map((jour) => {
            const isToday = jour.numero === jourActuelNumero
            const nbExos = compteurs[jour.id] || 0
            return (
              <Link key={jour.id} href={`/seance/${jour.id}`}>
                <div className={`card flex items-center justify-between ${isToday ? 'ring-2 ring-orange-500' : ''}`}>
                  <div>
                    <p className="font-semibold text-lg">
                      {jour.nom} {isToday && <span className="text-orange-600 text-sm">· aujourd'hui</span>}
                    </p>
                    <p className="text-sm text-gray-500">
                      {nbExos > 0 ? `${nbExos} exercice${nbExos > 1 ? 's' : ''}` : 'Repos / aucun exercice'}
                    </p>
                  </div>
                  <span className="text-gray-300 text-xl">›</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
