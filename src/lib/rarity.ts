import { sql, desc, asc, eq, and, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { appearances, flavors, weeks } from "@/db/schema";
import { isLegacyStaple } from "./aliases";

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

export type Bucket = "legendary" | "rare" | "uncommon" | "common" | "classic" | "new";

export function bucketFor(row: {
  rarity: number;
  eligibleWeeks: number;
  slug?: string;
}): Bucket {
  if (row.slug && isLegacyStaple(row.slug)) return "classic";
  if (row.eligibleWeeks < MIN_ELIGIBLE_WEEKS) return "new";
  const pct = row.rarity * 100;
  if (pct < 3) return "legendary";
  if (pct < 8) return "rare";
  if (pct < 15) return "uncommon";
  return "common";
}

export function bucketLabel(b: Bucket): string {
  return {
    legendary: "Legendary",
    rare: "Rare",
    uncommon: "Uncommon",
    common: "Common",
    classic: "Classic",
    new: "New",
  }[b];
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
    .filter((r) => r.eligibleWeeks >= MIN_ELIGIBLE_WEEKS)
    .sort((a, b) => b.rarity - a.rarity || b.appearanceCount - a.appearanceCount)
    .slice(0, limit);
}

export async function catalogBucketCounts(): Promise<Record<Bucket, number>> {
  const latest = await latestWeekStart();
  const empty: Record<Bucket, number> = {
    legendary: 0,
    rare: 0,
    uncommon: 0,
    common: 0,
    classic: 0,
    new: 0,
  };
  if (!latest) return empty;
  const total = await totalWeeksTracked();
  const rows = await aggregateAll();
  for (const r of rows) {
    const row = toRarityRow(r, latest, total);
    empty[bucketFor(row)] += 1;
  }
  return empty;
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

export type WeekMenuItemStats = Awaited<
  ReturnType<typeof weekMenu>
>[number] & {
  bucket: Bucket;
  rarity: number;
  appearanceCount: number;
  eligibleWeeks: number;
  firstSeen: string;
  previousAppearance: string | null;
  weeksSinceLast: number | null;
};

export async function weekInsights(weekId: number): Promise<WeekMenuItemStats[]> {
  const [current] = await db
    .select({ startDate: weeks.startDate })
    .from(weeks)
    .where(eq(weeks.id, weekId));
  if (!current) return [];

  const menu = await weekMenu(weekId);
  const latest = (await latestWeekStart()) ?? current.startDate;
  const slugs = menu.map((m) => m.slug);
  const timelines = await flavorTimelines(slugs);

  const previous = slugs.length
    ? await db
        .select({
          slug: flavors.slug,
          previousDate: sql<string | null>`max(${weeks.startDate})`,
        })
        .from(appearances)
        .innerJoin(flavors, eq(flavors.id, appearances.flavorId))
        .innerJoin(weeks, eq(weeks.id, appearances.weekId))
        .where(
          and(
            inArray(flavors.slug, slugs),
            sql`${weeks.startDate} < ${current.startDate}`,
          ),
        )
        .groupBy(flavors.slug)
    : [];
  const prevMap = new Map(previous.map((p) => [p.slug, p.previousDate]));

  return menu.map((m) => {
    const t = timelines.get(m.slug);
    const firstSeen = t?.firstSeen ?? current.startDate;
    const appearanceCount = t?.appearanceCount ?? 1;
    const eligibleWeeks = Math.max(1, weeksBetween(firstSeen, latest) + 1);
    const rarity = appearanceCount / eligibleWeeks;
    const bucket = bucketFor({ rarity, eligibleWeeks, slug: m.slug });
    const prev = prevMap.get(m.slug) ?? null;
    const weeksSinceLast = prev
      ? weeksBetween(prev, current.startDate)
      : null;
    return {
      ...m,
      firstSeen,
      appearanceCount,
      eligibleWeeks,
      rarity,
      bucket,
      previousAppearance: prev,
      weeksSinceLast,
    };
  });
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
  const bucket = bucketFor({ rarity, eligibleWeeks, slug });

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
