import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Apply the persisted theme synchronously so the first paint matches it
// (instead of flashing Platinum and then re-painting once App's effect runs).
// Also drop any obsolete theme id (e.g. earlier System 7 / Snow Leopard)
// so users coming from previous builds don't see a stale fallback.
const VALID_THEME_IDS = new Set(['platinum', 'aqua', 'winxp', 'win98', 'nextstep']);
try {
  const raw = localStorage.getItem('os.akhileshw.xyz:theme:v1');
  if (raw) {
    const parsed = JSON.parse(raw);
    const id = parsed?.state?.currentId;
    if (typeof id === 'string' && VALID_THEME_IDS.has(id)) {
      document.documentElement.setAttribute('data-theme', id);
    } else if (typeof id === 'string') {
      localStorage.removeItem('os.akhileshw.xyz:theme:v1');
    }
  }
} catch {
  /* localStorage unavailable or malformed — fall back to Platinum default */
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
