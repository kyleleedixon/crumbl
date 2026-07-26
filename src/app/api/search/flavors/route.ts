import { NextResponse } from "next/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { appearances, flavors, weeks } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const pattern = `%${q}%`;
  const rows = await db
    .select({
      slug: flavors.slug,
      name: flavors.name,
      partnerBrand: flavors.partnerBrand,
      imageUrl: flavors.imageUrl,
      appearanceCount: sql<number>`count(${appearances.id})::int`,
      lastSeen: sql<string | null>`max(${weeks.startDate})`,
    })
    .from(flavors)
    .leftJoin(appearances, eq(appearances.flavorId, flavors.id))
    .leftJoin(weeks, eq(weeks.id, appearances.weekId))
    .where(
      or(
        ilike(flavors.name, pattern),
        ilike(flavors.slug, pattern),
        and(sql`${flavors.partnerBrand} is not null`, ilike(flavors.partnerBrand, pattern)),
      ),
    )
    .groupBy(flavors.id)
    .orderBy(sql`count(${appearances.id}) desc, ${flavors.name} asc`)
    .limit(10);
  return NextResponse.json({ results: rows });
}
