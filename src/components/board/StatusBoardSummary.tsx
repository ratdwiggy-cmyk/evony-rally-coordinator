import { Card, Badge } from '../ui';
import type { LookingForOption, Player } from '../../types/models';

interface StatusBoardSummaryProps {
  players: Player[];
  lookingForOptions: LookingForOption[];
}

interface StatTileProps {
  label: string;
  value: number;
}

function StatTile({ label, value }: StatTileProps) {
  return (
    <Card className="flex flex-col items-center gap-1 py-3 text-center">
      <span className="font-display text-2xl text-gold">{value}</span>
      <span className="text-xs text-ash-400">{label}</span>
    </Card>
  );
}

/**
 * The board's five-second-comprehension summary (Section 2): counts only,
 * derived entirely from what's already in the live roster — never a
 * separate computation, ranking, or decision (Section 1.1).
 *
 * "Players Online" is the size of the current roster snapshot — this app
 * has no separate presence/online tracking (Section 4), so roster size is
 * the closest faithful reading of that label against the existing schema.
 */
export function StatusBoardSummary({ players, lookingForOptions }: StatusBoardSummaryProps) {
  const available = players.filter((p) => p.status === 'available').length;
  const maybe = players.filter((p) => p.status === 'maybe').length;
  const unavailable = players.filter((p) => p.status === 'unavailable').length;
  const scouting = players.filter((p) => p.scouting).length;
  const availableLeaders = players.filter((p) => p.canLead.length > 0).length;

  const lookingForCounts = new Map<string, number>();
  for (const player of players) {
    for (const id of player.lookingFor) {
      lookingForCounts.set(id, (lookingForCounts.get(id) ?? 0) + 1);
    }
  }
  const labelById = new Map(lookingForOptions.map((option) => [option.id, option.label]));
  const topLookingFor = [...lookingForCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        <StatTile label="Players Online" value={players.length} />
        <StatTile label="Available" value={available} />
        <StatTile label="Maybe" value={maybe} />
        <StatTile label="Unavailable" value={unavailable} />
        <StatTile label="Scouting" value={scouting} />
        <StatTile label="Available Leaders" value={availableLeaders} />
      </div>

      {topLookingFor.length > 0 && (
        <Card className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ash-500">Currently Looking For</span>
          {topLookingFor.map(([id, count]) => (
            <Badge key={id} tone="neutral">
              {labelById.get(id) ?? id} · {count}
            </Badge>
          ))}
        </Card>
      )}
    </div>
  );
}
