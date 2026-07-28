import type { RarityRow, WeekMenuItemStats, Bucket } from "./rarity";

const WEEKLY_HASHTAGS = "#Crumbl #CrumblCookies #CrumblMenu";
const RARITY_HASHTAGS = "#Crumbl #CrumblCookies #RareDrop";
const TWEET_LIMIT = 280;

const BUCKET_EMOJI: Record<Bucket, string> = {
  legendary: "🟠",
  rare: "🔵",
  uncommon: "🟢",
  common: "⚪️",
  classic: "🩵",
  new: "🟣",
};

export function weeklyMenuTweet(
  weekLabel: string,
  menu: WeekMenuItemStats[],
  siteUrl: string,
): string {
  const debuts = menu.filter((m) => m.isDebut);
  const comebacks = menu.filter((m) => !m.isDebut && m.isReturn);
  const rollovers = menu.length - debuts.length - comebacks.length;

  const rare = rankableMenu(menu)
    .slice()
    .sort((a, b) => a.rarity - b.rarity || b.weeksSinceLast! - a.weeksSinceLast!)[0];

  const longestComeback = comebacks
    .filter((m) => m.weeksSinceLast !== null)
    .slice()
    .sort((a, b) => (b.weeksSinceLast ?? 0) - (a.weeksSinceLast ?? 0))[0];

  const lines: string[] = [];
  lines.push(`🍪 Crumbl · Week of ${weekLabel}`);
  lines.push("");
  if (rare) {
    lines.push(
      `${BUCKET_EMOJI[rare.bucket]} Rarest: ${displayName(rare)} — ${formatPct(rare.rarity)} (${rare.appearanceCount}/${rare.eligibleWeeks} wks)`,
    );
  }
  if (longestComeback && (longestComeback.weeksSinceLast ?? 0) >= 4) {
    lines.push(
      `🔁 Biggest comeback: ${displayName(longestComeback)} — back after ${longestComeback.weeksSinceLast} wks`,
    );
  }
  lines.push(
    `✨ ${debuts.length} debut${plural(debuts.length)} · ${comebacks.length} comeback${plural(comebacks.length)} · ${rollovers} regular${plural(rollovers)}`,
  );
  lines.push("");
  lines.push(siteUrl);
  lines.push(WEEKLY_HASHTAGS);
  return clampTweet(lines.join("\n"));
}

function rankableMenu(menu: WeekMenuItemStats[]): WeekMenuItemStats[] {
  const eligible = menu.filter((m) => m.bucket !== "new" && m.bucket !== "classic");
  return eligible.length ? eligible : menu;
}

function plural(n: number): string {
  return n === 1 ? "" : "s";
}

function formatPct(rarity: number): string {
  return `${(rarity * 100).toFixed(1)}%`;
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
