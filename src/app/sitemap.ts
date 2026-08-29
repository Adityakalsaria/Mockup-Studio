import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/metadata";

const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/business", priority: 0.8, changeFrequency: "monthly" },
  { path: "/usd-account", priority: 0.8, changeFrequency: "monthly" },
  { path: "/global-card", priority: 0.8, changeFrequency: "monthly" },
  { path: "/payments", priority: 0.8, changeFrequency: "monthly" },
  { path: "/rewards", priority: 0.7, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
