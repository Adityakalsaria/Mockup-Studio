import { redirect } from "next/navigation";

/**
 * Where Mocraft used to live, kept as a redirect to where it lives now.
 *
 * mocraft.app shipped with Mocraft at this address, so there are bookmarks and
 * shared links that say it. Mocraft is now the root of the site -- see
 * `src/app/page.tsx` -- and this sends them there rather than to a 404.
 */
export default function MocraftUIRedirect() {
  redirect("/");
}
