'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/app/components/Toast'
import AutocompleteInput from '@/app/components/AutocompleteInput'
import Header from '@/app/components/Header'
import { SkeletonListe } from '@/app/components/Skeleton'

const JOURS = [
  { id: 1, nom: 'Lundi' }, { id: 2, nom: 'Mardi' }, { id: 3, nom: 'Mercredi' },
  { id: 4, nom: 'Jeudi' }, { id: 5, nom: 'Vendredi' }, { id: 6, nom: 'Samedi' }, { id: 7, nom: 'Dimanche' },
]

function newExo() {
  return { nom: '', series: 3, repetitions: 10, repos_secondes: 60, poids_charge_kg: 0 }
}

// ======== Formulaire création / édition (partagé) ========
function FormulaireProgamme({ userId, supabase, toast, onSave, onAnnuler, nomsExistants, progAEditer }) {
  const edition = !!progAEditer

  const [nomProg, setNomProg] = useState(progAEditer?.nom || '')
  const [descProg, setDescProg] = useState(progAEditer?.description || '')
  const [exoParJour, setExoParJour] = useState(() => {
    if (!progAEditer) return {}
    // Pré-remplir avec les exercices existants
    const map = {}
    progAEditer.programme_exercices?.forEach((pe) => {
      if (!map[pe.jour_id]) map[pe.jour_id] = []
      map[pe.jour_id].push({
        nom: pe.nom,
        series: pe.series,
        repetitions: pe.repetitions,
        repos_secondes: pe.repos_secondes,
        poids_charge_kg: pe.poids_charge_kg || 0,
      })
    })
    // Trier chaque jour par ordre
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
    })
    return map
  })
  const [jourActif, setJourActif] = useState(1)
  const [enCours, setEnCours] = useState(false)

  function ajouterExo(jourId) {
    setExoParJour((prev) => ({ ...prev, [jourId]: [...(prev[jourId] || []), newExo()] }))
  }

  function supprimerExo(jourId, i) {
    setExoParJour((prev) => {
      const liste = [...(prev[jourId] || [])]
      liste.splice(i, 1)
      return { ...prev, [jourId]: liste }
    })
  }

  function modifierExo(jourId, i, champ, valeur) {
    setExoParJour((prev) => {
      const liste = [...(prev[jourId] || [])]
      liste[i] = { ...liste[i], [champ]: valeur }
      return { ...prev, [jourId]: liste }
    })
  }

  async function sauvegarder() {
    if (!nomProg.trim() || !userId) return
    const totalExos = Object.values(exoParJour).flat().filter(e => e.nom.trim()).length
    if (totalExos === 0) { toast('Ajoute au moins un exercice', 'error'); return }

    setEnCours(true)

    let progId
    if (edition) {
      // Mettre à jour le programme
      await supabase.from('programmes').update({
        nom: nomProg.trim(),
        description: descProg.trim() || null,
      }).eq('id', progAEditer.id)
      // Supprimer les anciens exercices
      await supabase.from('programme_exercices').delete().eq('programme_id', progAEditer.id)
      progId = progAEditer.id
    } else {
      // Créer le programme
      const { data, error } = await supabase.from('programmes').insert([{
        user_id: userId, nom: nomProg.trim(),
        description: descProg.trim() || null, est_fixe: false,
      }]).select().single()
      if (error) { toast('Erreur lors de la création', 'error'); setEnCours(false); return }
      progId = data.id
    }

    // Insérer tous les exercices
    const lignes = []
    Object.entries(exoParJour).forEach(([jourId, exos]) => {
      exos.forEach((exo, i) => {
        if (!exo.nom.trim()) return
        lignes.push({
          programme_id: progId,
          jour_id: Number(jourId),
          nom: exo.nom.trim(),
          series: Number(exo.series),
          repetitions: Number(exo.repetitions),
          repos_secondes: Number(exo.repos_secondes),
          poids_charge_kg: Number(exo.poids_charge_kg) || 0,
          ordre: i,
        })
      })
    })

    if (lignes.length > 0) await supabase.from('programme_exercices').insert(lignes)

    toast(edition ? `Programme "${nomProg}" modifié ✓` : `Programme "${nomProg}" créé ✓`)
    setEnCours(false)
    onSave()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <p className="font-semibold" style={{ color: 'var(--text)' }}>
          {edition ? 'Modifier le programme' : 'Nouveau programme'}
        </p>
        <div>
          <label className="label">Nom *</label>
          <input value={nomProg} onChange={(e) => setNomProg(e.target.value)}
            placeholder="Ex: Mon programme été" className="input" autoFocus />
        </div>
        <div>
          <label className="label">Description (optionnel)</label>
          <input value={descProg} onChange={(e) => setDescProg(e.target.value)}
            placeholder="Ex: Prise de masse, 5 jours/semaine" className="input" />
        </div>
      </div>

      {/* Sélecteur de jour */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {JOURS.map((j) => {
          const nb = (exoParJour[j.id] || []).filter(e => e.nom.trim()).length
          const actif = jourActif === j.id
          return (
            <button key={j.id} onClick={() => setJourActif(j.id)}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium"
              style={{
                background: actif ? 'var(--orange)' : 'var(--surface)',
                color: actif ? 'white' : 'var(--text-muted)',
                border: `1px solid ${actif ? 'var(--orange)' : 'var(--border)'}`,
              }}>
              {j.nom.slice(0, 3)}
              {nb > 0 && (
                <span className="ml-1 text-xs font-bold"
                  style={{ color: actif ? 'rgba(255,255,255,0.8)' : 'var(--orange)' }}>
                  {nb}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Exercices du jour actif */}
      <div className="card flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
            {JOURS.find(j => j.id === jourActif)?.nom}
          </p>
          {(exoParJour[jourActif] || []).length === 0 && (
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Repos</span>
          )}
        </div>

        {(exoParJour[jourActif] || []).map((exo, i) => (
          <div key={i} className="flex flex-col gap-2 pb-3 border-b last:border-0 last:pb-0"
            style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="label">Exercice {i + 1}</label>
                <AutocompleteInput
                  value={exo.nom}
                  onChange={(v) => modifierExo(jourActif, i, 'nom', v)}
                  suggestions={nomsExistants}
                  placeholder="Ex: Squat, Développé couché..."
                />
              </div>
              <button onClick={() => supprimerExo(jourActif, i)}
                className="mt-4 text-sm" style={{ color: 'var(--text-faint)' }}>✕</button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Séries</label>
                <input type="number" min="1" value={exo.series}
                  onChange={(e) => modifierExo(jourActif, i, 'series', e.target.value)} className="input" />
              </div>
              <div className="flex-1">
                <label className="label">Reps</label>
                <input type="number" min="1" value={exo.repetitions}
                  onChange={(e) => modifierExo(jourActif, i, 'repetitions', e.target.value)} className="input" />
              </div>
              <div className="flex-1">
                <label className="label">Repos (s)</label>
                <input type="number" min="0" step="15" value={exo.repos_secondes}
                  onChange={(e) => modifierExo(jourActif, i, 'repos_secondes', e.target.value)} className="input" />
              </div>
              <div className="flex-1">
                <label className="label">Poids (kg)</label>
                <input type="number" min="0" step="0.5" value={exo.poids_charge_kg || ''}
                  onChange={(e) => modifierExo(jourActif, i, 'poids_charge_kg', e.target.value)}
                  placeholder="0" className="input" />
              </div>
            </div>
          </div>
        ))}

        <button onClick={() => ajouterExo(jourActif)}
          className="w-full py-2 rounded-xl text-sm font-medium border-2 border-dashed"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          + Ajouter un exercice
        </button>
      </div>

      {/* Résumé */}
      {Object.keys(exoParJour).length > 0 && (
        <div className="card py-3">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Résumé</p>
          <div className="flex flex-col gap-1">
            {JOURS.filter(j => (exoParJour[j.id] || []).filter(e => e.nom.trim()).length > 0).map(j => {
              const nb = (exoParJour[j.id] || []).filter(e => e.nom.trim()).length
              return (
                <div key={j.id} className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text)' }}>{j.nom}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{nb} exercice{nb > 1 ? 's' : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onAnnuler}
          className="flex-1 py-3 rounded-xl text-sm font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
          Annuler
        </button>
        <button onClick={sauvegarder} disabled={enCours || !nomProg.trim()}
          className="flex-[2] btn-primary text-sm py-3 disabled:opacity-50">
          {enCours ? 'Enregistrement...' : edition ? '✓ Enregistrer les modifications' : '✓ Créer le programme'}
        </button>
      </div>
    </div>
  )
}

// ======== Page principale ========
export default function Programmes() {
  const supabase = createClient()
  const router = useRouter()
  const toast = useToast()

  const [userId, setUserId] = useState(null)
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [programmeOuvert, setProgrammeOuvert] = useState(null)
  const [applicationEnCours, setApplicationEnCours] = useState(null)
  const [nomsExistants, setNomsExistants] = useState([])

  // Mode : null = liste, 'creation' = nouveau, prog = édition
  const [mode, setMode] = useState(null)

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: progs } = await supabase.from('programmes')
      .select('*, programme_exercices(*, jours(numero, nom))')
      .or(`est_fixe.eq.true,user_id.eq.${user.id}`)
      .order('est_fixe', { ascending: false })
      .order('created_at')

    setProgrammes(progs || [])

    const { data: exos } = await supabase.from('exercices').select('nom').eq('user_id', user.id)
    const { data: progExos } = await supabase.from('programme_exercices').select('nom')
    setNomsExistants([...new Set([
      ...(exos || []).map(e => e.nom),
      ...(progExos || []).map(e => e.nom),
    ])].sort())

    setLoading(false)
  }

  async function appliquerProgramme(prog) {
    if (!confirm(`Appliquer "${prog.nom}" ? Tes exercices actuels seront remplacés.`)) return
    setApplicationEnCours(prog.id)
    await supabase.from('exercices').delete().eq('user_id', userId)
    const nouveaux = (prog.programme_exercices || []).map((pe) => ({
      user_id: userId, jour_id: pe.jour_id, nom: pe.nom,
      series: pe.series, repetitions: pe.repetitions,
      repos_secondes: pe.repos_secondes, poids_charge_kg: pe.poids_charge_kg || 0, ordre: pe.ordre,
    }))
    if (nouveaux.length > 0) await supabase.from('exercices').insert(nouveaux)
    setApplicationEnCours(null)
    toast('Programme appliqué à ta semaine ✓')
  }

  async function supprimerProgramme(id, nom) {
    if (!confirm(`Supprimer "${nom}" ?`)) return
    await supabase.from('programmes').delete().eq('id', id)
    toast('Programme supprimé')
    charger()
  }

  function exercicesParJour(prog) {
    const groupes = {}
    prog.programme_exercices?.forEach((pe) => {
      const num = pe.jours?.numero
      if (!groupes[num]) groupes[num] = { label: pe.jours?.nom, exos: [] }
      groupes[num].exos.push(pe)
    })
    return Object.entries(groupes).sort(([a], [b]) => Number(a) - Number(b))
  }

  // Mode formulaire (création ou édition)
  if (mode !== null) {
    return (
      <div>
        <button onClick={() => setMode(null)} className="text-sm mb-3" style={{ color: 'var(--orange)' }}>← Retour</button>
        <FormulaireProgamme
          userId={userId}
          supabase={supabase}
          toast={toast}
          nomsExistants={nomsExistants}
          progAEditer={mode === 'creation' ? null : mode}
          onSave={() => { setMode(null); charger() }}
          onAnnuler={() => setMode(null)}
        />
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm mb-3" style={{ color: 'var(--orange)' }}>← Retour</button>
      <Header title="Programmes" subtitle="Templates d'entraînement" />

      <div className="flex flex-col gap-4">
        <button onClick={() => setMode('creation')} className="btn-primary w-full">
          + Créer un nouveau programme
        </button>

        <SauvegarderSemaine userId={userId} supabase={supabase} toast={toast} onSave={charger} />

        {loading ? (
          <SkeletonListe nb={4} lignes={2} />

        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
              Programmes prêts à l'emploi
            </p>
            {programmes.filter(p => p.est_fixe).map(prog => (
              <ProgrammeCard key={prog.id} prog={prog}
                exercicesParJour={exercicesParJour(prog)}
                ouvert={programmeOuvert === prog.id}
                onToggle={() => setProgrammeOuvert(programmeOuvert === prog.id ? null : prog.id)}
                onAppliquer={() => appliquerProgramme(prog)}
                enCours={applicationEnCours === prog.id}
              />
            ))}

            {programmes.filter(p => !p.est_fixe).length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide mt-2" style={{ color: 'var(--text-faint)' }}>
                  Mes programmes
                </p>
                {programmes.filter(p => !p.est_fixe).map(prog => (
                  <ProgrammeCard key={prog.id} prog={prog}
                    exercicesParJour={exercicesParJour(prog)}
                    ouvert={programmeOuvert === prog.id}
                    onToggle={() => setProgrammeOuvert(programmeOuvert === prog.id ? null : prog.id)}
                    onAppliquer={() => appliquerProgramme(prog)}
                    onEditer={() => setMode(prog)}
                    onSupprimer={() => supprimerProgramme(prog.id, prog.nom)}
                    enCours={applicationEnCours === prog.id}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// -------- SauvegarderSemaine --------
function SauvegarderSemaine({ userId, supabase, toast, onSave }) {
  const [show, setShow] = useState(false)
  const [nom, setNom] = useState('')
  const [desc, setDesc] = useState('')

  async function sauvegarder(e) {
    e.preventDefault()
    if (!nom.trim() || !userId) return
    const { data, error } = await supabase.from('programmes').insert([{
      user_id: userId, nom: nom.trim(), description: desc.trim() || null, est_fixe: false,
    }]).select().single()
    if (error) { toast('Erreur', 'error'); return }
    const { data: exos } = await supabase.from('exercices').select('*').eq('user_id', userId)
    if (exos?.length > 0) {
      await supabase.from('programme_exercices').insert(
        exos.map(e => ({
          programme_id: data.id, jour_id: e.jour_id, nom: e.nom,
          series: e.series, repetitions: e.repetitions,
          repos_secondes: e.repos_secondes, poids_charge_kg: e.poids_charge_kg || 0, ordre: e.ordre,
        }))
      )
    }
    setNom(''); setDesc(''); setShow(false)
    toast(`"${nom}" sauvegardé ✓`)
    onSave()
  }

  if (!show) return (
    <button onClick={() => setShow(true)}
      className="w-full py-2.5 rounded-xl text-sm font-medium border"
      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface)' }}>
      💾 Sauvegarder ma semaine actuelle comme programme
    </button>
  )

  return (
    <form onSubmit={sauvegarder} className="card flex flex-col gap-3">
      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Sauvegarder la semaine actuelle</p>
      <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom du programme" className="input" required autoFocus />
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optionnel)" className="input" />
      <div className="flex gap-2">
        <button type="button" onClick={() => setShow(false)}
          className="flex-1 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>Annuler</button>
        <button type="submit" className="flex-1 btn-primary text-sm py-2">Sauvegarder</button>
      </div>
    </form>
  )
}

// -------- ProgrammeCard --------
function ProgrammeCard({ prog, exercicesParJour, ouvert, onToggle, onAppliquer, onEditer, onSupprimer, enCours }) {
  const nbExos = prog.programme_exercices?.length || 0
  const nbJours = exercicesParJour.length

  return (
    <div className="card flex flex-col gap-3">
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold" style={{ color: 'var(--text)' }}>{prog.nom}</p>
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
                    <span style={{ color: 'var(--text)' }}>{exo.nom}</span>
                    <span style={{ color: 'var(--text-faint)' }}>
                      {exo.series}×{exo.repetitions}
                      {exo.poids_charge_kg > 0 && ` · ${exo.poids_charge_kg}kg`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-1 flex-wrap">
            <button onClick={onAppliquer} disabled={enCours}
              className="flex-1 btn-primary text-sm py-2">
              {enCours ? 'Application...' : 'Appliquer à ma semaine'}
            </button>
            {onEditer && (
              <button onClick={onEditer}
                className="px-3 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                ✏️ Modifier
              </button>
            )}
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
