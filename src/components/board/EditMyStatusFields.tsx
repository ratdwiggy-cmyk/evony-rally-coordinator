import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input } from '../ui';
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../../utils/time';
import { friendlyErrorMessage } from '../../utils/errors';
import type { BossCategory, LookingForOption, Player, PlayerStatusValue, PlayerWriteInput } from '../../types/models';

const MAX_IGN_LENGTH = 32;
const MAX_NOTE_LENGTH = 140;

const STATUS_OPTIONS: { value: PlayerStatusValue; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'unavailable', label: 'Unavailable' },
];

interface EditMyStatusFieldsProps {
  /** The signed-in player's existing record, or null if they've never saved one yet. */
  player: Player | null;
  bossCategories: BossCategory[];
  lookingForOptions: LookingForOption[];
  /** Always `useMyPlayer().save` — the only write path, already scoped server-side to the caller's own uid. */
  onSave: (input: PlayerWriteInput) => Promise<void>;
  saving: boolean;
  /** Called after a save completes successfully — e.g. to close a modal. Optional, since the Profile page stays open. */
  onSaved?: () => void;
}

interface FieldErrors {
  ign?: string;
  note?: string;
}

/**
 * The actual self-status form: every field from docs/PROJECT_SPECIFICATION.md
 * Section 11's `EditMyStatusModal` subtree, plus an "In-Game Name" field.
 * IGN isn't in Section 4's card-field list, but the schema (Section 12.2)
 * requires it on every write and no other flow ever creates the player
 * document, so a first-time save has nowhere else to get it from. Pre-filled
 * from the existing record when there is one.
 *
 * Rendered in two places: inside `EditMyStatusModal` (opened from a player's
 * own card / a floating action button, per Section 11) and inline on the
 * Profile page — same fields, same validation, same save path, no
 * duplicated logic beyond this one component.
 *
 * "Real-time save": saving here writes straight to the player's own Firestore
 * document; every connected alliance member's board already listens for that
 * change via `subscribeToPlayers`' `onSnapshot` (Section 2, "five-second
 * comprehension") and updates instantly, with no page reload for anyone.
 * There's no separate "publish" step — a successful save is already live.
 *
 * Validation here mirrors (but never substitutes for) `firestore.rules` and
 * `validatePlayerWriteInput` in `firebase/firestore.ts` — this is a fail-fast
 * UX nicety; the security rules are the real boundary.
 */
