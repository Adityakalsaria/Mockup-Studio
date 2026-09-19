import type { MetadataRoute } from "next";

/**
 * Only the landing page is for search engines.
 *
 * `/$` matches the root and nothing under it; everything else is the studio
 * and its sign-in, which also carry `robots: { index: false }` per page.
 *
 * Link-preview bots are let in everywhere they need to go. They honour this
 * file, and shut out they fetch neither the page nor its Open Graph image,
 * so a shared link shows no card.
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
      { userAgent: "*", allow: "/$", disallow: "/" },
    ],
  };
}
