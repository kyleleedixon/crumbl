import { ImageResponse } from "next/og";
import {
  weekBySlugOrDate,
  weekInsights,
  bucketLabel,
  statsSummary,
  catalogBucketCounts,
} from "@/lib/rarity";
import type { Bucket, WeekMenuItemStats } from "@/lib/rarity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1350;
const PADDING = 56;

const INK = "#1c1917";
const INK_MUTED = "#57534e";
const INK_FAINT = "#a8a29e";
const RULE = "rgba(28, 25, 23, 0.09)";

// High-contrast palette — each bucket gets its own hue family so the
// distribution bar is instantly parseable.
const BUCKET_COLOR: Record<Bucket, { bg: string; fg: string; soft: string }> = {
  legendary: { bg: "#ea580c", fg: "#fff7ed", soft: "rgba(234, 88, 12, 0.10)" },  // orange
  rare: { bg: "#2563eb", fg: "#eff6ff", soft: "rgba(37, 99, 235, 0.10)" },       // blue
  uncommon: { bg: "#16a34a", fg: "#f0fdf4", soft: "rgba(22, 163, 74, 0.10)" },   // green
  common: { bg: "#6b7280", fg: "#f9fafb", soft: "rgba(107, 114, 128, 0.10)" },   // gray
  new: { bg: "#7c3aed", fg: "#f5f3ff", soft: "rgba(124, 58, 237, 0.10)" },       // violet
};

const BUCKET_ORDER: Bucket[] = ["legendary", "rare", "uncommon", "common", "new"];

const THUMB_SIZE = 56;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ startDate: string }> },
) {
  const { startDate } = await params;
  const week = await weekBySlugOrDate(startDate);
  if (!week) return new Response("Week not found", { status: 404 });
  const [menu, stats, catalog] = await Promise.all([
    weekInsights(week.id),
    statsSummary(),
    catalogBucketCounts(),
  ]);

  const bucketCounts = BUCKET_ORDER.map((b) => ({
    bucket: b,
    count: menu.filter((m) => m.bucket === b).length,
  }));

  // Rank rarest first, but push "new" items (too few weeks to rank) to the
  // bottom so the ranking above them is meaningful. Within new items, debuts
  // come before returns.
  const sorted = menu.slice().sort((a, b) => {
    const aNew = a.bucket === "new";
    const bNew = b.bucket === "new";
    if (aNew !== bNew) return aNew ? 1 : -1;
    if (aNew) {
      if (a.isDebut !== b.isDebut) return a.isDebut ? -1 : 1;
      return a.name.localeCompare(b.name);
    }
    return a.rarity - b.rarity;
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          padding: PADDING,
          background:
            "linear-gradient(160deg, #fff1f2 0%, #fff7ed 55%, #fefce8 100%)",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          color: INK,
        }}
      >
        <Header weekLabel={week.label ?? startDate} />
        <Divider marginTop={18} />
        <DistributionSection counts={bucketCounts} total={menu.length} />
        <Divider marginTop={16} />
        <MenuList items={sorted} />
        <div style={{ display: "flex", flex: 1, minHeight: 0 }} />
        <CatalogRarity counts={catalog} />
        <SiteStats stats={stats} />
        <Footer />
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}

function Header({ weekLabel }: { weekLabel: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 13,
            letterSpacing: 4.5,
            textTransform: "uppercase",
            color: INK_MUTED,
            fontWeight: 700,
          }}
        >
          Crumbl · Tracker Insights
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 54,
            fontWeight: 800,
            marginTop: 4,
            letterSpacing: -1.6,
            lineHeight: 1,
          }}
        >
          {weekLabel}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 1,
          marginTop: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: -0.3,
          }}
        >
          @crumbltracker
        </div>
        <div style={{ display: "flex", fontSize: 13, color: INK_MUTED }}>
          crumbltracker.com
        </div>
      </div>
    </div>
  );
}

function Divider({ marginTop = 0 }: { marginTop?: number }) {
  return (
    <div
      style={{
        display: "flex",
        height: 1,
        width: "100%",
        background: RULE,
        marginTop,
      }}
    />
  );
}

