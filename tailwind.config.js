/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces — a near-black slate, not pure black, so cards and
        // borders have room to read as distinct layers.
        ink: {
          950: '#0B0D12', // page background
          900: '#12151C', // base surface (cards)
          800: '#1A1E28', // elevated surface (modals, hovered cards)
          700: '#262B38', // borders / dividers
          600: '#3A4152', // stronger borders, disabled states
        },
        // Gold — the ecosystem's signature accent. "gold" is the primary
        // brand/interactive color; "gold-bright" is reserved for hover /
        // focus states only, so the accent doesn't get diluted by overuse.
        gold: {
          DEFAULT: '#C9A227',
          bright: '#E8C766',
          dim: '#8A7220',
        },
        // Status colors are intentionally NOT built from the gold accent —
        // status is player-declared data, the accent is chrome/branding.
        // Keeping them visually separate matters: gold should always read
        // as "interface," never as "someone's availability."
        status: {
          available: '#4C9A6A',
          maybe: '#D9922C',
          unavailable: '#8A8F9C',
        },
        ash: {
          50: '#F4F5F7',
          200: '#C7CBD4',
          400: '#8A8F9C',
          500: '#6B7080',
        },
      },
      fontFamily: {
        // Display face: used sparingly (logo, page titles, section labels) —
        // a Roman-capital serif carries the "strategy game" register without
        // tipping into costume-y fantasy lettering.
        display: ['"Cinzel"', 'serif'],
        // Body/UI face: dense, small-size legibility for cards and controls.
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        // Data face: capability strings and timestamps ("Lv5", "Hard 60",
        // "12:04") align cleanly in tabular figures.
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '0.625rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,162,39,0.06)',
      },
      spacing: {
        18: '4.5rem',
      },
    },
  },
  plugins: [],
};
