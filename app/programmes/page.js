'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/app/components/Toast'
import Header from '@/app/components/Header'

const JOURS_LABELS = { 1:'Lun', 2:'Mar', 3:'Mer', 4:'Jeu', 5:'Ven', 6:'Sam', 7:'Dim' }

export default function Programmes() {
  const supabase = createClient()
  const router = useRouter()
  const toast = useToast()
  const [userId, setUserId] = useState(null)
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [programmeOuvert, setProgrammeOuvert] = useState(null)
  const [applicationEnCours, setApplicationEnCours] = useState(null)

  // Formulaire nouveau programme perso
  const [showForm, setShowForm] = useState(false)
  const [nomProg, setNomProg] = useState('')
  const [descProg, setDescProg] = useState('')

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Programmes fixes + programmes perso de l'utilisateur
    const { data: progs } = await supabase.from('programmes')
      .select('*, programme_exercices(*, jours(numero, nom))')
      .or(`est_fixe.eq.true,user_id.eq.${user.id}`)
      .order('est_fixe', { ascending: false })
      .order('created_at')

    setProgrammes(progs || [])
    setLoading(false)
  }

  // Applique un programme : efface les exercices actuels de la semaine et insère les nouveaux
  async function appliquerProgramme(prog) {
    if (!confirm(`Appliquer "${prog.nom}" ? Tes exercices actuels seront remplacés.`)) return
    setApplicationEnCours(prog.id)

    // Supprimer tous les exercices de la semaine de l'utilisateur
    await supabase.from('exercices').delete().eq('user_id', userId)

    // Insérer les exercices du programme
    const nouveauxExercices = (prog.programme_exercices || []).map((pe) => ({
      user_id: userId,
      jour_id: pe.jour_id,
      nom: pe.nom,
      series: pe.series,
      repetitions: pe.repetitions,
      repos_secondes: pe.repos_secondes,
      poids_charge_kg: pe.poids_charge_kg || 0,
      ordre: pe.ordre,
    }))

    if (nouveauxExercices.length > 0) {
      await supabase.from('exercices').insert(nouveauxExercices)
    }

    setApplicationEnCours(null)
    toast('Programme appliqué à ta semaine ✓')
  }

  async function creerProgramme(e) {
    e.preventDefault()
    if (!nomProg.trim() || !userId) return

    const { data, error } = await supabase.from('programmes').insert([{
      user_id: userId,
      nom: nomProg,
      description: descProg,
      est_fixe: false,
    }]).select().single()

    if (error) { toast('Erreur lors de la création', 'error'); return }

    // Copier les exercices actuels de la semaine dans ce programme
    const { data: exosActuels } = await supabase.from('exercices')
      .select('*').eq('user_id', userId)

    if (exosActuels?.length > 0) {
      await supabase.from('programme_exercices').insert(
        exosActuels.map((e) => ({
          programme_id: data.id,
          jour_id: e.jour_id,
          nom: e.nom,
          series: e.series,
          repetitions: e.repetitions,
          repos_secondes: e.repos_secondes,
          poids_charge_kg: e.poids_charge_kg || 0,
          ordre: e.ordre,
        }))
      )
    }

    setNomProg(''); setDescProg(''); setShowForm(false)
    toast(`Programme "${nomProg}" créé avec ta semaine actuelle ✓`)
    charger()
  }

  async function supprimerProgramme(id, nom) {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    await supabase.from('programmes').delete().eq('id', id)
    toast('Programme supprimé')
    charger()
  }

  // Grouper les exercices d'un programme par jour
  function exercicesParJour(prog) {
    const groupes = {}
    prog.programme_exercices?.forEach((pe) => {
      const num = pe.jours?.numero
      if (!groupes[num]) groupes[num] = { label: pe.jours?.nom, exos: [] }
      groupes[num].exos.push(pe)
    })
    return Object.entries(groupes).sort(([a], [b]) => Number(a) - Number(b))
  }

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm mb-3" style={{ color: 'var(--orange)' }}>← Retour</button>
      <Header title="Programmes" subtitle="Templates d'entraînement" />

      {/* Créer un programme depuis ma semaine actuelle */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full mb-6">
          + Sauvegarder ma semaine actuelle comme programme
        </button>
      ) : (
        <form onSubmit={creerProgramme} className="card mb-6 flex flex-col gap-3">
          <p className="font-semibold text-sm">Nouveau programme</p>
          <div>
            <label className="label">Nom du programme</label>
            <input value={nomProg} onChange={(e) => setNomProg(e.target.value)}
              placeholder="Ex: Mon programme été" className="input" autoFocus required />
          </div>
          <div>
            <label className="label">Description (optionnel)</label>
            <input value={descProg} onChange={(e) => setDescProg(e.target.value)}
              placeholder="Ex: Objectif prise de masse" className="input" />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Les exercices de ta semaine actuelle seront copiés dans ce programme.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
              Annuler
            </button>
            <button type="submit" className="flex-1 btn-primary text-sm py-2">Créer</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Programmes fixes */}
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
            Programmes prêts à l'emploi
          </p>
          {programmes.filter((p) => p.est_fixe).map((prog) => (
            <ProgrammeCard key={prog.id} prog={prog}
              exercicesParJour={exercicesParJour(prog)}
              ouvert={programmeOuvert === prog.id}
              onToggle={() => setProgrammeOuvert(programmeOuvert === prog.id ? null : prog.id)}
              onAppliquer={() => appliquerProgramme(prog)}
              enCours={applicationEnCours === prog.id}
            />
          ))}

          {/* Programmes perso */}
          {programmes.filter((p) => !p.est_fixe).length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide mt-2" style={{ color: 'var(--text-faint)' }}>
                Mes programmes
              </p>
              {programmes.filter((p) => !p.est_fixe).map((prog) => (
                <ProgrammeCard key={prog.id} prog={prog}
                  exercicesParJour={exercicesParJour(prog)}
                  ouvert={programmeOuvert === prog.id}
                  onToggle={() => setProgrammeOuvert(programmeOuvert === prog.id ? null : prog.id)}
                  onAppliquer={() => appliquerProgramme(prog)}
                  onSupprimer={() => supprimerProgramme(prog.id, prog.nom)}
                  enCours={applicationEnCours === prog.id}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ProgrammeCard({ prog, exercicesParJour, ouvert, onToggle, onAppliquer, onSupprimer, enCours }) {
  const nbExos = prog.programme_exercices?.length || 0
  const nbJours = exercicesParJour.length

  return (
    <div className="card flex flex-col gap-3">
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{prog.nom}</p>
              {prog.est_fixe && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>
                  Officiel
                </span>
              )}
            </div>
            {prog.description && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{prog.description}</p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
              {nbJours} jour{nbJours > 1 ? 's' : ''} · {nbExos} exercice{nbExos > 1 ? 's' : ''}
            </p>
          </div>
          <span style={{ color: 'var(--text-faint)' }} className="text-sm">{ouvert ? '▲' : '▼'}</span>
        </div>
      </button>

      {ouvert && (
        <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          {exercicesParJour.map(([num, { label, exos }]) => (
            <div key={num}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <div className="flex flex-col gap-1">
                {exos.sort((a, b) => a.ordre - b.ordre).map((exo) => (
                  <div key={exo.id} className="flex justify-between text-sm">
                    <span>{exo.nom}</span>
                    <span style={{ color: 'var(--text-faint)' }}>{exo.series}×{exo.repetitions}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button onClick={onAppliquer} disabled={enCours} className="flex-1 btn-primary text-sm py-2">
              {enCours ? 'Application...' : 'Appliquer à ma semaine'}
            </button>
            {onSupprimer && (
              <button onClick={onSupprimer}
                className="px-3 py-2 rounded-xl text-sm font-medium text-red-500"
                style={{ background: 'var(--surface-2)' }}>
                Suppr.
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