function DistributionSection({
  counts,
  total,
}: {
  counts: { bucket: Bucket; count: number }[];
  total: number;
}) {
  const barWidth = WIDTH - PADDING * 2;
  const active = counts.filter((c) => c.count > 0);
  const minSlice = 56;
  const slices = active.map((c) => ({
    ...c,
    width: Math.max(minSlice, Math.round((c.count / total) * barWidth)),
  }));
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 12,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: INK_MUTED,
            fontWeight: 700,
          }}
        >
          Rarity mix
        </div>
        <div style={{ display: "flex", fontSize: 14, color: INK_MUTED }}>
          {`${total} flavors on the menu`}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: barWidth,
          height: 16,
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(28, 25, 23, 0.06)",
        }}
      >
        {slices.map((c) => (
          <div
            key={c.bucket}
            style={{
              display: "flex",
              width: c.width,
              height: 16,
              background: BUCKET_COLOR[c.bucket].bg,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginTop: 12 }}>
        {counts.map((c) => (
          <LegendPill
            key={c.bucket}
            bucket={c.bucket}
            count={c.count}
            dim={c.count === 0}
          />
        ))}
      </div>
    </div>
  );
}

function CatalogRarity({ counts }: { counts: Record<Bucket, number> }) {
  const buckets: Bucket[] = ["legendary", "rare", "uncommon", "common"];
  const total = buckets.reduce((s, b) => s + counts[b], 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 12,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: INK_MUTED,
            fontWeight: 700,
          }}
        >
          Catalog rarity · all time
        </div>
        <div style={{ display: "flex", fontSize: 13, color: INK_MUTED }}>
          {`${total.toLocaleString()} ranked flavors`}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {buckets.map((b) => {
          const color = BUCKET_COLOR[b];
          const pct = total ? Math.round((counts[b] / total) * 100) : 0;
          return (
            <div
              key={b}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                background: color.soft,
                border: `1px solid ${color.bg}22`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: color.bg,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: 9,
                    letterSpacing: 2.2,
                    textTransform: "uppercase",
                    color: color.bg,
                    fontWeight: 800,
                  }}
                >
                  {bucketLabel(b)}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  fontWeight: 800,
                  color: INK,
                  letterSpacing: -0.8,
                  marginTop: 4,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {counts[b]}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 10,
                  color: INK_MUTED,
                  marginTop: 3,
                }}
              >
                {pct}% of catalog
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SiteStats({
  stats,
}: {
  stats: {
    totalWeeks: number;
    totalFlavors: number;
    oneHitFlavors: number;
    partnerCollabs: number;
  };
}) {
  const items = [
    { label: "Weeks tracked", value: stats.totalWeeks },
    { label: "Unique flavors", value: stats.totalFlavors },
    { label: "One-hit wonders", value: stats.oneHitFlavors },
    { label: "Partner collabs", value: stats.partnerCollabs },
  ];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 4px",
        borderTop: `1px solid ${RULE}`,
        borderBottom: `1px solid ${RULE}`,
        marginTop: 12,
        marginBottom: 8,
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 800,
              color: INK,
              letterSpacing: -0.6,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {it.value.toLocaleString()}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: INK_MUTED,
              marginTop: 6,
              fontWeight: 700,
            }}
          >
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function LegendPill({
  bucket,
  count,
  dim,
}: {
  bucket: Bucket;
  count: number;
  dim: boolean;
}) {
  const color = BUCKET_COLOR[bucket];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: dim ? 0.35 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 12,
          height: 12,
          borderRadius: 999,
          background: color.bg,
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 16,
          fontWeight: 700,
          color: INK,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
      </div>
      <div style={{ display: "flex", fontSize: 16, color: INK_MUTED }}>
        {bucketLabel(bucket)}
      </div>
    </div>
  );
}

function MenuList({ items }: { items: WeekMenuItemStats[] }) {
  const gap = items.length > 10 ? 2 : 6;
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 12,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: INK_MUTED,
            fontWeight: 700,
          }}
        >
          This week · rarest first
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap }}>
        {items.map((m, i) => (
          <MenuRow key={m.slug} rank={i + 1} item={m} />
        ))}
      </div>
    </div>
  );
}

function MenuRow({ rank, item }: { rank: number; item: WeekMenuItemStats }) {
  const color = BUCKET_COLOR[item.bucket];
  const isNew = item.bucket === "new";
  const secondary = isNew
    ? item.isDebut
      ? "First-ever appearance"
      : `Back after ${item.weeksSinceLast ?? "?"} wks`
    : item.partnerBrand
      ? `ft. ${item.partnerBrand} · ${item.appearanceCount}/${item.eligibleWeeks} wks`
      : `${item.appearanceCount}/${item.eligibleWeeks} wks · seen ${weeksAgoLabel(item.weeksSinceLast)}`;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "8px 4px 8px 10px",
        borderLeft: `3px solid ${color.bg}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          fontSize: 18,
          fontWeight: 600,
          color: INK_FAINT,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: -0.3,
        }}
      >
        {rank}
      </div>
      <Thumb url={item.imageUrl} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: -0.4,
            lineHeight: 1.15,
          }}
        >
          {truncate(item.name, 46)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 13,
            color: INK_MUTED,
            marginTop: 2,
            letterSpacing: 0.1,
          }}
        >
          {truncate(secondary, 52)}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
          minWidth: 96,
        }}
      >
        {isNew ? (
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              color: color.bg,
              letterSpacing: 1,
              lineHeight: 1,
            }}
          >
            {item.isDebut ? "Debut" : "Return"}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              color: color.bg,
              letterSpacing: -0.8,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {(item.rarity * 100).toFixed(1)}%
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: INK_FAINT,
            marginTop: 3,
          }}
        >
          {isNew ? "New" : bucketLabel(item.bucket)}
        </div>
      </div>
    </div>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: 12,
        background: "#ffffff",
        overflow: "hidden",
        border: `1px solid ${RULE}`,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb(url, THUMB_SIZE, THUMB_SIZE)}
          alt=""
          width={THUMB_SIZE}
          height={THUMB_SIZE}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <div style={{ display: "flex", fontSize: 22 }}>🍪</div>
      )}
    </div>
  );
}

function Footer() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Divider />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
          color: INK_FAINT,
          fontSize: 13,
          letterSpacing: 0.2,
        }}
      >
        <div style={{ display: "flex" }}>
          Rarity = appearances ÷ eligible weeks · lower = rarer
        </div>
        <div style={{ display: "flex" }}>
          &lt;3% Legendary · &lt;8% Rare · &lt;15% Uncommon
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function thumb(url: string, w: number, h: number): string {
  const stripped = url.replace(/^https?:\/\//, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=${w * 2}&h=${h * 2}&fit=cover&output=jpg&q=80`;
}

function weeksAgoLabel(weeksSinceLast: number | null): string {
  if (weeksSinceLast === null) return "first time";
  if (weeksSinceLast === 0) return "last week";
  if (weeksSinceLast === 1) return "1 wk ago";
  return `${weeksSinceLast} wks ago`;
}
