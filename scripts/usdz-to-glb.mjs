/**
 * USDZ -> GLB, for adding a device model to the studio.
 *
 * Run once per model, by hand:
 *
 *   node scripts/usdz-to-glb.mjs <in.usdz> <out.glb> [--max-texture 2048] [--quality 85]
 *
 * ---------------------------------------------------------------------------
 * Why this exists rather than a converter off the shelf
 * ---------------------------------------------------------------------------
 *
 * The obvious tools are not here and are not worth their cost: Blender is a
 * gigabyte for one asset, and Apple's usdz tooling on macOS (`usdcat`,
 * `usdzip`, `usdcrush`) converts only between USD flavours -- none of them
 * writes glTF.
 *
 * three already ships a complete USD reader, so the conversion is a read with
 * three's loader and a write of the glTF by hand. Not `GLTFExporter`: it
 * encodes every texture through a `<canvas>`, which does not exist in node,
 * and which would re-encode images that are already in a format glTF accepts.
 * Writing the container directly lets the ORIGINAL jpeg and png bytes be
 * embedded untouched, so nothing is decoded and re-encoded on the way through.
 *
 * ---------------------------------------------------------------------------
 * Two things it fixes on the way
 * ---------------------------------------------------------------------------
 *
 * MATERIAL NAMES. `USDComposer` names objects but never materials -- there is
 * no `material.name =` anywhere in it. The studio binds its screen texture by
 * material name (`device.screenMaterial`), so a straight conversion would
 * produce a model whose screen can never be found. The names are recovered
 * from the USD itself: every mesh prim carries a `rel material:binding`, and
 * that binding is the name the studio is looking for.
 *
 * TEXTURE WEIGHT. Model shops export normal maps at close to lossless jpeg,
 * which is how a phone becomes a 22 MB download for two 2048 maps nobody can
 * tell apart from 1 MB ones. Anything over the size cap is resampled and
 * everything is recompressed, through sharp.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { Box3, Vector3, SRGBColorSpace } from "three";
import sharp from "sharp";
import { unzipSync } from "three/examples/jsm/libs/fflate.module.js";

/* ------------------------------------------------------------------ args */

const [input, output, ...rest] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/usdz-to-glb.mjs <in.usdz> <out.glb> [--max-texture N] [--quality N]");
  process.exit(1);
}
const arg = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(rest[i + 1]);
};
const MAX_TEXTURE = arg("max-texture", 2048);
const QUALITY = arg("quality", 85);
/*
 * Which prim to convert, when the file holds more than one model.
 *
 * A usdz can be an ASSEMBLY of components rather than one thing -- Apple ships
 * its iPhone 17 Pro and 17 Pro Max in a single file, laid out side by side, so
 * converting the whole file produces one 109 x 163 mm object that is two
 * phones. `--root <primName>` takes one of them.
 */
const rootIndex = rest.indexOf("--root");
const ROOT = rootIndex === -1 ? null : rest[rootIndex + 1];
/*
 * A yaw applied to the whole model, in degrees.
 *
 * The studio's default pose assumes a model whose screen faces -Z -- that is
 * why the editor opens at yAxis 180. A component lifted out of an assembly
 * carries whatever orientation it had in the layout, and Apple's two phones
 * face opposite ways in theirs, so one of them arrives back-to-front and opens
 * showing its camera bump.
 *
 * Baked here rather than corrected with a per-device offset in the registry:
 * the model being the wrong way round is a fact about the file, not a setting
 * anyone should have to know about downstream.
 */
const ROTATE_Y = arg("rotate-y", 0);
/*
 * A pitch, in degrees, applied before the yaw.
 *
 * For a component posed rather than laid flat. Apple ships its iPad Pro
 * standing in a Magic Keyboard, so the tablet arrives tilted back about 29
 * degrees and measures 188 tall by 112 deep instead of 215 by 5. The studio
 * frames a device from its bounding box, so a posed one is framed as the box
 * of a posed one -- too short, too thick, and leaning.
 */
