import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from './Navigation';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/95 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink-950 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <div className="flex flex-col justify-center gap-0.5">
          <a
            href="https://ratdwiggy-cmyk.github.io/evony-tools/"
            className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-gold hover:text-gold-bright"
          >
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rotate-45 bg-gold" />
            Evony Tools
          </a>
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg tracking-wider text-ash-50 hover:text-gold-bright"
            onClick={() => setMenuOpen(false)}
          >
            Rally Coordinator
          </Link>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:block">
          <Navigation />
        </div>

        {/* Mobile menu toggle — large touch target per design direction */}
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-md text-ash-200 hover:bg-ink-800 hover:text-gold md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="border-t border-ink-700 px-4 pb-4 pt-2 md:hidden">
          <Navigation onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      <div className="rune-divider" aria-hidden="true" />
    </header>
  );
}
