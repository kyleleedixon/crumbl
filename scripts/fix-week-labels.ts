import "./load-env";
import { parseISO } from "date-fns";
import { db } from "@/db/client";
import { weeks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatWeekLabel, toISODate, weekEnd } from "@/lib/week";

async function main() {
  const rows = await db.select().from(weeks);
  let updated = 0;
  for (const row of rows) {
    const start = parseISO(row.startDate);
    const newEnd = toISODate(weekEnd(start));
    const newLabel = formatWeekLabel(start);
    if (row.endDate === newEnd && row.label === newLabel) continue;
    await db
      .update(weeks)
      .set({ endDate: newEnd, label: newLabel })
      .where(eq(weeks.id, row.id));
    console.log(`${row.startDate}: "${row.label}" → "${newLabel}" (end ${row.endDate} → ${newEnd})`);
    updated++;
  }
  console.log(`\nUpdated ${updated} of ${rows.length} weeks.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
