import Link from "next/link";
import {
  latestWeek,
  weekMenu,
  statsSummary,
  computeRarityLeaderboard,
  computeGreatestHits,
  computeRecentDebuts,
  bucketFor,
  bucketLabel,
  flavorTimelines,
} from "@/lib/rarity";
import { FlavorCard } from "@/components/FlavorCard";
import { timelineText } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function HomePage() {
  const week = await safe(latestWeek);
  const stats = await safe(statsSummary, {
    totalWeeks: 0,
    totalFlavors: 0,
    oneHitFlavors: 0,
    partnerCollabs: 0,
  });

  if (!week) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-white/80 p-6 text-center shadow-sm sm:p-10">
        <h1 className="text-3xl font-bold">No data yet 🍪</h1>
        <p className="mt-3 text-stone-600">
          Run <code>npm run backfill</code> or trigger the weekly cron to populate history.
        </p>
      </div>
    );
  }

  const menu = await safe(() => weekMenu(week.id), []);
  const rare = await safe(() => computeRarityLeaderboard(6), []);
  const hits = await safe(() => computeGreatestHits(6), []);
  const newest = await safe(() => computeRecentDebuts(6), []);
  const timelines = await safe(
    () => flavorTimelines(menu.map((m) => m.slug)),
    new Map<string, { firstSeen: string; lastSeen: string; appearanceCount: number }>(),
  );

  const debuts = menu.filter((m) => m.isDebut);
  const comebacks = menu.filter((m) => !m.isDebut && m.isReturn);
  const rollovers = menu.length - debuts.length - comebacks.length;

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard label="Weeks tracked" value={stats.totalWeeks} />
        <StatCard label="Unique flavors" value={stats.totalFlavors} />
        <StatCard label="One-hit wonders" value={stats.oneHitFlavors} />
        <StatCard label="Partner collabs" value={stats.partnerCollabs} />
      </section>

      <section className="rounded-3xl border border-rose-200/60 bg-white/70 p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 sm:gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-rose-700">
              This Week
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {week.label ?? week.startDate}
            </h1>
          </div>
          <div className="text-sm text-stone-600">
            {menu.length} flavors · {debuts.length} debut{debuts.length === 1 ? "" : "s"} ·{" "}
            {comebacks.length} comeback{comebacks.length === 1 ? "" : "s"} ·{" "}
            {rollovers} returning
          </div>
        </div>

        <ul className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {menu.map((m) => {
            const t = timelines.get(m.slug);
            return (
              <li key={m.slug}>
                <FlavorCard
                  slug={m.slug}
                  name={m.name}
                  partnerBrand={m.partnerBrand}
                  imageUrl={m.imageUrl}
                  isDebut={m.isDebut}
                  isReturn={m.isReturn}
                  isFeatured={m.isFeatured}
                  meta={
                    t
                      ? `${timelineText(t.firstSeen, t.lastSeen)} · ${t.appearanceCount}×`
                      : null
                  }
                />
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <LeaderCard
          title="Rarest flavors"
          subtitle="Fewest appearances per eligible week"
          rows={rare}
          href="/rarity"
        />
        <LeaderCard
          title="Fan favorites"
          subtitle="Most appearances all-time"
          rows={hits}
          href="/rarity#hits"
        />
      </div>

      {newest.length > 0 && (
        <section className="rounded-3xl border border-rose-200/60 bg-white/70 p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Fresh debuts</h2>
            <span className="text-xs text-stone-500">
              Debuted in the last 8 weeks — too new to rank
            </span>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {newest.map((n) => (
              <li key={n.slug}>
                <FlavorCard
                  slug={n.slug}
                  name={n.name}
                  partnerBrand={n.partnerBrand}
                  imageUrl={n.imageUrl}
                  meta={`Debuted ${n.firstSeen} · ${n.appearanceCount}×`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-rose-100 bg-white/60 p-5 text-sm text-stone-700 sm:p-6">
        <h2 className="text-base font-semibold">How rarity works</h2>
        <p className="mt-2 leading-relaxed">
          Rarity = <em>appearances ÷ eligible weeks</em>, where eligible weeks
          counts every week from a flavor&apos;s debut through the latest tracked
          menu. Lower score = rarer. Flavors need 8 eligible weeks before they
          qualify — otherwise a brand-new debut would automatically be
          &ldquo;legendary.&rdquo; Buckets: &lt;8% Legendary, &lt;20% Rare,
          &lt;40% Uncommon, else Common.
        </p>
        <p className="mt-2 leading-relaxed text-stone-600">
          <strong>Debuts</strong>
          {" are first-ever appearances. "}
          <strong>Comebacks</strong>
          {" are flavors Crumbl tagged \u201CNEW\u201D this week even though they\u2019ve been on the menu before. "}
          <strong>Returning</strong>
          {" is everything else — flavors that were on prior menus but Crumbl didn\u2019t flag as new. Together the three add up to the week\u2019s total."}
        </p>
      </section>
    </div>
  );
}

function LeaderCard({
  title,
  subtitle,
  rows,
  href,
}: {
  title: string;
  subtitle: string;
  rows: Awaited<ReturnType<typeof computeRarityLeaderboard>>;
  href: string;
}) {
  return (
    <section className="rounded-3xl border border-rose-200/60 bg-white/70 p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="truncate text-sm text-stone-500">{subtitle}</p>
        </div>
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-rose-700 hover:underline"
        >
          See more →
        </Link>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((r) => {
          const bucket = bucketFor(r);
          return (
            <li key={r.slug}>
              <FlavorCard
                slug={r.slug}
                name={r.name}
                partnerBrand={r.partnerBrand}
                imageUrl={r.imageUrl}
                meta={
                  <>
                    {bucketLabel(bucket)} · {(r.rarity * 100).toFixed(1)}% ·{" "}
                    {r.appearanceCount}/{r.eligibleWeeks} wks
                    <span className="ml-1 text-stone-400">
                      · {timelineText(r.firstSeen, r.lastSeen)}
                    </span>
                  </>
                }
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white/70 p-4 shadow-sm sm:p-5">
      <div className="text-[10px] uppercase tracking-widest text-stone-500 sm:text-xs">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null>;
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T>;
async function safe<T>(fn: () => Promise<T>, fallback?: T) {
  try {
    return await fn();
  } catch (e) {
    console.error("[page] db error:", e);
    return fallback ?? null;
  }
}
