import { ImageResponse } from "next/og";
import { weekBySlugOrDate, weekMenu } from "@/lib/rarity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 675;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ startDate: string }> },
) {
  const { startDate } = await params;
  const week = await weekBySlugOrDate(startDate);
  if (!week) return new Response("Week not found", { status: 404 });
  const menu = await weekMenu(week.id);
  const debuts = menu.filter((m) => m.isDebut);
  const returns = menu.filter((m) => !m.isDebut && m.isReturn);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          padding: 48,
          background:
            "linear-gradient(135deg, #ffe6ef 0%, #ffd4c2 45%, #fff2c2 100%)",
          fontFamily: "system-ui, -apple-system",
          color: "#3b1a2b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 52, display: "flex" }}>🍪</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                letterSpacing: 2,
                textTransform: "uppercase",
                opacity: 0.6,
              }}
            >
              Crumbl · Weekly Menu
            </div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, marginTop: 4 }}>
              {week.label ?? startDate}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            marginTop: 26,
            flex: 1,
          }}
        >
          {menu.slice(0, 8).map((m) => (
            <div
              key={m.slug}
              style={{
                display: "flex",
                width: "calc(50% - 7px)",
                background: "rgba(255,255,255,0.7)",
                borderRadius: 18,
                border: "1px solid rgba(59,26,43,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 88,
                  height: 88,
                  background: "#fff1e6",
                  flexShrink: 0,
                }}
              >
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt=""
                    width={88}
                    height={88}
                    style={{ objectFit: "cover" }}
                  />
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "8px 14px",
                  flex: 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {m.isDebut && (
                    <div
                      style={{
                        display: "flex",
                        fontSize: 14,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#3b1a2b",
                        color: "#ffe6ef",
                      }}
                    >
                      NEW
                    </div>
                  )}
                  {!m.isDebut && m.isReturn && (
                    <div
                      style={{
                        display: "flex",
                        fontSize: 14,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#ffb347",
                        color: "#3b1a2b",
                      }}
                    >
                      RETURN
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                  {m.name}
                </div>
                {m.partnerBrand && (
                  <div style={{ display: "flex", fontSize: 16, opacity: 0.65 }}>
                    {`ft. ${m.partnerBrand}`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            marginTop: 20,
            opacity: 0.7,
          }}
        >
          <div style={{ display: "flex" }}>
            {`${debuts.length} debuts · ${returns.length} comebacks · ${menu.length} total`}
          </div>
          <div style={{ display: "flex", fontWeight: 700 }}>@crumbltracker</div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}
