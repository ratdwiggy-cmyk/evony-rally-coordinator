import type { BossCategory } from '../../types/models';

interface CapabilityListProps {
  capability: Record<string, string>;
  categories: BossCategory[];
}

/**
 * Compact "Capability summary" — self-declared max comfortable solo level
 * per boss category (Section 4.5). Purely informational: rendered as plain
 * "Label value" pairs in the data (monospace) type face, never ranked or
 * computed on. Entries with no boss-category match still render (using the
 * raw key) so nothing silently disappears if config hasn't loaded yet.
 */
export function CapabilityList({ capability, categories }: CapabilityListProps) {
  const labelById = new Map(categories.map((category) => [category.id, category.label]));
  const orderById = new Map(categories.map((category) => [category.id, category.order]));

  const entries = Object.entries(capability)
    .filter(([, value]) => value && value.trim().length > 0)
    .sort(([a], [b]) => (orderById.get(a) ?? 0) - (orderById.get(b) ?? 0));

  if (entries.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {entries.map(([id, value]) => (
        <li key={id} className="flex items-baseline justify-between gap-3 text-xs">
          <span className="text-ash-400">{labelById.get(id) ?? id}</span>
          <span className="font-mono text-ash-200">{value}</span>
        </li>
      ))}
    </ul>
  );
}
