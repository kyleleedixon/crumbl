import Link from "next/link";
import { notFound } from "next/navigation";
import { weekBySlugOrDate, weekMenu, flavorTimelines } from "@/lib/rarity";
import { siteUrl } from "@/lib/env";
import { FlavorCard } from "@/components/FlavorCard";
import { timelineText } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ startDate: string }>;
}) {
  const { startDate } = await params;
  const week = await weekBySlugOrDate(startDate);
  if (!week) return { title: "Week not found" };
  const og = `${siteUrl()}/api/og/week/${startDate}`;
  return {
    title: `Crumbl · Week of ${week.label ?? startDate}`,
    openGraph: { images: [og] },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function WeekPage({
  params,
}: {
  params: Promise<{ startDate: string }>;
}) {
  const { startDate } = await params;
  const week = await weekBySlugOrDate(startDate);
  if (!week) notFound();
  const menu = await weekMenu(week.id);
  const timelines = await flavorTimelines(menu.map((m) => m.slug));
  const debuts = menu.filter((m) => m.isDebut);
  const comebacks = menu.filter((m) => !m.isDebut && m.isReturn);
  const rollovers = menu.length - debuts.length - comebacks.length;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <Link href="/weeks" className="text-sm text-rose-700 hover:underline">
          ← all weeks
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Week of {week.label ?? startDate}
        </h1>
        <p className="mt-1 text-stone-600">
          {menu.length} flavors · {debuts.length} debut{debuts.length === 1 ? "" : "s"} ·{" "}
          {comebacks.length} comeback{comebacks.length === 1 ? "" : "s"} ·{" "}
          {rollovers} returning
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
