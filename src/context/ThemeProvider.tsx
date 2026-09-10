import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

/**
 * The product spec calls for a single dark theme with gold accents — there is
 * no light-mode requirement. This provider exists anyway, as a single seam,
 * so a future preference (e.g. reduced-motion toggle, accent intensity) has
 * one place to live instead of being threaded through every component.
 */
interface ThemeContextValue {
  theme: 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark' });

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ theme: 'dark' }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