const ROTATE_X = arg("rotate-x", 0);
const MAX_ORM = arg("max-orm", 1024);
/*
 * The satin band the roughness map is remapped into, as `lo,hi`.
 *
 * The grain is the map's VARIATION; its absolute level is not usable as-is.
 * Apple authors these around a mean of 43/255 -- about 0.17, a polished
 * surface -- which on this stage renders as chrome rather than as anodised
 * aluminium, because the studio's environment is a bright six-emitter rig
 * rather than the soft room Apple lit against.
 *
 * Rescaling the map into 0.28..0.62 keeps every speckle and every scratch
 * exactly where it was and only moves the range they sit in. That is the
 * difference between borrowing the grain and borrowing the gloss.
 */
const ROUGHNESS_RANGE = (() => {
  const i = rest.indexOf("--roughness-range");
  const raw = i === -1 ? "0.28,0.62" : rest[i + 1];
  const [lo, hi] = raw.split(",").map(Number);
  return { lo: lo ?? 0.28, hi: hi ?? 0.62 };
})();

/*
 * Roughness / metallic / occlusion maps, and the second UV set they need.
 *
 * OFF by default. Three attempts at shipping these have each looked worse on
 * the stage than leaving them out, so the default is the one that is known to
 * be acceptable and this is opt-in.
 *
 * The machinery itself is sound and worth keeping: the UV binding is resolved
 * per texture from the USD (Apple mixes "st" and "st1" inside a single
 * material), and ROUGHNESS_RANGE above rescales the map into a usable band.
 * Enabling it also needs the stage's finish pass to yield its roughness scalar
 * to a map rather than multiply by it -- that half is currently reverted too,
 * so turning this on alone will render chrome.
 */
const SURFACE_MAPS = rest.includes("--surface-maps");

/* ------------------------------------------------------- the DOM, stubbed */
/*
 * `USDComposer` turns each texture's bytes into a Blob, hands it to
 * URL.createObjectURL, and assigns the result to an Image's src -- a browser
 * round trip whose only purpose is to get decoded pixels. Nothing here wants
 * decoded pixels: the bytes ARE the output. So the stubs below carry the bytes
 * straight through and fire `onload` synchronously, and `texture.image.__bytes`
 * comes out the other end.
 */
const blobs = new WeakMap();
let objectUrlId = 0;
const urlBytes = new Map();

globalThis.Blob = class {
  constructor(parts) {
    const part = parts?.[0];
    const bytes =
      part instanceof Uint8Array
        ? part
        : part instanceof ArrayBuffer
          ? new Uint8Array(part)
          : new Uint8Array(0);
    blobs.set(this, bytes);
  }
};
globalThis.URL.createObjectURL = (blob) => {
  const url = `blob:usdz/${objectUrlId++}`;
  urlBytes.set(url, blobs.get(blob) ?? new Uint8Array(0));
  return url;
};
// Deliberately a no-op: the bytes are still needed after the loader is done
// with them, and the loader revokes as soon as its Image reports loaded.
globalThis.URL.revokeObjectURL = () => {};
globalThis.Image = class {
  set src(value) {
    this.__bytes = urlBytes.get(value) ?? null;
    this.__url = value;
    // Synchronous, so the texture is fully assembled by the time `parse`
    // returns and no async plumbing is needed around a one-shot script.
    this.onload?.();
  }
};
globalThis.document ??= { createElementNS: () => ({ getContext: () => null }) };

/* ------------------------------------------------------------- read USDZ */

const { USDLoader } = await import("three/examples/jsm/loaders/USDLoader.js");

const usdz = readFileSync(input);
const usdzAb = usdz.buffer.slice(usdz.byteOffset, usdz.byteOffset + usdz.byteLength);
const root = new USDLoader().parse(usdzAb);

/* -------------------------------------------- recover the material names */
/*
 * Straight out of the USD text. Every mesh prim declares the material it is
 * bound to, and that relationship is what `USDComposer` drops on the floor.
 * The ASCII form is parsed rather than the crate binary because the binding is
 * a one-line relationship and a regex over `usdcat` output is a great deal
 * less machinery than a second crate reader.
 */
