import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { fetchHtml } from "./fetch";
import { parseFlavorLine, isLikelyFlavor } from "../slug";
import { parseWeekRange, toISODate } from "../week";
import type { ScrapedWeek, ScrapedFlavor } from "./types";

const ARCHIVE_URL = "https://crumblmenu.us/all-week-menus/";
const WEEK_HEADING_REGEX =
  /Crumbl\s+Cookie\s+Menu\s*[—-]\s*Week\s+of\s+(.+?)(?:$|\.)/i;

export async function scrapeCrumblMenuUsArchive(): Promise<ScrapedWeek[]> {
  const html = await fetchHtml(ARCHIVE_URL);
  const $ = cheerio.load(html);

  const weeks: ScrapedWeek[] = [];
  let currentYear = new Date().getFullYear();

  $("h2, h3").each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (!text) return;

    const yearMatch = text.match(/(\d{4})/);
    if (yearMatch && /^(📅\s*)?[A-Za-z]+\s+\d{4}/.test(text)) {
      currentYear = parseInt(yearMatch[1], 10);
    }

    const weekMatch = text.match(WEEK_HEADING_REGEX);
    if (!weekMatch) return;

    const rangeStr = weekMatch[1];
    const parsed = parseWeekRange(rangeStr, currentYear);
    if (!parsed) return;

    const flavors = collectFlavorsAfter($, el);
    if (!flavors.length) return;

    weeks.push({
      startDate: toISODate(parsed.start),
      endDate: toISODate(parsed.end),
      label: rangeStr.trim(),
      source: "crumblmenu_us",
      flavors,
    });
  });

  return weeks;
}

function collectFlavorsAfter(
  $: cheerio.CheerioAPI,
  headingEl: Element,
): ScrapedFlavor[] {
  const results: ScrapedFlavor[] = [];
  const seen = new Set<string>();

  let node: AnyNode | null = (headingEl.next as AnyNode | null) ?? null;
  while (node) {
    const tag = "tagName" in node ? (node as Element).tagName?.toLowerCase() : undefined;
    if (tag === "h2" || tag === "h3") break;
    if (tag === "ul" || tag === "ol") {
      $(node as Element)
        .find("li")
        .each((_, li) => {
          const raw = $(li).text().trim();
          if (!raw) return;
          const parsed = parseFlavorLine(raw);
          if (!parsed.name || parsed.name.length < 2) return;
          if (!isLikelyFlavor(parsed.name, parsed.slug)) return;
          if (seen.has(parsed.slug)) return;
          seen.add(parsed.slug);
          results.push({
            rawName: raw,
            name: parsed.name,
            slug: parsed.slug,
            partnerBrand: parsed.partnerBrand,
            isNCD: parsed.isNCD,
            isNew: parsed.isNew,
            isFeatured: parsed.isFeatured,
          });
        });
    }
    node = (node.next as AnyNode | null) ?? null;
  }
  return results;
}
