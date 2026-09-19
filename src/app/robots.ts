import type { MetadataRoute } from "next";

/**
 * Only the landing page is for search engines.
 *
 * `/$` matches the root and nothing under it; everything else is the studio
 * and its sign-in, which also carry `robots: { index: false }` per page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/$", disallow: "/" }],
  };
}
