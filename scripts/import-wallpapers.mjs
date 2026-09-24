/**
 * Turns a folder of wallpapers into Canvas background categories.
 *
 *   node scripts/import-wallpapers.mjs ~/Downloads/wallpapers
 *
 * One subfolder per category, named as it should read in the panel. A
 * leading number sets the order and is dropped from the label:
 *
 *   wallpapers/
 *     1 iOS 27/        -> "iOS 27", first
 *     2 iOS 26/        -> "iOS 26"
 *     3 macOS/
 *     4 iPadOS/
 *
 * Each picture is written as WebP, no larger than SIZE on its long side, with
 * a square thumbnail for the chip -- a macOS wallpaper straight off the source
 * is a 6K file, and twelve of them in a grid would be a download nobody waited
 * for. Files are named after their position rather than their original name,
 * so a re-import with the same pictures in the same order rewrites the same
 * paths.
 *
 * The folder is the whole truth: the output directory and the manifest are
 * rebuilt from it every run, so a category deleted from the folder leaves the
 * panel too. The manifest is `src/data/canvas-wallpapers.json`, which
 * `backgrounds.ts` appends after the generated gradients.
 */
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SIZE = 2400;
const THUMB = 160;
const PUBLIC = path.join(process.cwd(), "public");
const OUT_URL = "/figma-assets/mockup-studio/wallpapers";
const OUT = path.join(PUBLIC, OUT_URL);
const MANIFEST = path.join(process.cwd(), "src/data/canvas-wallpapers.json");
const PICTURE = /\.(jpe?g|png|webp|avif|tiff?)$/i;

const source = process.argv[2];
if (!source) {
  console.error("usage: node scripts/import-wallpapers.mjs <folder>");
  process.exit(1);
}

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const unnumbered = (name) => name.replace(/^\d+[\s._-]+/, "");
const byName = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

await rm(OUT, { recursive: true, force: true });

const folders = (await readdir(source, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort(byName);

const manifest = [];
for (const folder of folders) {
  const label = unnumbered(folder);
  const id = slug(label);
  const files = (await readdir(path.join(source, folder)))
    .filter((name) => PICTURE.test(name))
    .sort(byName);
  if (!files.length) continue;

  await mkdir(path.join(OUT, id, "thumbs"), { recursive: true });
  const items = [];
  for (const [index, file] of files.entries()) {
    const name = `${String(index + 1).padStart(2, "0")}.webp`;
    // `rotate()` with no angle applies the EXIF orientation, so a portrait
    // phone wallpaper saved sideways by its camera app stands up.
    const picture = sharp(path.join(source, folder, file)).rotate();
    await picture
      .clone()
      .resize(SIZE, SIZE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88, smartSubsample: true })
      .toFile(path.join(OUT, id, name));
    await picture
      .clone()
      .resize(THUMB, THUMB, { fit: "cover" })
      .webp({ quality: 82 })
      .toFile(path.join(OUT, id, "thumbs", name));
    items.push({
      id: `${id}-${index + 1}`,
      label: `${label} ${index + 1}`,
      src: `${OUT_URL}/${id}/${name}`,
      thumb: `${OUT_URL}/${id}/thumbs/${name}`,
    });
  }
  manifest.push({ id, label, items });
  console.log(`${label}: ${items.length}`);
}

await mkdir(path.dirname(MANIFEST), { recursive: true });
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`-> ${path.relative(process.cwd(), MANIFEST)}`);
