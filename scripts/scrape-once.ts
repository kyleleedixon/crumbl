import "./load-env";
import { scrapeCrumblOfficial } from "../src/lib/scrape/crumbl-official";

async function main() {
  const scraped = await scrapeCrumblOfficial();
  console.log(`→ ${scraped.label}: ${scraped.flavors.length} flavors`);
  scraped.flavors.forEach((f) =>
    console.log(`  • ${f.name}${f.partnerBrand ? ` ft. ${f.partnerBrand}` : ""}`),
  );
  if (process.argv.includes("--ingest")) {
    const { ingestScrapedWeek } = await import("../src/lib/ingest");
    const result = await ingestScrapedWeek(scraped);
    console.log("Ingest result:", result);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
