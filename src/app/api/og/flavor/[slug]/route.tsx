import { ImageResponse } from "next/og";
import { flavorHistory } from "@/lib/rarity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 675;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const data = await flavorHistory(slug);
  if (!data) return new Response("Not found", { status: 404 });

  const { flavor, stats } = data;
  const rarityPct = (stats.rarity * 100).toFixed(1);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          padding: 56,
          background:
            "linear-gradient(160deg, #3b1a2b 0%, #6b2846 60%, #b34c72 100%)",
          color: "#fff2e6",
          fontFamily: "system-ui, -apple-system",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 380,
            height: 380,
            borderRadius: 32,
            overflow: "hidden",
            background: "rgba(255,255,255,0.08)",
            marginRight: 48,
            flexShrink: 0,
          }}
        >
          {flavor.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={flavor.imageUrl}
              alt=""
              width={380}
              height={380}
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 180,
                width: "100%",
                height: "100%",
              }}
            >
              🍪
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                letterSpacing: 2,
                textTransform: "uppercase",
                opacity: 0.7,
              }}
            >
              {`Crumbl Rarity · ${stats.bucketLabel}`}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 68,
                fontWeight: 800,
                lineHeight: 1.05,
                marginTop: 10,
              }}
            >
              {flavor.name}
            </div>
            {flavor.partnerBrand && (
              <div
                style={{ display: "flex", fontSize: 26, marginTop: 6, opacity: 0.85 }}
              >
                {`ft. ${flavor.partnerBrand}`}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <Stat label="Appearances" value={String(stats.totalAppearances)} />
            <Stat label="Rarity" value={`${rarityPct}%`} />
            <Stat label="Eligible" value={`${stats.eligibleWeeks}w`} />
            <Stat label="First" value={stats.firstSeen ?? "—"} />
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.08)",
        padding: "14px 20px",
        borderRadius: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 16,
          opacity: 0.7,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
