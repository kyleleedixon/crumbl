"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Week = { id: number; startDate: string; label: string | null };

export function WeeksFilter({ weeks }: { weeks: Week[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return weeks;
    return weeks.filter(
      (w) =>
        w.startDate.toLowerCase().includes(needle) ||
        (w.label ?? "").toLowerCase().includes(needle),
    );
  }, [q, weeks]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter weeks by date or label…"
        aria-label="Filter weeks"
        className="w-full max-w-md rounded-full border border-rose-200 bg-white/90 px-4 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
      />
      <div className="text-xs text-stone-500">
        {filtered.length === weeks.length
          ? `${weeks.length} weeks`
          : `${filtered.length} of ${weeks.length} weeks`}
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {filtered.map((w) => (
          <li key={w.id}>
            <Link
              href={`/week/${w.startDate}`}
              className="flex items-center justify-between rounded-xl border border-rose-100 bg-white/70 px-4 py-3 hover:border-rose-300"
            >
              <span className="font-medium">{w.label ?? w.startDate}</span>
              <span className="text-xs text-stone-500">{w.startDate}</span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="col-span-full rounded-xl border border-dashed border-rose-200 bg-white/60 px-4 py-6 text-center text-sm text-stone-500">
            No weeks match &ldquo;{q}&rdquo;.
          </li>
        )}
      </ul>
    </div>
  );
}
