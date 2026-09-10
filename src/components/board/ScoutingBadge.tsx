import { Badge } from '../ui';

/** Renders nothing when the player isn't scouting — the card simply omits the badge. */
export function ScoutingBadge({ scouting }: { scouting: boolean }) {
  if (!scouting) return null;
  return <Badge tone="gold">Scouting</Badge>;
}
