import { sql, desc, asc, eq, and, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { appearances, flavors, weeks } from "@/db/schema";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
export const MIN_ELIGIBLE_WEEKS = 8;

export type RarityRow = {
  flavorId: number;
  slug: string;
  name: string;
  partnerBrand: string | null;
  imageUrl: string | null;
  appearanceCount: number;
  firstSeen: string;
  lastSeen: string;
  eligibleWeeks: number;
  weeksSinceLast: number;
  rarity: number; // adjusted: appearances / eligibleWeeks
  rawRarity: number; // appearances / totalTrackedWeeks
};

export type Bucket = "legendary" | "rare" | "uncommon" | "common" | "new";

export function bucketFor(row: {
  rarity: number;
  eligibleWeeks: number;
}): Bucket {
  if (row.eligibleWeeks < MIN_ELIGIBLE_WEEKS) return "new";
  const pct = row.rarity * 100;
  if (pct < 8) return "legendary";
  if (pct < 20) return "rare";
  if (pct < 40) return "uncommon";
  return "common";
}

export function bucketLabel(b: Bucket): string {
  return { legendary: "Legendary", rare: "Rare", uncommon: "Uncommon", common: "Common", new: "New" }[b];
}

export async function totalWeeksTracked(): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(weeks);
  return count ?? 0;
}

async function latestWeekStart(): Promise<string | null> {
  const [row] = await db
    .select({ startDate: sql<string>`max(${weeks.startDate})` })
    .from(weeks);
  return row?.startDate ?? null;
}

function weeksBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00Z`).getTime();
  const end = new Date(`${endIso}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((end - start) / MS_PER_WEEK));
}

type AggregateRow = {
  flavorId: number;
  slug: string;
  name: string;
  partnerBrand: string | null;
  imageUrl: string | null;
  appearanceCount: number;
  firstSeen: string;
  lastSeen: string;
};

function toRarityRow(agg: AggregateRow, latest: string, total: number): RarityRow {
  const eligibleWeeks = Math.max(1, weeksBetween(agg.firstSeen, latest) + 1);
  const weeksSinceLast = weeksBetween(agg.lastSeen, latest);
  return {
    ...agg,
    eligibleWeeks,
    weeksSinceLast,
    rarity: agg.appearanceCount / eligibleWeeks,
    rawRarity: total ? agg.appearanceCount / total : 0,
  };
}

async function aggregateAll(): Promise<AggregateRow[]> {
  return db
    .select({
      flavorId: flavors.id,
      slug: flavors.slug,
      name: flavors.name,
      partnerBrand: flavors.partnerBrand,
      imageUrl: flavors.imageUrl,
      appearanceCount: sql<number>`count(${appearances.id})::int`,
      firstSeen: sql<string>`min(${weeks.startDate})`,
      lastSeen: sql<string>`max(${weeks.startDate})`,
    })
    .from(flavors)
    .innerJoin(appearances, eq(appearances.flavorId, flavors.id))
    .innerJoin(weeks, eq(appearances.weekId, weeks.id))
    .groupBy(flavors.id);
}

export async function computeRarityLeaderboard(limit = 25): Promise<RarityRow[]> {
  const latest = await latestWeekStart();
  if (!latest) return [];
  const total = await totalWeeksTracked();
  const rows = await aggregateAll();
  return rows
    .map((r) => toRarityRow(r, latest, total))
    .filter((r) => r.eligibleWeeks >= MIN_ELIGIBLE_WEEKS)
    .sort((a, b) => a.rarity - b.rarity || b.weeksSinceLast - a.weeksSinceLast)
    .slice(0, limit);
}

export async function computeGreatestHits(limit = 25): Promise<RarityRow[]> {
  const latest = await latestWeekStart();
  if (!latest) return [];
  const total = await totalWeeksTracked();
  const rows = await aggregateAll();
  return rows
    .map((r) => toRarityRow(r, latest, total))
    .sort((a, b) => b.appearanceCount - a.appearanceCount)
    .slice(0, limit);
}

export async function computeRecentDebuts(limit = 12): Promise<RarityRow[]> {
  const latest = await latestWeekStart();
  if (!latest) return [];
  const total = await totalWeeksTracked();
  const rows = await aggregateAll();
  return rows
    .map((r) => toRarityRow(r, latest, total))
    .filter((r) => r.eligibleWeeks < MIN_ELIGIBLE_WEEKS)
    .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))
    .slice(0, limit);
}

export async function debutsForWeek(weekId: number) {
  return db
    .select({
      slug: flavors.slug,
      name: flavors.name,
      partnerBrand: flavors.partnerBrand,
      imageUrl: flavors.imageUrl,
    })
    .from(appearances)
    .innerJoin(flavors, eq(flavors.id, appearances.flavorId))
    .where(and(eq(appearances.weekId, weekId), eq(appearances.isDebut, true)));
}

