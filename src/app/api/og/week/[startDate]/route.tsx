import { ImageResponse } from "next/og";
import { weekBySlugOrDate, weekInsights, bucketLabel } from "@/lib/rarity";
import type { Bucket } from "@/lib/rarity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 675;
const PADDING = 40;
const GAP = 14;

const BUCKET_COLOR: Record<Bucket, { bg: string; fg: string }> = {
  legendary: { bg: "#7c3aed", fg: "#f5f3ff" },
  rare: { bg: "#2563eb", fg: "#eff6ff" },
  uncommon: { bg: "#059669", fg: "#ecfdf5" },
  common: { bg: "#78716c", fg: "#fafaf9" },
  new: { bg: "#3b1a2b", fg: "#ffe6ef" },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ startDate: string }> },
) {
  const { startDate } = await params;
  const week = await weekBySlugOrDate(startDate);
  if (!week) return new Response("Week not found", { status: 404 });
  const menu = await weekInsights(week.id);
  const debuts = menu.filter((m) => m.isDebut);
  const returns = menu.filter((m) => !m.isDebut && m.isReturn);
  const rollovers = menu.length - debuts.length - returns.length;
  const rarest = menu
    .filter((m) => m.bucket !== "new")
    .slice()
    .sort((a, b) => a.rarity - b.rarity)[0];
  const biggestComeback = returns
    .filter((m) => m.weeksSinceLast !== null && m.weeksSinceLast >= 4)
    .slice()
    .sort((a, b) => (b.weeksSinceLast ?? 0) - (a.weeksSinceLast ?? 0))[0];

  const cols = menu.length <= 8 ? 4 : menu.length <= 12 ? 4 : 5;
  const rows = Math.ceil(Math.min(menu.length, cols * 3) / cols);
  const cardWidth = Math.floor((WIDTH - PADDING * 2 - GAP * (cols - 1)) / cols);
  const hasInsights = Boolean(rarest || biggestComeback);
  const gridReserved = hasInsights ? 200 : 138;
  const cardHeight = Math.floor(
    (HEIGHT - PADDING * 2 - gridReserved - GAP * (rows - 1)) / rows,
  );
  const imageHeight = cardHeight - 46;
  const visible = menu.slice(0, cols * 3);

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
            "linear-gradient(135deg, #ffe6ef 0%, #ffd4c2 45%, #fff2c2 100%)",
          fontFamily: "system-ui, -apple-system",
          color: "#3b1a2b",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", fontSize: 56 }}>🍪</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  opacity: 0.55,
                  fontWeight: 600,
                }}
              >
                Crumbl · Tracker Insights
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 46,
                  fontWeight: 800,
                  marginTop: 2,
                  letterSpacing: -1,
                }}
              >
                {week.label ?? startDate}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>
              @crumbltracker
            </div>
            <div style={{ display: "flex", fontSize: 16, opacity: 0.6 }}>
              crumbltracker.com
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
          }}
        >
          <Stat value={menu.length} label="flavors" />
          <Stat value={debuts.length} label="debuts" accent="#3b1a2b" text="#ffe6ef" />
          <Stat value={returns.length} label="comebacks" accent="#ffb347" />
          <Stat value={rollovers} label="regulars" />
        </div>

        {hasInsights && (
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            {rarest && (
              <Insight
                icon="🕵️"
                label="Rarest"
                title={displayName(rarest)}
                detail={`${(rarest.rarity * 100).toFixed(1)}% · ${rarest.appearanceCount}/${rarest.eligibleWeeks} wks · ${bucketLabel(rarest.bucket)}`}
                bucket={rarest.bucket}
              />
            )}
            {biggestComeback && (
              <Insight
                icon="🔁"
                label="Biggest comeback"
                title={displayName(biggestComeback)}
                detail={`Back after ${biggestComeback.weeksSinceLast} wks`}
                bucket={biggestComeback.bucket}
              />
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: GAP,
            marginTop: 16,
            flex: 1,
          }}
        >
          {visible.map((m) => (
            <div
              key={m.slug}
              style={{
                display: "flex",
                flexDirection: "column",
                width: cardWidth,
                height: cardHeight,
                background: "rgba(255,255,255,0.82)",
                borderRadius: 16,
                border: "1px solid rgba(59,26,43,0.08)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: cardWidth,
                  height: imageHeight,
                  background: "#fff1e6",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb(m.imageUrl, cardWidth, imageHeight)}
                    alt=""
                    width={cardWidth}
                    height={imageHeight}
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ display: "flex", fontSize: 48 }}>🍪</div>
                )}
                {(m.isDebut || m.isReturn) && (
                  <div
                    style={{
                      display: "flex",
                      position: "absolute",
                      top: 6,
                      left: 6,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: m.isDebut ? "#3b1a2b" : "#ffb347",
                      color: m.isDebut ? "#ffe6ef" : "#3b1a2b",
                    }}
                  >
                    {m.isDebut
                      ? "NEW"
                      : m.weeksSinceLast && m.weeksSinceLast >= 4
                        ? `${m.weeksSinceLast}W AGO`
                        : "RETURN"}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    position: "absolute",
                    top: 6,
                    right: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: BUCKET_COLOR[m.bucket].bg,
                    color: BUCKET_COLOR[m.bucket].fg,
                  }}
                >
                  {m.bucket === "new"
                    ? "NEW"
                    : `${bucketLabel(m.bucket).toUpperCase()} · ${(m.rarity * 100).toFixed(0)}%`}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "6px 10px",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.15,
                    overflow: "hidden",
                  }}
                >
                  {truncate(m.name, 38)}
                </div>
                {m.partnerBrand && (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 12,
                      opacity: 0.6,
                      marginTop: 1,
                    }}
                  >
                    {`ft. ${m.partnerBrand}`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}

function Stat({
  value,
  label,
  accent = "rgba(255,255,255,0.7)",
  text = "#3b1a2b",
}: {
  value: number;
  label: string;
  accent?: string;
  text?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 999,
        background: accent,
        color: text,
        border: "1px solid rgba(59,26,43,0.08)",
      }}
    >
      <div style={{ display: "flex", fontSize: 22, fontWeight: 800 }}>
        {value}
      </div>
      <div style={{ display: "flex", fontSize: 15, opacity: 0.75 }}>
        {label}
      </div>
    </div>
  );
}

function Insight({
  icon,
  label,
  title,
  detail,
  bucket,
}: {
  icon: string;
  label: string;
  title: string;
  detail: string;
  bucket: Bucket;
}) {
  const color = BUCKET_COLOR[bucket];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.85)",
        border: `2px solid ${color.bg}`,
        maxWidth: 560,
      }}
    >
      <div style={{ display: "flex", fontSize: 28 }}>{icon}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: color.bg,
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 800,
            lineHeight: 1.1,
            marginTop: 1,
          }}
        >
          {truncate(title, 34)}
        </div>
        <div style={{ display: "flex", fontSize: 13, opacity: 0.65, marginTop: 1 }}>
          {detail}
        </div>
      </div>
    </div>
  );
}

function displayName(m: { name: string; partnerBrand: string | null }): string {
  return m.partnerBrand ? `${m.name} ft. ${m.partnerBrand}` : m.name;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function thumb(url: string, w: number, h: number): string {
  const stripped = url.replace(/^https?:\/\//, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=${w * 2}&h=${h * 2}&fit=cover&output=jpg&q=80`;
}