/** The USD as ASCII, whatever form the archive stores it in. */
function loadUsdText(archive, file) {
  const files = unzipSync(new Uint8Array(archive));
  const usda = Object.keys(files).find((f) => f.endsWith(".usda"));
  let text;

  if (usda) {
    text = new TextDecoder().decode(files[usda]);
  } else {
    /*
     * The payload is crate binary (`.usdc`), which is the normal case -- it is
     * what every exporter writes and what makes a usdz memory-mappable.
     *
     * Reading it as text does not work, and the first version of this tried:
     * prim names and binding paths do survive in the token table, but they are
     * pooled and referenced by index rather than laid out in document order,
     * so a regex over the decoded bytes recovers zero pairs. It reports zero
     * rather than something wrong, which is at least honest, but it is still
     * zero.
     *
     * macOS ships `usdcat`, whose entire job is this conversion. Shelling out
     * to it is a great deal less code than a second crate reader, and this
     * script is already a by-hand tool run once per model.
     */
    const dump = `${tmpdir()}/${basename(file)}.usda`;
    try {
      execFileSync("usdcat", [file, "-o", dump], { stdio: ["ignore", "ignore", "pipe"] });
      text = readFileSync(dump, "utf8");
    } catch (error) {
      console.warn(
        "  ! could not run usdcat, so material names cannot be recovered.\n" +
          "    The model will convert, but `device.screenMaterial` will not find its screen.",
        error?.message ?? "",
      );
      return "";
    }
  }
  return text;
}

