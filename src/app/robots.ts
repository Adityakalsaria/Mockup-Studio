import type { MetadataRoute } from "next";

/**
 * Nothing here is for search engines.
 *
 * This used to allow everything and point at a sitemap listing seven
 * marketing pages, because it was written for a marketing site. What is left
 * is a tool behind a sign-in: the studio route already carries
 * `robots: { index: false }` in its own metadata, and this says the same thing
 * at the origin so a crawler need not fetch a page to be told.
 *
 * The sitemap is gone rather than emptied. A sitemap that lists one
 * un-indexable route is a file that exists to be misleading.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
