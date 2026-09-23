/**
 * Which empty screen a pasted image goes to.
 *
 * The clipboard has exactly one image on it; a device can have two empty
 * screens (main and cover, on a foldable). Main wins when both are empty --
 * it is the screen everyone has, and the one the camera frames.
 */
export function pickPasteTarget(s: {
  screenSrc: string | null;
  coverSrc: string | null;
  hasCover: boolean;
}): "main" | "cover" | null {
  if (!s.screenSrc) return "main";
  if (s.hasCover && !s.coverSrc) return "cover";
  return null;
}

// ponytail: no test framework here, an assert-based self-check is the whole
// point -- run it with `npx tsx src/features/mockup-studio/mocraft/pasteTarget.ts`
// after adding `selfCheck();` below a temporary call, or paste the four
// asserts into a scratch file. No CJS/ESM runner guard here on purpose: this
// project has both `.mjs` scripts and Next's own bundler in play, and the
// only two things this needs are TypeScript and `assert`.
export function selfCheck() {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`pasteTarget: ${msg}`);
  };
  assert(
    pickPasteTarget({ screenSrc: null, coverSrc: null, hasCover: false }) === "main",
    "empty main, no cover -> main",
  );
  assert(
    pickPasteTarget({ screenSrc: null, coverSrc: null, hasCover: true }) === "main",
    "empty main, empty cover -> main first",
  );
  assert(
    pickPasteTarget({ screenSrc: "x", coverSrc: null, hasCover: true }) === "cover",
    "full main, empty cover -> cover",
  );
  assert(
    pickPasteTarget({ screenSrc: "x", coverSrc: "y", hasCover: true }) === null,
    "both full -> nothing to paste onto",
  );
  assert(
    pickPasteTarget({ screenSrc: "x", coverSrc: null, hasCover: false }) === null,
    "full main, no cover on this device -> nothing",
  );
}
