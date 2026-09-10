import { Badge } from '../ui';
import type { PlayerStatusValue } from '../../types/models';

const STATUS_LABEL: Record<PlayerStatusValue, string> = {
  available: 'Available',
  maybe: 'Maybe',
  unavailable: 'Unavailable',
};

const STATUS_TONE: Record<PlayerStatusValue, 'available' | 'maybe' | 'unavailable'> = {
  available: 'available',
  maybe: 'maybe',
  unavailable: 'unavailable',
};

/** Status is always color + text label together, never color alone (a11y baseline). */
export function StatusBadge({ status }: { status: PlayerStatusValue }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
