import { Card, Button } from '../ui';
import { StatusBadge } from './StatusBadge';
import { ScoutingBadge } from './ScoutingBadge';
import { LookingForTags } from './LookingForTags';
import { CanLeadTags } from './CanLeadTags';
import { CapabilityList } from './CapabilityList';
import { formatAvailableUntil, formatRelativeTime, isStale } from '../../utils/time';
import type { BossCategory, LookingForOption, Player } from '../../types/models';

interface PlayerCardProps {
  player: Player;
  bossCategories: BossCategory[];
  lookingForOptions: LookingForOption[];
  staleAfterMinutes: number;
  /** True only when this card belongs to the signed-in caller — the sole condition under which an Edit affordance renders (Section 5.4: a player may only ever edit their own record). */
  isOwnPlayer?: boolean;
  /** Opens `EditMyStatusModal`. Only ever wired up when `isOwnPlayer` is true. */
  onEdit?: () => void;
}

/**
 * One player's self-declared record (Section 4). Every field here is exactly
 * what the player themselves posted — this card never computes, ranks, or
 * infers anything about them. An "Edit my status" button renders only when
 * `isOwnPlayer` is true (opens `EditMyStatusModal`, wired up one level above
 * in `StatusBoard`); every other player's card remains display-only, per
 * Section 5.4 ("a player may only ever edit their own record").
 *
 * Field-name note: the requested "Activity" and "Notes" card fields both
 * resolve to the schema's single self-declared `note` field (Section 4.1,
 * short free text) — there is no second free-text field to source a
 * separate "Notes" value from. Rather than duplicate the same text under two
 * headings (or invent an unpopulated field), the section is labelled
 * "Activity / Notes" so both requested names are represented against the
 * one field that actually exists. No schema change.
 *
 * Accessibility: the IGN renders as a heading (`h3`) so screen-reader users
 * can jump card-to-card via heading navigation inside the board's card list;
 * status is always color + text label together (never color alone, per
 * `docs/DESIGN_SYSTEM.md`).
 */
export function PlayerCard({
  player,
  bossCategories,
  lookingForOptions,
  staleAfterMinutes,
  isOwnPlayer = false,
  onEdit,
}: PlayerCardProps) {
  const availableUntilLabel = formatAvailableUntil(player.availableUntil);
  const stale = isStale(player.lastUpdated, staleAfterMinutes);

  return (
    <Card className={isOwnPlayer ? 'flex flex-col gap-3 ring-1 ring-gold/40' : 'flex flex-col gap-3'}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base text-ash-50 break-words">{player.ign}</h3>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <StatusBadge status={player.status} />
          <ScoutingBadge scouting={player.scouting} />
        </div>
      </div>

      {isOwnPlayer && onEdit && (
        <Button variant="secondary" onClick={onEdit} className="self-start py-1.5 text-xs">
          Edit my status
        </Button>
      )}

      <div className="flex flex-col gap-1 text-xs">
        {availableUntilLabel && (
          <p className="text-ash-400">
            <span className="text-ash-500">Available until </span>
            {availableUntilLabel}
          </p>
        )}
        <p
          className={stale ? 'text-ash-500' : 'text-ash-400'}
          title={stale ? 'This status may be out of date' : undefined}
        >
          <span className="text-ash-500">Last updated </span>
          <span className="font-mono">{formatRelativeTime(player.lastUpdated)}</span>
          {stale && ' · stale'}
        </p>
      </div>

      {player.note && (
        <div>
          <p className="text-xs font-medium text-ash-500">Activity / Notes</p>
          <p className="text-sm text-ash-200 break-words">{player.note}</p>
        </div>
      )}

      {player.lookingFor.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-ash-500">Looking For</p>
          <LookingForTags lookingFor={player.lookingFor} options={lookingForOptions} />
        </div>
      )}

      {player.canLead.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-ash-500">Can Lead</p>
          <CanLeadTags canLead={player.canLead} categories={bossCategories} />
        </div>
      )}

      {Object.keys(player.capability).length > 0 && (
        <div className="border-t border-ink-700 pt-3">
          <p className="mb-1 text-xs font-medium text-ash-500">Capability Summary</p>
          <CapabilityList capability={player.capability} categories={bossCategories} />
        </div>
      )}
    </Card>
  );
}
