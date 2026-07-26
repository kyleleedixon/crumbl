import "./load-env";
import { inArray } from "drizzle-orm";
import { db } from "../src/db/client";
import { flavors } from "../src/db/schema";
import { isLikelyFlavor } from "../src/lib/slug";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const all = await db.select().from(flavors);
  const bad = all.filter((f) => !isLikelyFlavor(f.name, f.slug));

  console.log(`→ ${all.length} total flavors, ${bad.length} flagged for removal`);
  for (const f of bad) {
    console.log(`  x ${f.slug} — "${f.name}"`);
  }

  if (!bad.length) {
    console.log("✔ nothing to clean.");
    return;
  }

  if (DRY_RUN) {
    console.log("(dry run — not deleting)");
    return;
  }

  const ids = bad.map((f) => f.id);
  await db.delete(flavors).where(inArray(flavors.id, ids));
  console.log(`✔ deleted ${ids.length} flavors (appearances cascaded).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
