# Fit Tracker

App de suivi : entraînements de la semaine (avec minuteur de repos par exercice), repas du jour, et calcul d'IMC.

## 1. Installer les dépendances

```bash
npm install
```

## 2. Créer le projet Supabase

1. Va sur https://supabase.com et crée un nouveau projet (gratuit)
2. Une fois créé, va dans **SQL Editor**
3. Copie-colle tout le contenu du fichier `sql/schema.sql` et exécute-le
   → ça crée les tables : `jours`, `exercices`, `seances_log`, `repas`, `mesures`

## 3. Configurer les variables d'environnement

1. Renomme `.env.local.example` en `.env.local`
2. Va dans Supabase → **Settings → API**
3. Remplis avec ton `Project URL` et ta clé `anon public` :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxx
```

## 4. Lancer en local

```bash
npm run dev
```

Ouvre http://localhost:3000

## 5. Déployer sur Vercel

1. Pousse le projet sur GitHub
2. Sur https://vercel.com → "Add New Project" → importe le repo
3. Ajoute les mêmes variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) dans Settings → Environment Variables
4. Déploie

## Structure des fonctionnalités

- **/ (accueil)** : les 7 jours de la semaine, le jour actuel est mis en avant
- **/seance/[jour]** : liste des exercices du jour, bouton "Série terminée" qui déclenche le minuteur de repos propre à chaque exercice (durée configurable à l'ajout)
- **/repas** : liste simple des repas du jour, groupés par type (petit-déj / déjeuner / dîner / collation), cochables
- **/imc** : calcul instantané de l'IMC + historique des mesures dans le temps

## Notes techniques

- Le minuteur de repos est géré dans `app/components/RestTimer.jsx` : décompte visuel, vibration mobile en fin de repos, boutons +15s/-15s/pause
- La base est en accès public (RLS ouvert) pour démarrer simple — si tu veux que ce soit privé à toi seul, il faudra ajouter l'authentification Supabase (je peux t'aider sur ce point ensuite)
- Pas de gestion offline pour l'instant : il faut une connexion internet pour que l'app fonctionne (cf. notre échange précédent sur PWA si tu veux ajouter ça)
