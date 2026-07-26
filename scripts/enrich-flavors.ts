import "./load-env";
import { eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { flavors } from "../src/db/schema";
import { fetchProfileMeta } from "../src/lib/scrape/enrich";
import { fetchHtml } from "../src/lib/scrape/fetch";
import { slugify } from "../src/lib/slug";

const CONCURRENCY = 4;
const PAUSE_MS = 250;

async function collectHomepageProfileSlugs(): Promise<string[]> {
  try {
    const html = await fetchHtml("https://crumblcookies.com/");
    const set = new Set<string>();
    for (const m of html.matchAll(/\/profiles\/([a-z0-9-]+)/gi)) set.add(m[1]);
    return [...set];
  } catch {
    return [];
  }
}

async function main() {
  const missing = await db
    .select()
    .from(flavors)
    .where(or(isNull(flavors.imageUrl), eq(flavors.imageUrl, "")));

  console.log(`→ ${missing.length} flavors missing image`);
  const homepageSlugs = await collectHomepageProfileSlugs();
  console.log(`→ ${homepageSlugs.length} profile slugs on crumblcookies.com homepage`);

  let enriched = 0;
  let skipped = 0;
  const queue = [...missing];

  async function worker() {
    while (queue.length) {
      const flavor = queue.shift();
      if (!flavor) return;
      const candidateSlugs = candidatesFor(flavor.slug, flavor.name, homepageSlugs);
      let meta = { imageUrl: null as string | null, description: null as string | null };
      for (const cand of candidateSlugs) {
        meta = await fetchProfileMeta(cand);
        if (meta.imageUrl) break;
      }
      if (!meta.imageUrl && !meta.description) {
        skipped += 1;
      } else {
        await db
          .update(flavors)
          .set({
            imageUrl: meta.imageUrl ?? flavor.imageUrl,
            description: meta.description ?? flavor.description,
          })
          .where(eq(flavors.id, flavor.id));
        enriched += 1;
      }
      if ((enriched + skipped) % 20 === 0) {
        console.log(`  ${enriched} enriched / ${skipped} skipped / ${queue.length} left`);
      }
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`✔ done. ${enriched} enriched, ${skipped} without image.`);
}

function candidatesFor(
  slug: string,
  name: string,
  homepageSlugs: string[],
): string[] {
  const bare = slugify(name.replace(/\s+ft\.?\s+.+$/i, ""));
  const set = new Set<string>();

  // Prefer exact/prefix matches from live homepage — those definitely have og:image.
  const stripSet = (s: string) => s.replace(/-set-of-\d+$/, "").replace(/-single$/, "");
  for (const hp of homepageSlugs) {
    const hpBare = stripSet(hp);
    if (hpBare === slug || hpBare === bare) set.add(hp);
    if (slug.startsWith(hpBare) || hpBare.startsWith(slug)) set.add(hp);
    if (bare.startsWith(hpBare) || hpBare.startsWith(bare)) set.add(hp);
  }

  // Slug variants: crumblcookies.com collapses "M&M's" to "mms" (no "-and-"),
  // while our slugify expands "&" to " and ". Try both spellings when applicable.
  const guessBases = new Set<string>([
    slug,
    bare,
    slug.replace(/-ft-.+$/, ""),
  ]);
  for (const base of [...guessBases]) {
    if (base.includes("-and-")) {
      guessBases.add(base.replace(/-and-/g, ""));
      guessBases.add(base.replace(/-and-/g, "-"));
    }
  }
  for (const b of guessBases) {
    if (!b) continue;
    set.add(b);
    set.add(`${b}-set-of-2`);
    set.add(`${b}-set-of-4`);
    set.add(`${b}-single`);
  }
  return [...set];
}

main().catch((e) => {
  console.error(e);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}).finally(() => {
  // drizzle-neon-http uses fetch; nothing to close, but leave hook
  void sql;
});
