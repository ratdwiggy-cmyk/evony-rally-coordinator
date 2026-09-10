import { Badge } from '../ui';
import type { BossCategory } from '../../types/models';

interface CanLeadTagsProps {
  canLead: string[];
  categories: BossCategory[];
}

/** Resolves each declared "Can Lead" boss-category id to its configured label. */
export function CanLeadTags({ canLead, categories }: CanLeadTagsProps) {
  if (canLead.length === 0) return null;

  const labelById = new Map(categories.map((category) => [category.id, category.label]));

  return (
    <div className="flex flex-wrap gap-1.5">
      {canLead.map((id) => (
        <Badge key={id} tone="gold">
          {labelById.get(id) ?? id}
        </Badge>
      ))}
    </div>
  );
}