export function EditMyStatusFields({
  player,
  bossCategories,
  lookingForOptions,
  onSave,
  saving,
  onSaved,
}: EditMyStatusFieldsProps) {
  const [ign, setIgn] = useState(player?.ign ?? '');
  const [status, setStatus] = useState<PlayerStatusValue>(player?.status ?? 'available');
  const [availableUntil, setAvailableUntil] = useState(
    toDatetimeLocalValue(player?.availableUntil ?? null)
  );
  const [note, setNote] = useState(player?.note ?? '');
  const [lookingFor, setLookingFor] = useState<string[]>(player?.lookingFor ?? []);
  const [canLead, setCanLead] = useState<string[]>(player?.canLead ?? []);
  const [scouting, setScouting] = useState(player?.scouting ?? false);
  const [capability, setCapability] = useState<Record<string, string>>(player?.capability ?? {});

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Re-sync local state if the underlying record changes out from under the
  // form (e.g. the modal is reopened after a previous save, or the initial
  // one-shot load in `useMyPlayer` resolves after the form already mounted).
  useEffect(() => {
    setIgn(player?.ign ?? '');
    setStatus(player?.status ?? 'available');
    setAvailableUntil(toDatetimeLocalValue(player?.availableUntil ?? null));
    setNote(player?.note ?? '');
    setLookingFor(player?.lookingFor ?? []);
    setCanLead(player?.canLead ?? []);
    setScouting(player?.scouting ?? false);
    setCapability(player?.capability ?? {});
  }, [player]);

  function toggleInArray(list: string[], id: string, setList: (next: string[]) => void) {
    setList(list.includes(id) ? list.filter((existing) => existing !== id) : [...list, id]);
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!ign.trim()) {
      errors.ign = 'Your in-game name is required.';
    } else if (ign.trim().length > MAX_IGN_LENGTH) {
      errors.ign = `In-game name must be ${MAX_IGN_LENGTH} characters or fewer.`;
    }
    if (note.length > MAX_NOTE_LENGTH) {
      errors.note = `Keep it to ${MAX_NOTE_LENGTH} characters or fewer.`;
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const input: PlayerWriteInput = {
      ign: ign.trim(),
      status,
      availableUntil: fromDatetimeLocalValue(availableUntil),
      note: note.trim() || null,
      lookingFor,
      canLead,
      scouting,
      capability: Object.fromEntries(
        Object.entries(capability).filter(([, value]) => value && value.trim().length > 0)
      ),
    };

    try {
      await onSave(input);
      setSuccessMessage('Status updated — your alliance sees this live now.');
      onSaved?.();
    } catch (err) {
      setSubmitError(friendlyErrorMessage(err));
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <Input
        label="In-game name"
        value={ign}
        onChange={(e) => setIgn(e.target.value)}
        error={fieldErrors.ign}
        maxLength={MAX_IGN_LENGTH}
        autoComplete="off"
        required
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-ash-200">Status</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={status === option.value ? 'primary' : 'secondary'}
              aria-pressed={status === option.value}
              onClick={() => setStatus(option.value)}
              className="flex-1"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="available-until" className="text-sm font-medium text-ash-200">
          Available until <span className="text-ash-500">(optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            id="available-until"
            type="datetime-local"
            value={availableUntil}
            onChange={(e) => setAvailableUntil(e.target.value)}
            className="min-h-[44px] w-full rounded-md border border-ink-600 bg-ink-900 px-3 text-sm text-ash-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          {availableUntil && (
            <Button type="button" variant="ghost" onClick={() => setAvailableUntil('')}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-medium text-ash-200">
          Current activity / notes <span className="text-ash-500">(optional)</span>
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={MAX_NOTE_LENGTH}
          rows={3}
          placeholder="What are you up to right now?"
          aria-invalid={Boolean(fieldErrors.note)}
          aria-describedby="note-count"
          className={[
            'rounded-md border bg-ink-900 px-3 py-2 text-sm text-ash-50 placeholder:text-ash-500',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold',
            fieldErrors.note ? 'border-status-unavailable' : 'border-ink-600',
          ].join(' ')}
        />
        <p
          id="note-count"
          className={`text-xs ${fieldErrors.note ? 'text-status-unavailable' : 'text-ash-400'}`}
        >
          {fieldErrors.note ?? `${note.length}/${MAX_NOTE_LENGTH}`}
        </p>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-ash-200">Looking for</legend>
        {lookingForOptions.length === 0 ? (
          <p className="text-xs text-ash-400">Your alliance hasn't set up any tags yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lookingForOptions.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant={lookingFor.includes(option.id) ? 'primary' : 'secondary'}
                aria-pressed={lookingFor.includes(option.id)}
                onClick={() => toggleInArray(lookingFor, option.id, setLookingFor)}
                className="px-3 text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-ash-200">Can lead</legend>
        {bossCategories.length === 0 ? (
          <p className="text-xs text-ash-400">Your alliance hasn't set up any boss categories yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bossCategories.map((category) => (
              <Button
                key={category.id}
                type="button"
                variant={canLead.includes(category.id) ? 'primary' : 'secondary'}
                aria-pressed={canLead.includes(category.id)}
                onClick={() => toggleInArray(canLead, category.id, setCanLead)}
                className="px-3 text-xs"
              >
                {category.label}
              </Button>
            ))}
          </div>
        )}
      </fieldset>

      <label className="flex items-center gap-2.5 py-1 text-sm text-ash-200">
        <input
          type="checkbox"
          checked={scouting}
          onChange={(e) => setScouting(e.target.checked)}
          className="h-5 w-5 rounded border-ink-600 bg-ink-900 text-gold focus-visible:ring-2 focus-visible:ring-gold"
        />
        Currently scouting
      </label>

      {bossCategories.length > 0 && (
        <fieldset className="flex flex-col gap-3 border-t border-ink-700 pt-4">
          <legend className="text-sm font-medium text-ash-200">
            Capability <span className="text-ash-500">(optional — your max comfortable solo level)</span>
          </legend>
          {bossCategories.map((category) => (
            <Input
              key={category.id}
              label={category.label}
              value={capability[category.id] ?? ''}
              onChange={(e) =>
                setCapability((prev) => ({ ...prev, [category.id]: e.target.value }))
              }
              placeholder="e.g. Lv5, Hard 60, Hell"
            />
          ))}
        </fieldset>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-status-unavailable">
          {submitError}
        </p>
      )}
      {successMessage && !submitError && (
        <p role="status" className="text-sm text-status-available">
          {successMessage}
        </p>
      )}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Saving…' : 'Save status'}
      </Button>
    </form>
  );
}
