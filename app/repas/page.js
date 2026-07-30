'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Header from '@/app/components/Header'
import { useToast } from '@/app/components/Toast'
import ScannerCodeBarre from '@/app/components/ScannerCodeBarre'
import ReconnaissancePhoto from '@/app/components/ReconnaissancePhoto'
import { SkeletonRepas } from '@/app/components/Skeleton'
import Link from 'next/link'
import { ErreurChargement } from '@/app/components/Erreur'

const TYPES = [
  { value: 'petit-dejeuner', label: 'Petit-déjeuner', icon: '🍳' },
  { value: 'dejeuner', label: 'Déjeuner', icon: '🥗' },
  { value: 'diner', label: 'Dîner', icon: '🍝' },
  { value: 'collation', label: 'Collation', icon: '🍎' },
]

const OBJECTIF_LABELS = {
  perte_poids: { label: 'Perte de poids', color: '#3B82F6', bg: '#EFF6FF', icon: '📉' },
  maintien: { label: 'Maintien', color: '#22c55e', bg: '#F0FDF4', icon: '⚖️' },
  prise_masse: { label: 'Prise de masse', color: '#FF5722', bg: '#FFF3F0', icon: '💪' },
  tous: { label: 'Tous objectifs', color: '#6B7280', bg: '#F9FAFB', icon: '✓' },
}

function aujourdHui() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function Repas() {
  const supabase = createClient()
  const toast = useToast()
  const [erreur, setErreur] = useState(null)

  const [userId, setUserId] = useState(null)
  const [repas, setRepas] = useState([])
  const [loading, setLoading] = useState(true)
  const [repasEnEdition, setRepasEnEdition] = useState(null)
  const [dateSelectionnee, setDateSelectionnee] = useState(aujourdHui())

  // Onglet actif : 'repas-types' ou 'frigo'
  const [onglet, setOnglet] = useState('repas-types')

  // Catalogue
  const [type, setType] = useState('petit-dejeuner')
  const [optionsParType, setOptionsParType] = useState({})
  const [ingredientsParOption, setIngredientsParOption] = useState({})
  const [optionOuverte, setOptionOuverte] = useState(null)
  const [modeLibre, setModeLibre] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showReconnaissancePhoto, setShowReconnaissancePhoto] = useState(false)

  // Saisie libre
  const [nom, setNom] = useState('')
  const [kcalLibre, setKcalLibre] = useState('')
  const [proteinesLibre, setProteinesLibre] = useState('')
  const [glucidesLibre, setGlucidesLibre] = useState('')
  const [lipidesLibre, setLipidesLibre] = useState('')
  const [quantiteG, setQuantiteG] = useState('')

  // Suggestions IA frigo
  const [ingredients, setIngredients] = useState('')
  const [suggestionsIA, setSuggestionsIA] = useState([])
  const [loadingIA, setLoadingIA] = useState(false)
  const [erreurIA, setErreurIA] = useState(null)
  const [typeRepasIA, setTypeRepasIA] = useState('dejeuner')

  // Liste de courses
  const [listeCourses, setListeCourses] = useState(null)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [erreurCourses, setErreurCourses] = useState(null)
  const [articlesCoches, setArticlesCoches] = useState({})
  const [coursesGenerees, setCoursesGenerees] = useState(false)
  const [suggestions, setSuggestions] = useState([]) // options filtrées par objectif
  const [typeSuggestion, setTypeSuggestion] = useState('petit-dejeuner')
  const [caloriesRestantes, setCaloriesRestantes] = useState(null)
  const [suggestionOuverte, setSuggestionOuverte] = useState(null)
  const [profil, setProfil] = useState(null)

  useEffect(() => { charger() }, [dateSelectionnee])

  async function charger() {
    setLoading(true)
    setErreur(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Repas de la date sélectionnée
      const { data } = await supabase.from('repas')
        .select('*, options_repas(kcal, proteines_g, glucides_g, lipides_g)')
        .eq('user_id', user.id).eq('date_repas', dateSelectionnee).order('created_at')
      setRepas(data || [])

      // Catalogue complet
      const { data: options } = await supabase.from('options_repas').select('*').order('objectif_cible').order('ordre')
      const groupes = {}
      options?.forEach((o) => { if (!groupes[o.type]) groupes[o.type] = []; groupes[o.type].push(o) })