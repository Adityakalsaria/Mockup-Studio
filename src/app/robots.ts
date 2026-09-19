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
 *
 * Link-preview bots are let in. They honour this file, and shut out they fetch
 * neither the page nor its Open Graph image, so a shared link shows no card.
 * What they can reach is the sign-in redirect and the image: nothing else here
 * is public. Search engines stay out.
 */
const PREVIEW_BOTS = [
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "Slackbot",
  "Discordbot",
  "WhatsApp",
  "TelegramBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: PREVIEW_BOTS, allow: "/" },
      { userAgent: "*", disallow: "/" },
    ],
  };
}
