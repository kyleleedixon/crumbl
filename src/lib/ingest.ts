import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { appearances, flavors, weeks } from "@/db/schema";
import { canonicalSlug, isLegacyStaple } from "./aliases";
import type { ScrapedWeek } from "./scrape/types";

export type IngestResult = {
  weekId: number;
  weekInserted: boolean;
  newFlavors: string[];
  returningFlavors: string[];
  totalFlavors: number;
};

export async function ingestScrapedWeek(week: ScrapedWeek): Promise<IngestResult> {
  const [existingWeek] = await db
    .select()
    .from(weeks)
    .where(eq(weeks.startDate, week.startDate))
    .limit(1);

  const weekRow =
    existingWeek ??
    (
      await db
        .insert(weeks)
        .values({
          startDate: week.startDate,
          endDate: week.endDate,
          label: week.label,
        })
        .returning()
    )[0];

  const newFlavors: string[] = [];
  const returningFlavors: string[] = [];

  for (const f of week.flavors) {
    const slug = canonicalSlug(f.slug);
    const [existing] = await db
      .select()
      .from(flavors)
      .where(eq(flavors.slug, slug))
      .limit(1);

    let flavorRow = existing;
    if (!flavorRow) {
      const [inserted] = await db
        .insert(flavors)
        .values({
          slug,
          name: f.name,
          description: f.description ?? null,
          category: f.isNCD ? "ncd" : "cookie",
          imageUrl: f.imageUrl ?? null,
          partnerBrand: f.partnerBrand,
        })
        .returning();
      flavorRow = inserted;
    } else if (
      (f.imageUrl && !existing.imageUrl) ||
      (f.description && !existing.description)
    ) {
      await db
        .update(flavors)
        .set({
          imageUrl: existing.imageUrl ?? f.imageUrl ?? null,
          description: existing.description ?? f.description ?? null,
        })
        .where(eq(flavors.id, existing.id));
    }

    const priorAppearances = await db
      .select({ id: appearances.id })
      .from(appearances)
      .innerJoin(weeks, eq(appearances.weekId, weeks.id))
      .where(
        and(
          eq(appearances.flavorId, flavorRow.id),
          lt(weeks.startDate, week.startDate),
        ),
      )
      .limit(1);

    const isDebut = priorAppearances.length === 0 && !isLegacyStaple(slug);
    const isReturn = !isDebut && !!f.isNew;
    if (isDebut) newFlavors.push(f.name);
    else if (isReturn) returningFlavors.push(f.name);

    await db
      .insert(appearances)
      .values({
        flavorId: flavorRow.id,
        weekId: weekRow.id,
        isDebut,
        isReturn,
        isNew: f.isNew,
        isFeatured: f.isFeatured,
        source: week.source,
        rawName: f.rawName,
      })
      .onConflictDoNothing({
        target: [appearances.flavorId, appearances.weekId],
      });
  }

  return {
    weekId: weekRow.id,
    weekInserted: !existingWeek,
    newFlavors,
    returningFlavors,
    totalFlavors: week.flavors.length,
  };
}

export async function ingestScrapedWeeks(list: ScrapedWeek[]) {
  const results: IngestResult[] = [];
  const sorted = [...list].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  for (const w of sorted) {
    results.push(await ingestScrapedWeek(w));
  }
  return results;
}
