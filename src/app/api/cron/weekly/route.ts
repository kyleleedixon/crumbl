import { NextResponse } from "next/server";
import { scrapeCrumblOfficial } from "@/lib/scrape/crumbl-official";
import { ingestScrapedWeek } from "@/lib/ingest";
import { weekMenu } from "@/lib/rarity";
import { weeklyMenuTweet } from "@/lib/tweet-copy";
import { postTweet } from "@/lib/twitter";
import { siteUrl, isAuthorizedCron } from "@/lib/env";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scraped = await scrapeCrumblOfficial();
  const ingested = await ingestScrapedWeek(scraped);
  const menu = await weekMenu(ingested.weekId);

  const dryRun =
    request.headers.get("x-dry-run") === "1" ||
    process.env.TWITTER_DRY_RUN === "1";

  const ogUrl = `${siteUrl()}/api/og/week/${scraped.startDate}`;
  const text = weeklyMenuTweet(scraped.label, menu, `${siteUrl()}/week/${scraped.startDate}`);

  let mediaBuffer: Buffer | undefined;
  let mediaMime: string | undefined;
  try {
    const img = await fetch(ogUrl, { cache: "no-store" });
    if (img.ok) {
      const arr = await img.arrayBuffer();
      mediaBuffer = Buffer.from(arr);
      mediaMime = img.headers.get("content-type") ?? "image/png";
    }
  } catch {
    // graphics best-effort
  }

  const tweetResult = await postTweet({
    text,
    mediaBuffer,
    mediaMimeType: mediaMime,
    dryRun,
  });

  return NextResponse.json({
    ok: true,
    scraped: {
      week: scraped.label,
      startDate: scraped.startDate,
      flavors: scraped.flavors.length,
    },
    ingested,
    tweet: tweetResult,
  });
}
