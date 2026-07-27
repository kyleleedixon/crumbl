// Crumbl renames products between weeks and has staple flavors that predate
// our tracker (which started 2025-09-01). Without these overrides the ingest
// pipeline would falsely flag core cookies like the classic Chocolate Chip as
// brand-new debuts the first time we happen to record them.

// Incoming scraped slug → canonical slug in our DB. Use when Crumbl renames a
// product and we want the appearance to merge into the existing flavor row.
export const SLUG_ALIASES: Record<string, string> = {
  "milk-chocolate-chip-cookie": "chocolate-chip-cookie",
};

// Slugs whose corresponding flavor is a well-known Crumbl staple that existed
// before our tracker. When one of these first appears, we do not mark it as a
// debut — it's just the first time we've observed it. Conservative on purpose:
// only include cookies you're certain existed pre-Sep-2025.
export const LEGACY_STAPLES: Set<string> = new Set([
  "chocolate-chip-cookie",
  "pink-sugar-cookie",
]);

export function canonicalSlug(slug: string): string {
  return SLUG_ALIASES[slug] ?? slug;
}

export function isLegacyStaple(slug: string): boolean {
  return LEGACY_STAPLES.has(canonicalSlug(slug));
}
