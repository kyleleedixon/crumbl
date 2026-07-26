import { recentWeeks } from "@/lib/rarity";
import { WeeksFilter } from "@/components/WeeksFilter";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export default async function WeeksArchivePage() {
  const weeks = await recentWeeks(200);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Weekly archive</h1>
      <WeeksFilter
        weeks={weeks.map((w) => ({ id: w.id, startDate: w.startDate, label: w.label }))}
      />
    </div>
  );
}
