/**
 * Signed links for the device models.
 *
 * The .glb files are the one asset in this project worth taking: 100MB of
 * device geometry sitting on a CDN. They used to sit there at guessable public
 * URLs, excluded from the middleware for speed, which meant the whole set came
 * down with one curl and no account. A signed link closes that: the file is
 * served only to a request carrying a token this secret signed, and the token
 * expires on its own.
 *
 * WHAT THIS DOES NOT DO. The browser has to receive the model to draw it, so
 * anyone signed in can still save one out of the network tab. This is not a
 * lock, it is the difference between a script that takes everything and a
 * person taking one file at a time by hand.
 *
 * Web Crypto rather than node:crypto, because the same two functions run in
 * three places: the middleware (edge runtime, no node builtins), a route
 * handler, and a server component.
 */

/**
 * The expiry lands on a UTC day boundary rather than "now plus a day".
 *
 * A token is part of the URL, and a new URL is a new download: minted per
 * visit, every session would pull 5-16MB again and the CDN would never hold a
 * copy worth having. Rounded to the day, every session that day asks for the
 * same URL and the browser answers most of them itself.
 */
const DAY_SECONDS = 86_400;

function secret(): string {
  const value = process.env.MODEL_TOKEN_SECRET;
  if (!value) {
    throw new Error(
      "MODEL_TOKEN_SECRET is not set. Model links cannot be signed.",
    );
  }
  return value;
}

/** Hex, because it survives a query string without escaping. */
function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const imported = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", imported, encoder.encode(message)));
}

/**
 * A token good until the end of the current UTC day.
 *
 * `extraDays` is for the refresh route: a session opened at 23:58 would
 * otherwise be handed a token with two minutes left on it.
 */
export async function signModelToken(extraDays = 0): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const exp = (Math.floor(now / DAY_SECONDS) + 1 + extraDays) * DAY_SECONDS;
  try {
    return `${exp}.${await sign(String(exp), secret())}`;
  } catch {
    /*
     * No secret configured: hand back nothing rather than failing the page.
     * The studio still works -- the middleware falls back to the signed-in
     * session, which every visitor to the studio has -- and an anonymous
     * request is still refused, because an unsigned token verifies as false.
     * A deploy that forgets the secret loses the signed links, not the site.
     */
    return null;
  }
}

/** Whether a token was signed by this secret and has not expired. */
export async function verifyModelToken(
  token: string | null | undefined,
): Promise<boolean> {
  if (!token) return false;
  const [exp, signature] = token.split(".");
  if (!exp || !signature) return false;

  const expiry = Number(exp);
  if (!Number.isFinite(expiry) || expiry <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  let expected: string;
  try {
    expected = await sign(exp, secret());
  } catch {
    // No secret configured: refuse rather than serve. A missing secret in
    // production must not quietly reopen the door.
    return false;
  }

  /*
   * Length-safe compare, in constant time.
   *
   * A `===` on a hex string leaks where it stopped matching, which is enough
   * to forge a signature one byte at a time given enough attempts.
   */
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

/** The query key the middleware reads, stated once. */
export const MODEL_TOKEN_PARAM = "t";

/** The one path the gate covers. */
export const MODEL_PATH_PREFIX = "/figma-assets/mockup-studio/models/";

/** `path` with the token on it, for a `useGLTF` call. */
export function withModelToken(path: string, token: string | null): string {
  return token ? `${path}?${MODEL_TOKEN_PARAM}=${token}` : path;
}
