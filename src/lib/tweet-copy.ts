import type { RarityRow } from "./rarity";

export type WeekMenuItem = {
  name: string;
  partnerBrand: string | null;
  isDebut: boolean;
  isReturn: boolean;
};

const WEEKLY_HASHTAGS = "#Crumbl #CrumblCookies #CookieDrop";
const RARITY_HASHTAGS = "#Crumbl #CrumblCookies #RareDrop";
const TWEET_LIMIT = 280;

export function weeklyMenuTweet(
  weekLabel: string,
  menu: WeekMenuItem[],
  siteUrl: string,
): string {
  const debuts = menu.filter((m) => m.isDebut);
  const returns = menu.filter((m) => !m.isDebut && m.isReturn);
  const rollovers = menu.length - debuts.length - returns.length;

  const lines: string[] = [];
  lines.push(`🍪 Crumbl · Week of ${weekLabel}`);
  lines.push(
    `${menu.length} flavors · ${debuts.length} debuts · ${returns.length} comebacks · ${rollovers} returning`,
  );
  lines.push("");
  if (debuts.length) {
    lines.push(`✨ ${debuts.map(displayName).slice(0, 3).join(", ")}`);
  }
  if (returns.length) {
    lines.push(`🔁 ${returns.map(displayName).slice(0, 3).join(", ")}`);
  }
  lines.push("");
  lines.push(siteUrl);
  lines.push(WEEKLY_HASHTAGS);
  return clampTweet(lines.join("\n"));
}

export function rarityTweet(row: RarityRow, siteUrl: string): string {
  const pct = Math.round(row.rarity * 1000) / 10;
  const lines = [
    `🕵️ Rare Crumbl alert`,
    ``,
    `${displayName(row)} · seen in only ${row.appearanceCount} tracked weeks (${pct}%)`,
    ``,
    siteUrl,
    RARITY_HASHTAGS,
  ];
  return clampTweet(lines.join("\n"));
}

function clampTweet(text: string): string {
  if (text.length <= TWEET_LIMIT) return text;
  return text.slice(0, TWEET_LIMIT - 1) + "…";
}

function displayName(m: { name: string; partnerBrand: string | null }): string {
  return m.partnerBrand ? `${m.name} ft. ${m.partnerBrand}` : m.name;
}
