import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { flavorHistory } from "@/lib/rarity";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await flavorHistory(slug);
  if (!data) return { title: "Flavor not found" };
  const og = `${siteUrl()}/api/og/flavor/${slug}`;
  return {
    title: `${data.flavor.name} · Crumbl Tracker`,
    description: `${data.flavor.name} has appeared in ${data.stats.totalAppearances} tracked Crumbl weeks.`,
    openGraph: { images: [og] },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function FlavorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await flavorHistory(slug);
  if (!data) notFound();

  const { flavor, appearances, stats } = data;
  const rarityPct = (stats.rarity * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/" className="text-sm text-rose-700 hover:underline">
        ← back
      </Link>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
        {flavor.imageUrl ? (
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-rose-100 bg-rose-50">
            <Image
              src={flavor.imageUrl}
              alt={flavor.name}
              fill
              sizes="220px"
              className="object-cover"
              unoptimized
              priority
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-3xl border border-rose-100 bg-rose-50 text-6xl">
            🍪
          </div>
        )}

        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-800">
            {stats.bucketLabel} · {rarityPct}%
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{flavor.name}</h1>
          {flavor.partnerBrand && (
            <p className="mt-1 text-stone-500">ft. {flavor.partnerBrand}</p>
          )}
          {flavor.description && (
            <p className="mt-4 max-w-2xl text-stone-700">{flavor.description}</p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Appearances" value={String(stats.totalAppearances)} />
            <Stat label="Eligible weeks" value={String(stats.eligibleWeeks)} />
            <Stat label="First seen" value={stats.firstSeen ?? "—"} />
            <Stat label="Longest gap" value={`${stats.longestGapWeeks} wk`} />
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-rose-200/60 bg-white/70 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <ul className="mt-3 flex flex-col divide-y divide-rose-100">
          {appearances.map((a) => (
            <li key={a.weekId} className="flex items-center justify-between py-2 text-sm">
              <Link href={`/week/${a.startDate}`} className="hover:text-rose-700">
                {a.label ?? a.startDate}
              </Link>
              <div className="flex gap-2 text-xs">
                {a.isDebut && (
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-white">DEBUT</span>
                )}
                {a.isReturn && (
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-amber-900">
                    RETURN
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white/70 p-4 shadow-sm">
      <div className="text-xs uppercase tracking-widest text-stone-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
