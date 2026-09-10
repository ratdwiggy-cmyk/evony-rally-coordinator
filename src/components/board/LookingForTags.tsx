import { Badge } from '../ui';
import type { LookingForOption } from '../../types/models';

interface LookingForTagsProps {
  lookingFor: string[];
  options: LookingForOption[];
}

/**
 * Resolves each declared "Looking For" id to its alliance-configured label.
 * An id with no match (e.g. an alliance-added custom tag not yet loaded, or a
 * stale option) falls back to the raw id so nothing silently disappears.
 */
export function LookingForTags({ lookingFor, options }: LookingForTagsProps) {
  if (lookingFor.length === 0) return null;

  const labelById = new Map(options.map((option) => [option.id, option.label]));

  return (
    <div className="flex flex-wrap gap-1.5">
      {lookingFor.map((id) => (
        <Badge key={id} tone="neutral">
          {labelById.get(id) ?? id}
        </Badge>
      ))}
    </div>
  );
}
