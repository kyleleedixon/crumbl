import { Agent, fetch as undiciFetch } from "undici";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36 CrumblRarityBot/0.1 (+https://github.com/)";

// crumblcookies.com sends very large response headers (Cloudflare + Set-Cookie stack)
// that exceed Node's default 16 KiB limit. Bump it via a dedicated undici Agent.
const bigHeaderAgent = new Agent({
  connect: { timeout: 15_000 },
  headersTimeout: 20_000,
  bodyTimeout: 30_000,
  maxHeaderSize: 128 * 1024,
});

export async function fetchHtml(url: string): Promise<string> {
  const res = await undiciFetch(url, {
    dispatcher: bigHeaderAgent,
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}
