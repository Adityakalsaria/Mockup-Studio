import { redirect } from "next/navigation";

/**
 * The old editor lived here and is gone. Bookmarks and shared links that say
 * `/mockup-studio` land in Mocraft instead of a 404.
 *
 * Only this page went: the phone's routes beside it -- `join`, `remote`,
 * `gyro-test` -- are what the pairing QR and the iOS app open, and stay.
 */
export default function OldEditorRedirect() {
  redirect("/studio");
}
