#!/usr/bin/env node
/**
 * Pack a directory-form glTF into a single .glb this studio can load.
 *
 * The second converter in this folder, and it exists because the second SOURCE
 * exists. `usdz-to-glb.mjs` takes Apple's design-resource USDZ archives, which
 * are a modelling format: one file, binary USD inside, materials named by the
 * shading network. This takes a glTF already prepared for the web -- a .gltf
 * next to a .bin next to loose image files -- which is a delivery format, and
 * arrives with its animation clips already baked. There is nothing to compose
 * and no USD to flatten; the work is entirely packaging.
 *
 * Three things it does that a plain concatenation would not:
 *
 *  1. TRANSCODES AVIF. A web deliverable uses it because a browser fetching
 *     thirty textures cares about bytes. Once those textures live inside a
 *     .glb they are decoded through `createImageBitmap`, whose AVIF support is
 *     a per-browser fact rather than a guarantee -- and the failure is a
 *     silently untextured model, not an error. PNG is decoded everywhere and
 *     costs a few megabytes on a file that is already local.
 *
 *     PNG rather than JPEG on purpose: the AVIF was lossy once already, and
 *     re-encoding lossily is a second generation of artefacts on a surface
 *     that will be looked at closely. PNG stores exactly what came out.
 *
 *  2. STANDS THE MODEL UP. A product viewer that orbits a camera can leave the
 *     device lying flat; this stage cannot, because every device in the
 *     registry faces the camera down -Z and the shared rig assumes it. See
 *     `--rotate-x`.
 *
 *  3. Keeps the clips. They are the point of using a delivered asset rather
 *     than re-deriving the motion: the fold is authored rather than
 *     interpolated between two static poses.
 *
 * Usage:
 *   node scripts/gltf-to-glb.mjs <in.gltf> <out.glb> [--rotate-x N] [--rotate-y N]
 *
 *   --rotate-x N   degrees about X applied to the whole scene, via a wrapper
 *   --rotate-y N   the same about Y, applied after X
 *
 * The rotation is a WRAPPER NODE rather than a rewrite of every root
 * transform, and that is deliberate: the animation channels target nodes by
 * index and write translation and rotation absolutely. Baking a rotation into
 * a node the clip also drives would be silently undone the first time the clip
 * played. A parent above them all is the one place a clip cannot reach.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const [, , input, output, ...rest] = process.argv;
if (!input || !output) {
  console.error(
    "usage: node scripts/gltf-to-glb.mjs <in.gltf> <out.glb> [--rotate-x N] [--rotate-y N]",
  );
  process.exit(1);
}

const flag = (name, fallback = 0) => {
  const i = rest.indexOf(name);
  return i === -1 ? fallback : Number(rest[i + 1]);
};
const rotateX = flag("--rotate-x");
const rotateY = flag("--rotate-y");

const base = dirname(resolve(input));
const gltf = JSON.parse(readFileSync(input, "utf8"));

/* ---------------------------------------------------------------------------
   Binary
   ------------------------------------------------------------------------ */

/**
 * Everything that ends up in the BIN chunk, in order.
 *
 * glTF requires each bufferView to start on a 4-byte boundary, and an image
 * appended straight after another rarely does. Padding is added per chunk
 * rather than at the end.
 */
const chunks = [];
let offset = 0;
const append = (buffer) => {
  const start = offset;
  chunks.push(buffer);
  offset += buffer.length;
  const pad = (4 - (offset % 4)) % 4;
  if (pad) {
    chunks.push(Buffer.alloc(pad));
    offset += pad;
  }
  return start;
};

// The original buffer first, so every existing bufferView's offset still
// means what it said.
if (gltf.buffers?.length !== 1 || !gltf.buffers[0].uri) {
  console.error("expected exactly one external buffer");
  process.exit(1);
}
const binary = readFileSync(resolve(base, gltf.buffers[0].uri));
append(binary);
if (offset !== binary.length) {
  // The original buffer was padded to align what follows. Its own views are
  // unaffected -- they index from 0 -- but the recorded byteLength must cover
  // the padding or a strict reader rejects the file.
}

/* ---------------------------------------------------------------------------
   Images
   ------------------------------------------------------------------------ */

const images = gltf.images ?? [];
let transcoded = 0;

/*
 * Decoded in parallel and written in order.
 *
 * Order matters because each image becomes a bufferView and the views are
 * indexed. It is stated as an explicit two-phase pass rather than a loop with
 * an await in it, because the last time work like this was restructured an
 * `await` went missing and the run exported twenty-eight blank textures --
 * quietly, with a smaller file as the only sign.
 */
const decoded = await Promise.all(
  images.map(async (image) => {
    if (!image.uri) return null; // already embedded
    const bytes = readFileSync(resolve(base, image.uri));
    const isPngOrJpeg = /\.(png|jpe?g)$/i.test(image.uri);
    if (isPngOrJpeg) {
      return { bytes, mime: /\.png$/i.test(image.uri) ? "image/png" : "image/jpeg" };
    }
    const png = await sharp(bytes).png({ compressionLevel: 9 }).toBuffer();
    transcoded += 1;
    return { bytes: png, mime: "image/png" };
  }),
);

for (const [i, image] of images.entries()) {
  const result = decoded[i];
  if (!result) continue;
  const byteOffset = append(result.bytes);
  gltf.bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: result.bytes.length,
  });
  delete image.uri;
  image.mimeType = result.mime;
  image.bufferView = gltf.bufferViews.length - 1;
}

/* ---------------------------------------------------------------------------
   Standing the model up
   ------------------------------------------------------------------------ */

if (rotateX || rotateY) {
  const half = (deg) => (deg * Math.PI) / 360;
  // q = qy * qx, so X is applied first.
  const [sx, cx] = [Math.sin(half(rotateX)), Math.cos(half(rotateX))];
  const [sy, cy] = [Math.sin(half(rotateY)), Math.cos(half(rotateY))];
  const rotation = [cy * sx, sy * cx, -sy * sx, cy * cx];

  const scene = gltf.scenes[gltf.scene ?? 0];
  gltf.nodes.push({ name: "StudioOrientation", rotation, children: scene.nodes });
  scene.nodes = [gltf.nodes.length - 1];
}

/* ---------------------------------------------------------------------------
   Write
   ------------------------------------------------------------------------ */

gltf.buffers = [{ byteLength: offset }];

const json = Buffer.from(JSON.stringify(gltf), "utf8");
const jsonPad = (4 - (json.length % 4)) % 4;
const jsonChunk = Buffer.concat([json, Buffer.alloc(jsonPad, 0x20)]); // spaces
const binChunk = Buffer.concat(chunks);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // "glTF"
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);

const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonChunk.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binChunk.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4); // "BIN"

writeFileSync(
  output,
  Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]),
);

const mb = (n) => (n / 1e6).toFixed(2);
console.log(`${output}`);
console.log(
  `  ${gltf.meshes.length} meshes, ${gltf.materials.length} materials, ` +
    `${images.length} images (${transcoded} transcoded from avif)`,
);
console.log(
  `  clips: ${(gltf.animations ?? []).map((a) => a.name).join(", ") || "none"}`,
);
if (rotateX || rotateY) console.log(`  rotated x${rotateX} y${rotateY}`);
console.log(`  ${mb(12 + 8 + jsonChunk.length + 8 + binChunk.length)}MB`);