function materialNamesByMesh(text) {

  /*
   * Split on the prim rather than matching across it. A single regex spanning
   * from `def Mesh` to a binding will happily jump the gap when a mesh has no
   * binding of its own and attach the NEXT mesh's material to it -- silently,
   * and the studio would then bind its screen texture to the wrong surface.
   */
  /*
   * Narrowed to the chosen component before any of it is read.
   *
   * The two phones in Apple's file use the SAME prim names inside each
   * component, so parsing the whole document collapses 166 meshes into 83 map
   * entries and half the model silently takes the other half's materials.
   * Slicing the text to the component first makes the names unique again.
   */
  if (ROOT) {
    const start = text.indexOf(`def Xform "${ROOT}"`);
    if (start === -1) {
      console.warn(`  ! prim "${ROOT}" not found in the USD; reading the whole file`);
    } else {
      // To the next prim declared at the same indentation, which ends the block.
      const indent = text.slice(0, start).split("\n").pop().length;
      const after = text.slice(start + 1);
      const next = after.search(new RegExp(`\\n {${indent}}def `));
      text = next === -1 ? after : after.slice(0, next);
    }
  }

  const map = new Map();
  for (const chunk of text.split(/def Mesh "/).slice(1)) {
    const name = chunk.slice(0, chunk.indexOf('"'));
    const upToNextPrim = chunk.split(/\bdef \w+ "/)[0];
    /*
     * The LAST path segment, whatever the scope above it is called.
     *
     * This used to require `/Materials/`, which is what the first model
     * happened to call its scope. Apple obfuscates every prim name in its
     * design-resource assets, so the same relationship reads
     * `</uqyXUHbCOHbdqXa/oGOBzWXwJxPkCRE/.../uFgsppDNoPNkBqW>` and the
     * hardcoded scope matched nothing at all.
     */
    const binding = upToNextPrim.match(/material:binding\s*=\s*<[^>]*\/([A-Za-z0-9_]+)>/);
    /*
     * `doubleSided` is read here for the same reason the binding is: the
     * composer drops it. There is no `doubleSided`, no `DoubleSide` and no
     * `.side =` anywhere in its 4,041 lines, so every material arrives
     * single-sided no matter what the USD said.
     *
     * That is not cosmetic. 18 of the 19 prims in this model declare
     * `doubleSided = 1`, and a model authored double-sided and rendered with
     * back-face culling loses every surface whose winding faces away -- so
     * the phone turns into a shell you can see the camera module through from
     * the front. It reads as a broken conversion and is really one dropped
     * boolean.
     *
     * In USD this is a property of the MESH; in glTF it lives on the
     * material. Where one material is shared by a double-sided mesh and a
     * single-sided one, double wins: drawing a back face that did not need
     * drawing costs a few fragments, and culling one that did leaves a hole.
     */
    const doubleSided = /uniform bool doubleSided\s*=\s*1/.test(upToNextPrim);
    if (name) map.set(name, { material: binding?.[1], doubleSided });
  }
  return map;
}
const usdText = loadUsdText(usdzAb, input);
const nameByMesh = materialNamesByMesh(usdText);
const uvByMaterial = uvSetsByMaterial(usdText);

/**
 * Which UV set each texture slot of each material reads from.
 *
 * USD wires a texture to a "primvar reader" shader that names the UV set, and
 * a model can use more than one: Apple's file has 42 readers on "st" and 26 on
 * "st1", mixed across normal, roughness and occlusion within a single
 * material. `USDComposer` drops the binding entirely -- every map comes back
 * reporting channel 0 -- so exporting them all against TEXCOORD_0 samples the
 * st1 ones with the wrong coordinates, which renders as one texture tiled
 * across surfaces it was never meant to touch.
 *
 * The chain is three hops: the surface shader's input connects to a texture
 * shader, that shader's `inputs:st` connects to a reader, and the reader
 * carries the varname. All three are resolved here so each exported texture
 * can state its own `texCoord`.
 */
function uvSetsByMaterial(text) {
  const out = new Map();
  for (const block of text.split('def Material "').slice(1)) {
    const name = block.slice(0, block.indexOf('"'));
    // Bounded: a material block is small, and scanning to the end of the file
    // for every one of 64 materials is quadratic on a 17 MB document.
    const body = block.slice(0, 40000);

    const readers = new Map();
    for (const m of body.matchAll(
      /def Shader "([^"]+)"[\s\S]{0,800}?string inputs:varname = "([a-z0-9]+)"/g,
    )) {
      readers.set(m[1], m[2]);
    }
    const textureUv = new Map();
    for (const m of body.matchAll(
      /def Shader "([^"]+)"[\s\S]{0,1500}?inputs:st\.connect = <[^>]*\/([A-Za-z0-9_]+)\.outputs:result>/g,
    )) {
      textureUv.set(m[1], m[2]);
    }

    const slots = {};
    for (const slot of ["diffuseColor", "normal", "occlusion", "roughness", "metallic"]) {
      const hit = body.match(new RegExp(`inputs:${slot}\\.connect = <[^>]*/([A-Za-z0-9_]+)\\.outputs:`));
      if (!hit) continue;
      const varname = readers.get(textureUv.get(hit[1]) ?? "");
      // "st" is UV set 0, "st1" set 1. Anything unresolved falls back to 0,
      // which is what every one-UV-set model in the world means.
      slots[slot] = varname === "st1" ? 1 : 0;
    }
    if (!out.has(name)) out.set(name, slots);
  }
  return out;
}

/* --------------------------------------------------------- collect meshes */

root.updateWorldMatrix(true, true);

const subject = ROOT ? (root.getObjectByName(ROOT) ?? root) : root;
if (ROOT && subject === root) {
  console.warn(`  ! prim "${ROOT}" not found in the scene; converting everything`);
}

const meshes = [];
subject.traverse((object) => {
  if (!object.isMesh || !object.geometry?.attributes?.position) return;
  meshes.push(object);
});
if (!meshes.length) {
  console.error("no meshes found — is this a USDZ?");
  process.exit(1);
}

/*
 * World transforms are baked into the vertices and the node tree is flattened.
 *
 * A device model is a static prop: nothing in the studio animates a sub-node
 * of it except the fold hinge, which is skinned and comes through its own
 * clip. Flattening removes a whole class of unit and basis mistakes at the
 * cost of a hierarchy nothing reads.
 *
 * `metersPerUnit` in these files is 0.01, so the scale below turns
 * centimetres into the metres glTF is authored in.
 */
