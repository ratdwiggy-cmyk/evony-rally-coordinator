export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-ink-700">
      <div className="rune-divider" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <nav aria-label="Evony Tools ecosystem" className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          <a href="https://ratdwiggy-cmyk.github.io/evony-tools/" className="text-ash-400 hover:text-gold">
            Evony Tools
          </a>
          <a href="https://ratdwiggy-cmyk.github.io/evony-resource-advisor/" className="text-ash-400 hover:text-gold">
            Resource Advisor
          </a>
          <a href="https://ratdwiggy-cmyk.github.io/evony-defense-planner/" className="text-ash-400 hover:text-gold">
            Defense Planner
          </a>
          <a href="https://ratdwiggy-cmyk.github.io/evony-prestige-tracker/" className="text-ash-400 hover:text-gold">
            Prestige Tracker
          </a>
          <a href="https://ratdwiggy-cmyk.github.io/evony-boss-predictor/" className="text-ash-400 hover:text-gold">
            Boss Predictor
          </a>
        </nav>
        <div className="flex flex-col items-center gap-2 text-sm text-ash-400 md:flex-row md:justify-between">
          <p>Evony Rally Coordinator — part of the Evony Tools ecosystem.</p>
          <p>&copy; {year}. Information only — the board never decides for you.</p>
        </div>
      </div>
    </footer>
  );
}
