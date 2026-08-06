# Changelog — Fit Tracker

## [1.8.0] — 2026-08-06
### Ajouté
- 📸 Reconnaissance d'aliments par photo IA (Gemini)
- 📊 Onglet Résumé dans la page Progrès avec sélecteur de période
- 🛒 Liste de courses IA générée depuis tes habitudes alimentaires
- 📅 Bilan hebdomadaire IA sur le dashboard (généré automatiquement le lundi)
- 🤕 Suivi des douleurs/blessures en fin de séance avec analyse IA
- 🍽️ Mode nutrition désactivable (masque Repas, calories, macros)
- ⚡ Réutilisation de circuits existants dans une séance
- 💾 Sauvegarde d'une suggestion frigo comme repas type
- 🤝 Mode assistance pour les exercices (tractions assistées, poids négatifs)
- 🔍 Autocomplétion nutritionnelle lors de la saisie d'aliments

### Amélioré
- Coach de progression avec logique de double progression (reps → charge)
- Fourchette de reps détectée automatiquement (8-12 ou 12-20)
- Affichage des exercices en mode assistance dans la page Progrès
- Navigation avec indicateur actif plus visible
- États vides améliorés (séance, historique, repas)
- Animations de feedback sur les séries validées
- Greeting personnalisé sur le dashboard (Bonjour/Bonsoir + prénom)

### Corrigé
- Suppression d'un exercice ne supprime plus son historique de progression
- Application d'un programme ne supprime plus les progrès existants
- Bug de précision flottante sur les deltas de poids (+9.999...kg → +10kg)
- Tendance dans la page Progrès (tri par date corrigé)
- Chrono de séance ne s'arrête plus au lancement d'un circuit
- Service Worker : erreur chrome-extension supprimée

---

## [1.0.0] — 2026-06-01
### Initial
- Suivi des séances avec programmes hebdomadaires
- Page Progrès par exercice (PR, 1RM, évolution)
- Suivi nutritionnel avec repas types et saisie libre
- Jauge calories journalière
- Profil avec calcul BMR/TDEE/objectif calorique
- Intégration Google Fit (pas quotidiens, historique 7 jours)
- Mode sombre / clair
- PWA installable sur mobile