const USD_TO_M = 0.01;

/* ------------------------------------------------------------- textures */

const textureCache = new Map(); // source url -> index into `images`
const ormCache = new Map();
const images = [];

function sniffMime(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  return null;
}

/**
 * Embed a colour or normal map, resampled and recompressed if that helps.
 *
 * The SOURCE format is kept -- a png stays a png. The rule used to be "png
 * only if it has alpha, jpeg otherwise", which quietly re-encoded lossless art
 * as lossy: Apple's back glass is a 1024x1024 png holding a single smooth
 * gradient, and a smooth gradient is the worst case for jpeg. It came back
 * with visible horizontal blocking straight down the back of the phone.
 * Whoever exported the asset already decided lossless-vs-lossy; re-deciding it
 * from one channel throws that away.
 */
async function addTexture(texture) {
  const bytes = texture?.image?.__bytes;
  if (!bytes?.length) return null;
  const key = texture.image.__url;
  if (textureCache.has(key)) return textureCache.get(key);

  const mime = sniffMime(bytes);
  if (!mime) return null;

  let out = Buffer.from(bytes);
  let note = "kept";
  try {
    const meta = await sharp(out).metadata();
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
    const needsResize = longest > MAX_TEXTURE;
    const isPng = mime === "image/png";
    let work = sharp(Buffer.from(bytes));
    if (needsResize) work = work.resize({ width: MAX_TEXTURE, height: MAX_TEXTURE, fit: "inside" });
    const next = isPng
      ? await work.png({ compressionLevel: 9, palette: false }).toBuffer()
      : await work.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    if (next.length < out.length) {
      note = `${meta.width}x${meta.height} ${(out.length / 1048576).toFixed(2)}MB -> ${(next.length / 1048576).toFixed(2)}MB`;
      out = next;
    }
  } catch {
    // An image sharp cannot read is embedded exactly as it arrived rather than
    // dropped: a model with a slightly odd texture should still convert.
  }

  const index = images.length;
  images.push({ bytes: out, mime: sniffMime(out) ?? mime });
  textureCache.set(key, index);
  if (note !== "kept") console.log(`   texture ${index}: ${note}`);
  return index;
}

/**
 * A greyscale USD map, decoded to raw single-channel pixels at a common size.
 */
