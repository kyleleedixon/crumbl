const DIACRITIC_REGEX = /[\u0300-\u036f]/g;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(DIACRITIC_REGEX, "")
    .toLowerCase()
    .replace(/®|™|©/g, "")
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PARTNER_REGEX = /\bft\.?\s+([A-Z0-9][^()]*?)(?=$|\s*[()])/i;
const PAREN_TAG_REGEX = /\(([^)]+)\)/g;
const FLAME_REGEX = /🔥/g;

const NON_FLAVOR_SLUGS = new Set([
  "similar-posts",
  "post-navigation",
  "leave-a-comment",
  "no-comments",
  "comments",
  "share-this",
  "read-more",
  "continue-reading",
  "previous",
  "next",
  "home",
  "menu",
  "menus",
  "archive",
  "archives",
  "spoilers",
  "weekly-menu",
  "monthly-menu",
  "this-week",
  "next-week",
  "crumbl",
  "crumbl-cookies",
  "categories",
  "tags",
  "uncategorized",
  "copyright",
  "search",
  "recent-posts",
  "featured",
  "trending",
  "name",
  "surprise",
  "coming-soon",
  "learn-more",
  "order-now",
  "shop",
  "cart",
  "checkout",
  "sign-in",
  "sign-up",
  "log-in",
  "log-out",
  "single",
  "flavor",
  "profile",
  "price",
  "prices",
  "prices-menu",
  "cookies-profile",
  "cookies-lineup-profile",
  "best",
  "best-for",
  "best-of",
  "tip",
  "pro-tip",
  "taste",
  "texture",
  "served",
  "flavor-profile",
  "ideal-customers",
  "who-should-try-it",
  "crumblcookies-com",
]);

const NON_FLAVOR_PATTERNS = [
  /^\d+-?pack$/i,
  /^pack-of-\d+$/i,
  /^page-\d+$/i,
  /^by-[a-z-]+$/i,
  /^tag-/i,
  /^category-/i,
  /^\d{4}$/,
  /^week-of-/i,
  /^\d+-/,
  /-menu-archive$/i,
  /-menu$/i,
  /^this-week-/i,
  /-prices?(-|$)/i,
  /-archive$/i,
  /-profile$/i,
  /-lineup(-|$)/i,
  /^(jan|feb|mar|apr|may|june?|july?|aug|sept?|oct|nov|dec)-\d/i,
  /^week-/i,
  /^what-/i,
  /-com$/i,
  /^crumbl-cookies-/i,
  /^crumble-the(-|$)/i,
  /-\d{4}$/,
];

const JUNK_SUFFIX_REGEX = /\b(posts?|navigation|comments?|page|categories|tags?)$/i;
const JUNK_NAME_PATTERNS = [
  /:/,
  /\?/,
  /^\d+\.\s/,
  /\bmenu\b/i,
  /\barchive\b/i,
  /\bprices?\b/i,
  /\bprofile\b/i,
  /\blineup\b/i,
  /\bweekly\s+flavor/i,
  /\bthis\s+week\b/i,
];

export function isLikelyFlavor(name: string, slug: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 3) return false;
  if (trimmed.length > 55) return false;
  if (/\.$/.test(trimmed)) return false;
  if (NON_FLAVOR_SLUGS.has(slug)) return false;
  if (NON_FLAVOR_PATTERNS.some((re) => re.test(slug))) return false;
  if (JUNK_SUFFIX_REGEX.test(trimmed)) return false;
  if (JUNK_NAME_PATTERNS.some((re) => re.test(trimmed))) return false;
  // reject text with no letters (e.g. "$4.49") or that looks like a heading number
  if (!/[a-z]/i.test(trimmed)) return false;
  return true;
}

export type ParsedFlavor = {
  name: string;
  partnerBrand: string | null;
  isNCD: boolean;
  isNew: boolean;
  isFeatured: boolean;
  slug: string;
  aliases: string[];
};

export function parseFlavorLine(raw: string): ParsedFlavor {
  const isFeatured = FLAME_REGEX.test(raw);
  let working = raw.replace(FLAME_REGEX, "").trim();

  let isNCD = false;
  let isNew = false;
  const tags: string[] = [];
  working = working.replace(PAREN_TAG_REGEX, (_, tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t === "ncd") isNCD = true;
    else if (t === "new") isNew = true;
    else tags.push(tag.trim());
    return "";
  });

  let partnerBrand: string | null = null;
  const partnerMatch = working.match(PARTNER_REGEX);
  if (partnerMatch) {
    partnerBrand = partnerMatch[1].trim().replace(/®|™|©/g, "").trim();
    working = working.replace(PARTNER_REGEX, "").trim();
  }

  const name = working.replace(/\s{2,}/g, " ").replace(/[-–—]\s*$/, "").trim();
  const aliases = tags.length ? tags : [];

  return {
    name,
    partnerBrand,
    isNCD,
    isNew,
    isFeatured,
    slug: slugify(partnerBrand ? `${name} ft ${partnerBrand}` : name),
    aliases,
  };
}