export async function weekBySlugOrDate(startDate: string) {
  const [row] = await db
    .select()
    .from(weeks)
    .where(eq(weeks.startDate, startDate));
  return row ?? null;
}

export async function latestWeek() {
  const [row] = await db
    .select()
    .from(weeks)
    .orderBy(desc(weeks.startDate))
    .limit(1);
  return row ?? null;
}

export async function weekMenu(weekId: number) {
  return db
    .select({
      slug: flavors.slug,
      name: flavors.name,
      partnerBrand: flavors.partnerBrand,
      imageUrl: flavors.imageUrl,
      description: flavors.description,
      isDebut: appearances.isDebut,
      isReturn: appearances.isReturn,
      isFeatured: appearances.isFeatured,
      category: flavors.category,
    })
    .from(appearances)
    .innerJoin(flavors, eq(flavors.id, appearances.flavorId))
    .where(eq(appearances.weekId, weekId))
    .orderBy(asc(flavors.name));
}

export type FlavorTimeline = {
  firstSeen: string;
  lastSeen: string;
  appearanceCount: number;
};

export async function flavorTimelines(
  slugs: string[],
): Promise<Map<string, FlavorTimeline>> {
  if (!slugs.length) return new Map();
  const rows = await db
    .select({
      slug: flavors.slug,
      firstSeen: sql<string>`min(${weeks.startDate})`,
      lastSeen: sql<string>`max(${weeks.startDate})`,
      appearanceCount: sql<number>`count(${appearances.id})::int`,
    })
    .from(flavors)
    .innerJoin(appearances, eq(appearances.flavorId, flavors.id))
    .innerJoin(weeks, eq(weeks.id, appearances.weekId))
    .where(inArray(flavors.slug, slugs))
    .groupBy(flavors.slug);
  return new Map(rows.map((r) => [r.slug, r]));
}

export async function flavorHistory(slug: string) {
  const [flavor] = await db
    .select()
    .from(flavors)
    .where(eq(flavors.slug, slug));
  if (!flavor) return null;

  const appearanceRows = await db
    .select({
      weekId: weeks.id,
      startDate: weeks.startDate,
      endDate: weeks.endDate,
      label: weeks.label,
      isDebut: appearances.isDebut,
      isReturn: appearances.isReturn,
    })
    .from(appearances)
    .innerJoin(weeks, eq(weeks.id, appearances.weekId))
    .where(eq(appearances.flavorId, flavor.id))
    .orderBy(asc(weeks.startDate));

  const latest = await latestWeekStart();
  const total = await totalWeeksTracked();
  const first = appearanceRows[0]?.startDate ?? latest ?? null;
  const eligibleWeeks =
    first && latest ? Math.max(1, weeksBetween(first, latest) + 1) : 1;
  const longestGap = longestGapBetweenAppearances(appearanceRows.map((a) => a.startDate));
  const rarity = eligibleWeeks ? appearanceRows.length / eligibleWeeks : 0;
  const bucket = bucketFor({ rarity, eligibleWeeks });

  return {
    flavor,
    appearances: appearanceRows,
    stats: {
      totalAppearances: appearanceRows.length,
      rarity,
      rawRarity: total ? appearanceRows.length / total : 0,
      bucket,
      bucketLabel: bucketLabel(bucket),
      firstSeen: appearanceRows[0]?.startDate ?? null,
      lastSeen: appearanceRows.at(-1)?.startDate ?? null,
      longestGapWeeks: longestGap,
      eligibleWeeks,
      totalWeeksTracked: total,
    },
  };
}

function longestGapBetweenAppearances(sortedIsoDates: string[]): number {
  let longest = 0;
  for (let i = 1; i < sortedIsoDates.length; i += 1) {
    longest = Math.max(longest, weeksBetween(sortedIsoDates[i - 1], sortedIsoDates[i]));
  }
  return longest;
}

export async function recentWeeks(limit = 200) {
  return db.select().from(weeks).orderBy(desc(weeks.startDate)).limit(limit);
}

export async function statsSummary() {
  const total = await totalWeeksTracked();
  const [flavorCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(flavors);
  const [oneShotCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(
      db
        .select({ id: flavors.id })
        .from(flavors)
        .innerJoin(appearances, eq(appearances.flavorId, flavors.id))
        .groupBy(flavors.id)
        .having(sql`count(${appearances.id}) = 1`)
        .as("one_hits"),
    );
  const [partnerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(flavors)
    .where(sql`${flavors.partnerBrand} is not null`);

  return {
    totalWeeks: total,
    totalFlavors: flavorCount?.count ?? 0,
    oneHitFlavors: oneShotCount?.count ?? 0,
    partnerCollabs: partnerCount?.count ?? 0,
  };
}
