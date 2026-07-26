import * as cheerio from "cheerio";
import { fetchHtml } from "./fetch";
import { parseFlavorLine, isLikelyFlavor } from "../slug";
import { parseWeekRange, toISODate } from "../week";
import type { ScrapedWeek, ScrapedFlavor } from "./types";

const ARCHIVE_ROOT = "https://menucrumblcookies.com/crumbl-cookies-archive";
const WEEK_LINK_REGEX = /(?<range>[A-Za-z]+\s+\d{1,2}\s*[–-]\s*(?:[A-Za-z]+\s+)?\d{1,2},?\s*\d{4})/;

export async function scrapeMenuCrumblArchive(
  maxPages = 6,
): Promise<ScrapedWeek[]> {
  const weeks: ScrapedWeek[] = [];
  const visited = new Set<string>();

  for (let page = 1; page <= maxPages; page += 1) {
    const url = page === 1 ? `${ARCHIVE_ROOT}/` : `${ARCHIVE_ROOT}/page/${page}/`;
    let html: string;
    try {
      html = await fetchHtml(url);
    } catch {
      break;
    }
    const $ = cheerio.load(html);
    const links = new Set<string>();
    $("a[href*='menu']").each((_, a) => {
      const href = $(a).attr("href");
      if (!href) return;
      if (!/menucrumblcookies\.com/.test(href)) return;
      if (!/\d{4}/.test(href)) return;
      links.add(href.split("#")[0]);
    });
    if (!links.size) break;

    for (const link of links) {
      if (visited.has(link)) continue;
      visited.add(link);
      try {
        const week = await scrapeWeekPage(link);
        if (week && week.flavors.length) weeks.push(week);
      } catch {
        // continue on individual page failures
      }
    }
  }
  return weeks;
}

async function scrapeWeekPage(url: string): Promise<ScrapedWeek | null> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const title = $("h1").first().text().trim() || $("title").text().trim();
  const match = title.match(WEEK_LINK_REGEX);
  if (!match) return null;
  const parsed = parseWeekRange(match.groups!.range);
  if (!parsed) return null;

  const flavors: ScrapedFlavor[] = [];
  const seen = new Set<string>();

  $("article, main, .entry-content")
    .find("h2, h3, li, strong")
    .each((_, el) => {
      const raw = $(el).text().trim();
      if (!raw) return;
      if (raw.length > 90) return;
      if (!/[a-z]/i.test(raw)) return;
      if (/^(week|menu|crumbl|new|classic|next|previous|archive|home|search)$/i.test(raw)) return;
      const parsedName = parseFlavorLine(raw);
      if (!parsedName.name || parsedName.name.length < 3) return;
      if (!isLikelyFlavor(parsedName.name, parsedName.slug)) return;
      if (seen.has(parsedName.slug)) return;
      seen.add(parsedName.slug);
      flavors.push({
        rawName: raw,
        name: parsedName.name,
        slug: parsedName.slug,
        partnerBrand: parsedName.partnerBrand,
        isNCD: parsedName.isNCD,
        isNew: parsedName.isNew,
        isFeatured: parsedName.isFeatured,
      });
    });

  return {
    startDate: toISODate(parsed.start),
    endDate: toISODate(parsed.end),
    label: match.groups!.range.trim(),
    source: "menucrumblcookies_com",
    flavors,
  };
}
