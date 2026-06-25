@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================
   THÈME CLAIR (défaut)
   ============================================ */
:root {
  --bg: #f5f5f7;
  --surface: #ffffff;
  --surface-2: #f0f0f2;
  --border: #e5e5e7;
  --text: #1a1a1a;
  --text-muted: #6b7280;
  --text-faint: #9ca3af;
  --orange: #FF5722;
  --orange-light: #fff3f0;
}

/* ============================================
   THÈME SOMBRE (suit le téléphone)
   ============================================ */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f0f0f;
    --surface: #1c1c1e;
    --surface-2: #2c2c2e;
    --border: #3a3a3c;
    --text: #f2f2f7;
    --text-muted: #aeaeb2;
    --text-faint: #636366;
    --orange: #FF6B47;
    --orange-light: #2a1a14;
  }
}

body {
  background-color: var(--bg);
  color: var(--text);
}

/* ============================================
   COMPOSANTS RÉUTILISABLES
   ============================================ */
.card {
  background-color: var(--surface);
  border-radius: 1rem;
  padding: 1rem;
  border: 1px solid var(--border);
}

.btn-primary {
  background-color: var(--orange);
  color: white;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-weight: 600;
  transition: transform 0.1s;
  display: block;
  text-align: center;
}

.btn-primary:active { transform: scale(0.97); }

.input {
  background-color: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  width: 100%;
}

.input::placeholder { color: var(--text-faint); }
.input:focus { outline: 2px solid var(--orange); outline-offset: 1px; }

.nav-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

.nav-link.active { color: var(--orange); }

/* Section labels */
.label { font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem; }
