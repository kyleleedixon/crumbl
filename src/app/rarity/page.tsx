import {
  MIN_ELIGIBLE_WEEKS,
  bucketFor,
  bucketLabel,
  computeGreatestHits,
  computeRarityLeaderboard,
  computeRecentDebuts,
  statsSummary,
} from "@/lib/rarity";
import { FlavorCard } from "@/components/FlavorCard";
import { timelineText } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export default async function RarityPage() {
  const [rare, hits, newest, stats] = await Promise.all([
    computeRarityLeaderboard(30),
    computeGreatestHits(30),
    computeRecentDebuts(20),
    statsSummary(),
  ]);

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Rarity leaderboard</h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          Rarity is <em>appearances ÷ eligible weeks</em>, where eligible weeks
          runs from a flavor&apos;s first-ever appearance through the latest
          tracked menu. A flavor that showed up 3 times across 40 eligible weeks
          scores 7.5% — <strong>lower is rarer</strong>.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">
          Flavors must have ≥ {MIN_ELIGIBLE_WEEKS} eligible weeks before they
          rank, otherwise a brand-new debut would automatically be
          &ldquo;legendary.&rdquo; Bucket cutoffs:{" "}
          <span className="font-medium">&lt;8%</span> Legendary,{" "}
          <span className="font-medium">&lt;20%</span> Rare,{" "}
          <span className="font-medium">&lt;40%</span> Uncommon, else Common.
        </p>
        <p className="mt-2 text-xs text-stone-500">
          {stats.totalWeeks} weeks tracked · {stats.totalFlavors} unique flavors ·{" "}
          {stats.oneHitFlavors} one-hit wonders
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Section title="Rarest flavors" subtitle="Fewest appearances per eligible week" rows={rare} />
        <Section title="Fan favorites" subtitle="Most appearances all-time" rows={hits} id="hits" />
      </div>

      {newest.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Fresh debuts</h2>
          <p className="text-sm text-stone-500">
            Debuted in the last {MIN_ELIGIBLE_WEEKS} weeks — excluded from rarity rankings until they age.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {newest.map((n) => (
              <li key={n.slug}>
                <FlavorCard
                  slug={n.slug}
                  name={n.name}
                  partnerBrand={n.partnerBrand}
                  imageUrl={n.imageUrl}
                  meta={`Debuted ${n.firstSeen} · ${n.appearanceCount}× so far`}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  rows,
  id,
}: {
  title: string;
  subtitle: string;
  rows: Awaited<ReturnType<typeof computeRarityLeaderboard>>;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-3xl border border-rose-200/60 bg-white/70 p-5 shadow-sm sm:p-6"
    >
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-stone-500">{subtitle}</p>
      </div>
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const bucket = bucketFor(r);
          return (
            <li key={r.slug} className="flex items-center gap-2 sm:gap-3">
              <span className="w-5 shrink-0 text-right text-sm tabular-nums text-stone-400 sm:w-6">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
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
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
