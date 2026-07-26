"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Result = {
  slug: string;
  name: string;
  partnerBrand: string | null;
  imageUrl: string | null;
  appearanceCount: number;
  lastSeen: string | null;
};

export function FlavorSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search/flavors?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d) => {
          setResults(d.results ?? []);
          setHighlight(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[highlight]) {
      e.preventDefault();
      window.location.href = `/flavors/${results[highlight].slug}`;
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full sm:max-w-md">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search flavors…"
        aria-label="Search flavors"
        className="w-full rounded-full border border-rose-200 bg-white/90 px-4 py-1.5 text-sm outline-none placeholder:text-stone-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-lg">
          {loading && (
            <div className="p-3 text-sm text-stone-500">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-3 text-sm text-stone-500">No matches.</div>
          )}
          {results.length > 0 && (
            <ul className="max-h-[60vh] overflow-y-auto p-1">
              {results.map((r, i) => (
                <li key={r.slug}>
                  <Link
                    href={`/flavors/${r.slug}`}
                    onClick={() => {
                      setOpen(false);
                      setQ("");
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex items-center gap-3 rounded-xl p-2 ${
                      i === highlight ? "bg-rose-50" : ""
                    }`}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-rose-50">
                      {r.imageUrl ? (
                        <Image
                          src={r.imageUrl}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">
                          🍪
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.name}</div>
                      <div className="truncate text-xs text-stone-500">
                        {r.partnerBrand ? `ft. ${r.partnerBrand} · ` : ""}
                        {r.appearanceCount}×
                        {r.lastSeen ? ` · last ${r.lastSeen}` : ""}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
