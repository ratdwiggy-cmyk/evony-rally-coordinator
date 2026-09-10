import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import './styles/index.css';

// -----------------------------------------------------------------------------
// Routing note (see docs/ARCHITECTURE_DECISIONS.md):
// GitHub Pages serves this app from a static file path with no server-side
// rewrite rules, so a BrowserRouter would 404 on a hard refresh of any route
// other than "/". HashRouter keeps all route state after the "#", which the
// static server never sees — refreshes and deep links work with zero extra
// deploy configuration. This is a foundation-phase decision and can be
// revisited if a rewrite-based approach is preferred later.
// -----------------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Note: AuthProvider only makes `useAuth()` / the anonymous session available
// app-wide — it does not gate any route by itself. Routing-level gating (which
// pages require an alliance join) is implemented in App.tsx: `/board` and
// `/profile` are wrapped in `AuthGate`, which renders `AllianceJoinScreen`
// until the signed-in user's `users/{uid}` profile has an `allianceId`
//"/",
// `/help`, and `/about` are intentionally ungated so they work before anyone
// has joined an alliance.
