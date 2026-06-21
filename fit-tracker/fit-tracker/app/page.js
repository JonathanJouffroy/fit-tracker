'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [jours, setJours] = useState([])
  const [compteurs, setCompteurs] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chargerJours()
  }, [])

  async function chargerJours() {
    setLoading(true)
    const { data: joursData } = await supabase
      .from('jours')
      .select('*')
      .order('numero')

    const { data: exosData } = await supabase
      .from('exercices')
      .select('jour_id')

    const counts = {}
    exosData?.forEach((e) => {
      counts[e.jour_id] = (counts[e.jour_id] || 0) + 1
    })

    setJours(joursData || [])
    setCompteurs(counts)
    setLoading(false)
  }

  const jourActuelNumero = (() => {
    const d = new Date().getDay() // 0 = dimanche
    return d === 0 ? 7 : d
  })()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Ma semaine</h1>
      <p className="text-gray-500 mb-6">Planning d'entraînement</p>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
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
