'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from './components/Header'
import { SkeletonListe } from './components/Skeleton'
import { ErreurChargement } from './components/Erreur'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [jours, setJours] = useState([])
  const [compteurs, setCompteurs] = useState({})
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    verifierEtCharger()
  }, [])

  async function verifierEtCharger() {
    setLoading(true)
    setErreur(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profil } = await supabase.from('profil').select('id').eq('user_id', user.id).single()
      if (!profil) { router.push('/onboarding'); return }

      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      const [{ data: joursData }, { data: exosData }] = await Promise.race([
        Promise.all([
          supabase.from('jours').select('*').order('numero'),
          supabase.from('exercices').select('jour_id').eq('user_id', user.id),
        ]),
        timeout,
      ])

      const counts = {}
      exosData?.forEach((e) => { counts[e.jour_id] = (counts[e.jour_id] || 0) + 1 })
      setJours(joursData || [])
      setCompteurs(counts)
    } catch (e) {
      setErreur(e.message === 'timeout'
        ? 'La connexion est trop lente. Supabase est peut-être indisponible.'
        : 'Impossible de charger les données. Vérifie ta connexion.')
    } finally {
      setLoading(false)
    }
  }

  const jourActuelNumero = (() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  })()

  return (
    <div>
      <div className="flex items-start justify-between mb-0">
        <Header title="Séances" subtitle="Planning d'entraînement" />
        <Link href="/historique"
          className="text-xs px-3 py-1.5 rounded-full mt-1 font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          📋 Historique
        </Link>
      </div>

      <Link href="/programmes" className="flex items-center justify-between card mb-4 py-3">
        <div className="flex items-center gap-2">
          <span>📋</span>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Changer de programme</p>
        </div>
        <span style={{ color: 'var(--text-faint)' }}>›</span>
      </Link>

      {loading ? (
        <SkeletonListe nb={7} lignes={2} />
      ) : erreur ? (
        <ErreurChargement message={erreur} onReessayer={verifierEtCharger} />
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
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {nbExos > 0 ? `${nbExos} exercice${nbExos > 1 ? 's' : ''}` : 'Repos / aucun exercice'}
                    </p>
                  </div>
                  <span className="text-xl" style={{ color: 'var(--text-faint)' }}>›</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
