import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "crumbl.video" },
      { protocol: "https", hostname: "crumblcookies.com" },
      { protocol: "https", hostname: "cdn.crumblcookies.com" },
      { protocol: "https", hostname: "images.crumblcookies.com" },
    ],
  },
};

export default nextConfig;
