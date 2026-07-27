import "./load-env";
import { db } from "@/db/client";
import { eq, inArray, and } from "drizzle-orm";
import { appearances, flavors } from "@/db/schema";
import { LEGACY_STAPLES } from "@/lib/aliases";

async function main() {
  const staples = Array.from(LEGACY_STAPLES);
  const flavorRows = await db
    .select({ id: flavors.id, slug: flavors.slug, name: flavors.name })
    .from(flavors)
    .where(inArray(flavors.slug, staples));

  if (!flavorRows.length) {
    console.log("No LEGACY_STAPLES flavors present in DB — nothing to backfill.");
    return;
  }

  for (const f of flavorRows) {
    const res = await db
      .update(appearances)
      .set({ isDebut: false })
      .where(and(eq(appearances.flavorId, f.id), eq(appearances.isDebut, true)))
      .returning({ id: appearances.id, weekId: appearances.weekId });
    if (res.length) {
      console.log(
        `[${f.slug}] cleared isDebut on ${res.length} appearance(s): weekIds=${res.map((r) => r.weekId).join(", ")}`,
      );
    } else {
      console.log(`[${f.slug}] no debut appearances to update`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
