import "./load-env";
import { scrapeCrumblMenuUsArchive } from "../src/lib/scrape/crumblmenu-us";
import { scrapeMenuCrumblArchive } from "../src/lib/scrape/menucrumblcookies-com";
import { ingestScrapedWeeks } from "../src/lib/ingest";

async function main() {
  const source = process.argv[2] ?? "both";
  const all = [] as Awaited<ReturnType<typeof scrapeCrumblMenuUsArchive>>;

  if (source === "crumblmenu" || source === "both") {
    console.log("→ Scraping crumblmenu.us…");
    const rows = await scrapeCrumblMenuUsArchive();
    console.log(`  ${rows.length} weeks parsed`);
    all.push(...rows);
  }
  if (source === "menucrumbl" || source === "both") {
    console.log("→ Scraping menucrumblcookies.com…");
    const rows = await scrapeMenuCrumblArchive();
    console.log(`  ${rows.length} weeks parsed`);
    all.push(...rows);
  }

  if (!all.length) {
    console.log("No weeks scraped.");
    return;
  }

  console.log(`→ Ingesting ${all.length} weeks…`);
  const results = await ingestScrapedWeeks(all);
  const newFlavors = new Set<string>();
  let newWeeks = 0;
  for (const r of results) {
    if (r.weekInserted) newWeeks += 1;
    for (const f of r.newFlavors) newFlavors.add(f);
  }
  console.log(`✔ Backfill done. ${newWeeks} new weeks, ${newFlavors.size} new flavors.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
