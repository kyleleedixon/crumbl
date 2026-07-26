import { fetchHtml } from "./fetch";

const OG_IMAGE_REGEX = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
const OG_DESC_REGEX = /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i;
const META_DESC_REGEX = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i;

export type ProfileMeta = {
  imageUrl: string | null;
  description: string | null;
};

export async function fetchProfileMeta(profileSlug: string): Promise<ProfileMeta> {
  try {
    const html = await fetchHtml(
      `https://crumblcookies.com/profiles/${profileSlug}`,
    );
    const image = html.match(OG_IMAGE_REGEX)?.[1] ?? null;
    const description =
      html.match(OG_DESC_REGEX)?.[1] ?? html.match(META_DESC_REGEX)?.[1] ?? null;
    return { imageUrl: image, description };
  } catch {
    return { imageUrl: null, description: null };
  }
}
