import { redirect } from "next/navigation";

/**
 * The studio is the site.
 *
 * This repo began as a copy of the Koshmoney marketing site with the studio
 * added as one route inside it, which meant deploying it served that site --
 * its homepage, its product pages, its Play Store links -- from whatever
 * domain this was put on. Those routes are gone; what is left is the studio,
 * the auth pages it needs, and the two APIs the phone talks to.
 *
 * A redirect rather than moving the editor up to `/`: the route is linked from
 * the pairing QR, the deep link and the iOS app, all of which say
 * `/mockup-studio` and some of which are compiled into a build on someone's
 * phone. Those keep working, and the bare domain lands somewhere useful.
 */
export default function RootPage() {
  redirect("/mockup-studio");
}