async function rawChannel(bytes, size, neutral) {
  if (!bytes) return Buffer.alloc(size * size, neutral);
  return sharp(Buffer.from(bytes))
    .resize(size, size, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
}

async function packedSize(...maps) {
  const sizes = await Promise.all(
    maps.filter(Boolean).map(async (b) => {
      const meta = await sharp(Buffer.from(b)).metadata();
      return Math.max(meta.width ?? 0, meta.height ?? 0);
    }),
  );
  return Math.min(MAX_ORM, Math.max(...sizes, 1));
}

function pushImage(bytes) {
  const index = images.length;
  // png, not jpeg: these drive shading rather than colour, and jpeg's chroma
  // subsampling would smear one channel into the next.
  images.push({ bytes, mime: "image/png" });
  return index;
}

/**
 * Roughness and metallic, in the channels glTF reads them from.
 *
 * G is roughness, B is metallic, R is left white and unused. Occlusion is NOT
 * packed in alongside, even though glTF permits it: the two are not guaranteed
 * to share a UV set, and on this model they do not.
 *
 * Skipping these was leaving most of the asset on the floor. Apple's file
 * ships 26 textures and only 12 were coming through, and the missing ones
 * carry surface: the camera plateau's roughness map is what breaks up its
 * reflection, and without it the studio's own lighting rig mirrors off a
 * near-polished metal and the plateau reads as blotchy wet plastic.
 */
async function addSurfaceTexture(source) {
  const rough = source?.roughnessMap?.image?.__bytes;
  const metal = source?.metalnessMap?.image?.__bytes;
  if (!rough && !metal) return null;

  const key = `s|${source?.roughnessMap?.image?.__url ?? "-"}|${source?.metalnessMap?.image?.__url ?? "-"}`;
  if (ormCache.has(key)) return ormCache.get(key);

  try {
    const size = await packedSize(rough, metal);
    const [roughC, metalC] = await Promise.all([
      rawChannel(rough, size, 255),
      rawChannel(metal, size, 0),
    ]);
    if (rough) {
      // Into the satin band, keeping the spread. A linear rescale, so the
      // relative light and dark of every speckle survives untouched.
      const lo = Math.round(ROUGHNESS_RANGE.lo * 255);
      const hi = Math.round(ROUGHNESS_RANGE.hi * 255);
      let min = 255;
      let max = 0;
      for (let i = 0; i < roughC.length; i++) {
        if (roughC[i] < min) min = roughC[i];
        if (roughC[i] > max) max = roughC[i];
      }
      const span = Math.max(1, max - min);
      for (let i = 0; i < roughC.length; i++) {
        roughC[i] = lo + Math.round(((roughC[i] - min) / span) * (hi - lo));
      }
    }
    const rgb = Buffer.alloc(size * size * 3);
    for (let i = 0; i < size * size; i++) {
      rgb[i * 3] = 255;
      rgb[i * 3 + 1] = roughC[i];
      rgb[i * 3 + 2] = metalC[i];
    }
    const packed = await sharp(rgb, { raw: { width: size, height: size, channels: 3 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const index = pushImage(packed);
    ormCache.set(key, index);
    console.log(`   surface ${index}: ${size}x${size} (${[rough && "rough", metal && "metal"].filter(Boolean).join("+")}) ${(packed.length / 1048576).toFixed(2)}MB`);
    return index;
  } catch {
    return null;
  }
}

/** Occlusion, on its own, so it can carry its own UV set. */
async function addOcclusionTexture(source) {
  const ao = source?.aoMap?.image?.__bytes;
  if (!ao) return null;
  const key = `o|${source?.aoMap?.image?.__url}`;
  if (ormCache.has(key)) return ormCache.get(key);
  try {
    const size = await packedSize(ao);
    const aoC = await rawChannel(ao, size, 255);
    const gray = await sharp(aoC, { raw: { width: size, height: size, channels: 1 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const index = pushImage(gray);
    ormCache.set(key, index);
    return index;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ glTF build */

const bin = [];
let binLength = 0;
function writeBuffer(view) {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  // Accessor data must start on a multiple of its component size; 4 satisfies
  // every type used here.
  const pad = (4 - (binLength % 4)) % 4;
  if (pad) {
    bin.push(new Uint8Array(pad));
    binLength += pad;
  }
  const offset = binLength;
  bin.push(bytes);
  binLength += bytes.length;
  return offset;
}

const gltf = {
  asset: { version: "2.0", generator: `mockup-studio usdz-to-glb (${basename(input)})` },
  scene: 0,
  scenes: [{ nodes: [] }],
  nodes: [],
  meshes: [],
  materials: [],
  accessors: [],
  bufferViews: [],
  textures: [],
  images: [],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
  buffers: [],
};

function addAccessor(array, type, componentType, count, { min, max } = {}) {
  const offset = writeBuffer(array);
  gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: array.byteLength });
  const accessor = {
    bufferView: gltf.bufferViews.length - 1,
    componentType,
    count,
    type,
  };
  if (min) accessor.min = min;
  if (max) accessor.max = max;
  gltf.accessors.push(accessor);
  return gltf.accessors.length - 1;
}

const materialIndex = new Map();

async function addMaterial(source, name, doubleSided) {
  const key = `${name}|${source?.uuid ?? "none"}`;
  if (materialIndex.has(key)) {
    const existing = materialIndex.get(key);
    // Sticky: one double-sided user is enough for all of them.
    if (doubleSided) gltf.materials[existing].doubleSided = true;
    return existing;
  }

  const baseColorTexture = source?.map ? await addTexture(source.map) : null;
  const normalTexture = source?.normalMap ? await addTexture(source.normalMap) : null;
  const uv = uvByMaterial.get(name) ?? {};
  const surfaceTexture = SURFACE_MAPS ? await addSurfaceTexture(source) : null;
  const occlusionTexture = SURFACE_MAPS ? await addOcclusionTexture(source) : null;

  const material = {
    // The whole point of the exercise: the studio finds its screen with this.
    name,
    // From the USD prim, not from `source.side` -- see materialNamesByMesh.
    doubleSided: Boolean(doubleSided),
    pbrMetallicRoughness: {
      /*
       * Read back in sRGB, and written as glTF's linear factor. That looks
       * like a colour-space mistake and is the exact opposite: it undoes one.
       *
       * UsdPreviewSurface defines `diffuseColor` as LINEAR. `USDComposer`
       * reads it with `setRGB(r, g, b, SRGBColorSpace)` (line 2520), so an
       * already-linear value is put through an sRGB-to-linear conversion a
       * second time and lands far too dark and far too saturated. Apple's
       * Cosmic Orange back panel is authored (0.7678, 0.1397, 0.0292), which
       * is rgb(227, 102, 46); after the extra conversion it renders as
       * rgb(196, 36, 7) -- a hard red, which is what put a red Apple logo and
       * a red Camera Control button on a grey phone.
       *
       * Asking the Color for its sRGB components applies the inverse
       * transform, returning exactly the numbers the USD authored, which is
       * what glTF's linear `baseColorFactor` wants.
       */
      baseColorFactor: [
        ...(source?.color
          ? (() => {
              const c = source.color.getRGB({ r: 1, g: 1, b: 1 }, SRGBColorSpace);
              return [c.r, c.g, c.b];
            })()
          : [1, 1, 1]),
        source?.opacity ?? 1,
      ],
      metallicFactor: source?.metalness ?? 0,
      roughnessFactor: source?.roughness ?? 1,
    },
  };
  if (baseColorTexture !== null) {
    material.pbrMetallicRoughness.baseColorTexture = { index: baseColorTexture };
  }
  if (normalTexture !== null) material.normalTexture = { index: normalTexture };
  /*
   * Roughness and metallic share one texture; occlusion gets its own.
   *
   * glTF packs all three together, which is only valid while they read from
   * the same UV set -- and here they do not. On the camera plateau, roughness
   * is on "st" and occlusion on "st1", so one packed texture would have to
   * lie about one of them. Two textures, each stating its own `texCoord`,
   * costs a few kilobytes and is simply correct.
   *
   * glTF MULTIPLIES these factors by the map where USD replaces the scalar
   * outright, so a factor left at the composer's default would scale the map
   * -- and `metalness` defaults to 0, which would multiply a metallic map
   * away to nothing.
   */
  if (surfaceTexture !== null) {
    material.pbrMetallicRoughness.metallicRoughnessTexture = {
      index: surfaceTexture,
      ...(uv.roughness ? { texCoord: uv.roughness } : {}),
    };
    if (source?.roughnessMap) material.pbrMetallicRoughness.roughnessFactor = 1;
    if (source?.metalnessMap) material.pbrMetallicRoughness.metallicFactor = 1;
  }
  if (occlusionTexture !== null) {
    material.occlusionTexture = {
      index: occlusionTexture,
      ...(uv.occlusion ? { texCoord: uv.occlusion } : {}),
    };
  }
  if (normalTexture !== null && uv.normal) {
    material.normalTexture.texCoord = uv.normal;
  }
  if (baseColorTexture !== null && uv.diffuseColor) {
    material.pbrMetallicRoughness.baseColorTexture.texCoord = uv.diffuseColor;
  }
  if ((source?.opacity ?? 1) < 1 || source?.transparent) material.alphaMode = "BLEND";

  gltf.materials.push(material);
  const index = gltf.materials.length - 1;
  materialIndex.set(key, index);
  return index;
}

console.log(`reading ${basename(input)}`);
console.log(`  meshes: ${meshes.length}, material bindings recovered: ${nameByMesh.size}`);

for (const mesh of meshes) {
  const geometry = mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.scale(USD_TO_M, USD_TO_M, USD_TO_M);
  // Pitch before yaw: levelling a tilted part is a statement about the part,
  // and turning it to face the camera is a statement about the stage.
  if (ROTATE_X) geometry.rotateX((ROTATE_X * Math.PI) / 180);
  if (ROTATE_Y) geometry.rotateY((ROTATE_Y * Math.PI) / 180);

  const position = geometry.attributes.position;
  const box = new Box3().setFromBufferAttribute(position);

  const attributes = {
    POSITION: addAccessor(
      new Float32Array(position.array),
      "VEC3",
      5126,
      position.count,
      { min: box.min.toArray(), max: box.max.toArray() },
    ),
  };
  if (geometry.attributes.normal) {
    const normal = geometry.attributes.normal;
    attributes.NORMAL = addAccessor(new Float32Array(normal.array), "VEC3", 5126, normal.count);
  }
  if (geometry.attributes.uv) {
    const uv = geometry.attributes.uv;
    attributes.TEXCOORD_0 = addAccessor(new Float32Array(uv.array), "VEC2", 5126, uv.count);
  }
  // The second set, where the model has one. Apple binds occlusion to it on
  // some materials; without it those maps have no correct coordinates to use.
  // Only written alongside the maps that need it -- on its own it is bytes
  // nothing reads.
  if (SURFACE_MAPS && geometry.attributes.uv1) {
    const uv1 = geometry.attributes.uv1;
    attributes.TEXCOORD_1 = addAccessor(new Float32Array(uv1.array), "VEC2", 5126, uv1.count);
  }

  let indices;
  if (geometry.index) {
    // 16-bit where it fits; a phone body is well past 65k in places, so this
    // is a real branch rather than a formality.
    const array =
      position.count > 65535
        ? new Uint32Array(geometry.index.array)
        : new Uint16Array(geometry.index.array);
    indices = addAccessor(array, "SCALAR", position.count > 65535 ? 5125 : 5123, geometry.index.count);
  }

  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const meta = nameByMesh.get(mesh.name);
  const name = meta?.material ?? material?.name ?? `material_${gltf.materials.length}`;
  const materialRef = await addMaterial(material, name, meta?.doubleSided);

  gltf.meshes.push({
    name: mesh.name,
    primitives: [{ attributes, ...(indices !== undefined ? { indices } : {}), material: materialRef }],
  });
  gltf.nodes.push({ name: mesh.name, mesh: gltf.meshes.length - 1 });
  gltf.scenes[0].nodes.push(gltf.nodes.length - 1);
}

// Images last, so every geometry accessor is already placed and the image
// bytes simply tail the buffer.
for (const image of images) {
  const offset = writeBuffer(image.bytes);
  gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: image.bytes.length });
  gltf.images.push({ bufferView: gltf.bufferViews.length - 1, mimeType: image.mime });
  gltf.textures.push({ sampler: 0, source: gltf.images.length - 1 });
}

/* --------------------------------------------------------------- pack GLB */

const binary = Buffer.concat(bin.map((b) => Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
gltf.buffers.push({ byteLength: binary.length });

const jsonText = Buffer.from(JSON.stringify(gltf), "utf8");
const jsonPad = (4 - (jsonText.length % 4)) % 4;
const jsonChunk = Buffer.concat([jsonText, Buffer.alloc(jsonPad, 0x20)]);
const binPad = (4 - (binary.length % 4)) % 4;
const binChunk = Buffer.concat([binary, Buffer.alloc(binPad, 0)]);

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

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]));

const size = new Box3().setFromObject(subject).getSize(new Vector3()).multiplyScalar(USD_TO_M);
console.log(`wrote ${output}`);
console.log(`  ${(readFileSync(output).length / 1048576).toFixed(2)} MB`);
console.log(`  materials: ${gltf.materials.map((m) => m.name).join(", ")}`);
console.log(`  size: ${(size.x * 1000).toFixed(1)} x ${(size.y * 1000).toFixed(1)} x ${(size.z * 1000).toFixed(1)} mm`);
