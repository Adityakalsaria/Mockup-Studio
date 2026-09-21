import type { ShotSnapshot } from "./useStudio";

/**
 * The export someone asked for while signed out, kept across the sign-in.
 *
 * Email sign-in happens in a modal and leaves the page alone; Google leaves the
 * site and returns to a fresh studio, which opens on the defaults on purpose.
 * Either way the shot has to be waiting when they are back, or they are given
 * an export of a phone they never made.
 *
 * CacheStorage rather than sessionStorage: an uploaded screenshot rides along
 * as a data URL, and that is past sessionStorage's few megabytes. Nothing here
 * is fatal -- a browser that refuses simply gets the studio without the resume.
 */
const CACHE = "mocraft-pending-export";
const KEY = "/pending-export";
/** A sign-in takes minutes at most; an older stash is an abandoned one. */
const MAX_AGE_MS = 10 * 60 * 1000;

export interface PendingExport {
  kind: "image" | "video";
  shot: ShotSnapshot;
  /** The tab it was pressed on -- Motion's export is a clip, made from Motion. */
  tab: "crafting" | "motion";
  at: number;
}

export async function stashExport(
  kind: PendingExport["kind"],
  shot: ShotSnapshot,
  tab: PendingExport["tab"],
) {
  try {
    const cache = await caches.open(CACHE);
    const body: PendingExport = { kind, shot, tab, at: Date.now() };
    await cache.put(KEY, new Response(JSON.stringify(body)));
  } catch {}
}

/** The stash, if there is a fresh one -- and gone either way, so it runs once. */
export async function takeExport(): Promise<PendingExport | null> {
  try {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(KEY);
    if (!hit) return null;
    await cache.delete(KEY);
    const pending = (await hit.json()) as PendingExport;
    return Date.now() - pending.at < MAX_AGE_MS ? pending : null;
  } catch {
    return null;
  }
}
