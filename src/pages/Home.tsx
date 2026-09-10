import { Link } from 'react-router-dom';
import { Card, Button } from '../components/ui';

export function Home() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="font-display text-3xl text-ash-50 md:text-4xl">Evony Rally Coordinator</h1>
        <p className="max-w-2xl text-ash-200">
          A live status board for your alliance — who's available, who's scouting, who's looking
          for a boss, and who can lead. Open the page, understand the situation in five seconds,
          and coordinate the rest yourselves.
        </p>
        <div>
          <Link to="/board">
            <Button variant="primary">Go to Status Board</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="mb-2 font-display text-lg text-gold">Declare, don't decide</h2>
          <p className="text-sm text-ash-400">
            Players declare their own status, capability, and intentions. The board never assigns
            leaders or ranks anyone — it only shows what's already been said.
          </p>
        </Card>
        <Card>
          <h2 className="mb-2 font-display text-lg text-gold">Built for a glance</h2>
          <p className="text-sm text-ash-400">
            Sort, filter, and search the roster in seconds — on a phone, mid-rally, with one hand.
          </p>
        </Card>
        <Card>
          <h2 className="mb-2 font-display text-lg text-gold">Always current</h2>
          <p className="text-sm text-ash-400">
            Stale declarations are visually dimmed, so you never mistake an old status for a
            current one.
          </p>
        </Card>
      </section>
    </div>
  );
}
