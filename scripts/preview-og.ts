import "./load-env";
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  latestWeek,
  weekBySlugOrDate,
  weekInsights,
} from "@/lib/rarity";
import { weeklyMenuTweet } from "@/lib/tweet-copy";

const PORT = 3123;
const BASE = `http://127.0.0.1:${PORT}`;

async function waitForServer(url: string, timeoutMs = 90_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not come up in ${timeoutMs}ms`);
}

async function main() {
  const arg = process.argv[2];
  const week = arg ? await weekBySlugOrDate(arg) : await latestWeek();
  if (!week) throw new Error(`No week found for ${arg ?? "latest"}`);

  const startDate = week.startDate;
  const outPng = `${process.env.HOME}/Desktop/og-week-${startDate}.png`;

  console.log(`→ starting dev server on port ${PORT} …`);
  const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, NODE_ENV: "development" },
  });
  const stop = () => {
    try {
      server.kill("SIGINT");
    } catch {}
  };
  process.on("SIGINT", () => {
    stop();
    process.exit(130);
  });

  try {
    await waitForServer(`${BASE}/api/og/week/${startDate}`);
    console.log(`→ fetching ${BASE}/api/og/week/${startDate}`);
    const res = await fetch(`${BASE}/api/og/week/${startDate}`);
    if (!res.ok) throw new Error(`OG endpoint ${res.status} ${res.statusText}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPng, buf);
    console.log(`✔ wrote ${outPng} (${buf.length} bytes)`);

    const menu = await weekInsights(week.id);
    const text = weeklyMenuTweet(
      week.label ?? startDate,
      menu,
      `https://crumbltracker.com/week/${startDate}`,
    );
    console.log("\n--- tweet preview ---");
    console.log(text);
    console.log(`--- ${text.length} / 280 ---`);

    execSync(`open ${outPng}`);
  } finally {
    stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
