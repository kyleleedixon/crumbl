import * as cheerio from "cheerio";
import { fetchHtml } from "./fetch";
import { fetchProfileMeta } from "./enrich";
import { parseFlavorLine, slugify, isLikelyFlavor } from "../slug";
import {
  currentWeekStart,
  toISODate,
  weekEnd,
  formatWeekLabel,
} from "../week";
import type { ScrapedWeek, ScrapedFlavor } from "./types";

const CRUMBL_URL = "https://crumblcookies.com/";
// Crumbl has served both absolute and root-relative profile links; accept either.
const PROFILE_HREF_REGEX =
  /(?:https?:\/\/crumblcookies\.com|["'(])\/profiles\/([a-z0-9-]+)/gi;

export async function scrapeCrumblOfficial(now = new Date()): Promise<ScrapedWeek> {
  const html = await fetchHtml(CRUMBL_URL);
  const $ = cheerio.load(html);

  const profileSlugs = new Set<string>();
  for (const m of html.matchAll(PROFILE_HREF_REGEX)) {
    profileSlugs.add(m[1]);
  }

  type Draft = ScrapedFlavor & { crumblProfileSlug: string | null };
  const flavors: Draft[] = [];
  const seen = new Set<string>();

  const matchProfile = (nameSlug: string): string | null => {
    for (const p of profileSlugs) {
      const bare = p.replace(/-set-of-\d+$/, "");
      if (bare === nameSlug || p === nameSlug) return p;
      if (nameSlug.startsWith(bare) || bare.startsWith(nameSlug)) return p;
    }
    return null;
  };

  const push = (
    raw: string,
    extras?: { description?: string | null; imageUrl?: string | null; profileSlug?: string },
  ) => {
    const parsed = parseFlavorLine(raw);
    if (!parsed.name || parsed.name.length < 3) return;
    if (!isLikelyFlavor(parsed.name, parsed.slug)) return;
    if (seen.has(parsed.slug)) return;
    const nameSlug = slugify(parsed.name);
    const profileSlug = extras?.profileSlug ?? matchProfile(nameSlug);
    if (!profileSlug) return;
    seen.add(parsed.slug);
    flavors.push({
      rawName: raw,
      name: parsed.name,
      slug: parsed.slug,
      partnerBrand: parsed.partnerBrand,
      isNCD: parsed.isNCD,
      isNew: parsed.isNew,
      isFeatured: parsed.isFeatured,
      description: extras?.description ?? null,
      imageUrl: extras?.imageUrl ?? null,
      crumblProfileSlug: profileSlug,
    });
  };

  // Primary: menu cards link to the profile and carry the full display name
  // (including "ft. Partner") as the first image's alt text.
  $("a[href*='/profiles/']").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const profileSlug = href.match(/\/profiles\/([a-z0-9-]+)/i)?.[1];
    const alt = $(a).find("img[alt]").first().attr("alt")?.trim();
    if (profileSlug && alt) push(alt, { profileSlug });
  });

  const nextData = $("#__NEXT_DATA__").html();
  if (flavors.length < 4 && nextData) {
    try {
      const json = JSON.parse(nextData);
      collectFromNextData(json, (raw, extras) => push(raw, extras));
    } catch {
      // fall through
    }
  }

  // Fallback: derive names from profile slugs directly if NEXT walk missed
  if (flavors.length < 4 && profileSlugs.size) {
    for (const slug of profileSlugs) {
      const pretty = slug
        .replace(/-set-of-\d+$/, "")
        .split("-")
        .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
        .join(" ");
      push(pretty);
    }
  }

  // Enrich with og:image and description from each profile page (small N, one week)
  await Promise.all(
    flavors.map(async (f) => {
      if (!f.crumblProfileSlug) return;
      const meta = await fetchProfileMeta(f.crumblProfileSlug);
      if (!f.imageUrl && meta.imageUrl) f.imageUrl = meta.imageUrl;
      if (!f.description && meta.description) f.description = meta.description;
    }),
  );

  const start = currentWeekStart(now);
  const end = weekEnd(start);
  return {
    startDate: toISODate(start),
    endDate: toISODate(end),
    label: formatWeekLabel(start),
    source: "crumbl_official",
    flavors,
  };
}

type NextCollector = (
  raw: string,
  extras?: { description?: string | null; imageUrl?: string | null },
) => void;

function collectFromNextData(node: unknown, emit: NextCollector, depth = 0): void {
  if (!node || depth > 12) return;
  if (Array.isArray(node)) {
    for (const item of node) collectFromNextData(item, emit, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;

  const name = pickString(obj, ["name", "title", "flavorName", "productName"]);
  const desc = pickString(obj, ["description", "shortDescription", "subtitle"]);
  const img = pickString(obj, ["imageUrl", "image", "photo", "hero", "src"]);
  if (name) emit(name, { description: desc, imageUrl: img });

  for (const value of Object.values(obj)) {
    collectFromNextData(value, emit, depth + 1);
  }
}

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
