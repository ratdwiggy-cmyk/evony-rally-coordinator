import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export function About() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ash-50">About this tool</h1>

      <Card>
        <p className="text-sm leading-relaxed text-ash-200">
          Evony Rally Coordinator is a live status board, not an alliance manager. Players declare
          what they're doing — available, maybe, or unavailable; looking for a boss; able to lead;
          currently scouting; or their comfortable solo capability per boss. The board only
          displays, sorts, filters, and searches that information. It never assigns leaders,
          never ranks players, and never tracks attendance — the alliance coordinates itself using
          what's already been shared.
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-base text-gold">Part of Evony Tools</h2>
        <p className="text-sm text-ash-400">
          This is one of several standalone tools in the Evony Tools ecosystem, each deployed
          independently on GitHub Pages.
        </p>
      </Card>

      <p className="text-sm text-ash-400">
        Have a question about using the board?{' '}
        <Link to="/help" className="text-gold underline underline-offset-2 hover:text-gold-bright">
          Visit Help
        </Link>
        .
      </p>
    </div>
  );
}
