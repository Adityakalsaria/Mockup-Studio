/**
 * A phone, by its user agent.
 *
 * Sniffed on the server so the studio is never rendered or downloaded on one.
 * ponytail: iPadOS reports a Mac UA and Android tablets omit "Mobile", so
 * tablets pass through; that is the intent.
 */
export const isMobileUA = (ua: string | null) =>
  !!ua && /Android.+Mobile|iPhone|iPod|Windows Phone|Mobile Safari/i.test(ua);
