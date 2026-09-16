/**
 * The device registry.
 *
 * Adding a device is an entry here plus a GLB in
 * `public/figma-assets/mockup-studio/models/` — no changes to the renderer.
 *
 * Most of what used to be hand-tuned per model is now measured at load time
 * instead: PhoneStage3D finds the model's own screen mesh (whichever one
 * `hideHints` matches), takes its size, centre and which face it sits on, and
 * places the screen from that. So an entry only carries what geometry cannot
 * tell you — the glass corner radius, and whether the device has a notch.
 *
 * LICENSING: every model shipped here needs its licence recorded in `credit`.
 * Where the licence requires attribution (CC-BY and friends), that credit has
 * to appear in the site footer, not only in this file.
 */
export interface DeviceNotch {
  /** All measured against the authored screen size below. */
  widthPx: number;
  heightPx: number;
  topPx: number;
  offsetXPx: number;
  offsetYPx: number;
  borderRadiusPx: number;
  scale: number;
}

/**
 * How one material or mesh is coloured, overriding the finish pass.
 *
 * A bare string is a fixed colour. The long form adds `opacity`, for a part
 * that is a pane rather than a surface, and `lighten`, for one that should
 * FOLLOW the finish rather than ignore it.
 *
 * `lighten` is there because most exceptions on a phone are not a different
 * colour, they are the same colour treated differently: a glass back over
 * anodised aluminium is the body's own colour, a little brighter, because it
 * is a polished surface over a matte one. Stating a hex for that would freeze
 * it to one finish and read wrong in the other seven.
 */
export type MaterialOverride =
  | string
  | {
      color?: string;
      opacity?: number;
      /** 0..1 toward white, applied to the FINISH colour. Overrides `color`. */
      lighten?: number;
      /** 0..1 toward black, applied to the FINISH colour. Overrides `color`. */
      darken?: number;
      /**
       * Multiplier on the finish's saturation. 1 leaves it alone.
       *
       * For the parts that are the same colour as the body but MORE of it.
       * Apple's Light Gold is a cream back with a frankly gold rail, and Sky
       * Blue a near-white back with a bluer one -- the trim is polished metal
       * against matte glass, and polished metal returns a deeper version of
       * the colour rather than the same one. Deriving it keeps that true in
       * every finish instead of pinning a gold hex that would be wrong in the
       * other three.
       */
      saturate?: number;
      /**
       * Surface, where the part needs its own rather than the model's.
       *
       * An override otherwise leaves metalness, roughness and environment
       * response exactly as authored -- which is usually right, and is why a
       * milled logo keeps its gloss. A panel that has had its base map dropped
       * is the exception: the map was carrying its character, and without
       * something stated in its place it renders as a dead flat fill.
       */
      roughness?: number;
      metalness?: number;
      envMapIntensity?: number;
    };

export interface Device {
  id: string;
  label: string;
  /**
   * How the body is drawn. "glb" loads `modelPath`; "laptop" is generated
   * geometry and needs no file. Absent means glb, so every existing entry is
   * unchanged.
   */
  kind?: "glb" | "laptop" | "image";
  /** Served from /public. Required for `kind: "glb"`. */
  modelPath?: string;
  /**
   * Hide any mesh whose name OR material name contains one of these. Models
   * bake a placeholder wallpaper into a mesh that would otherwise cover the
   * real screen — and the same mesh is what gets measured to place it.
   * Miss the name and you get the model's stock home screen instead.
   */
  hideHints: string[];
  /** Screen corner radius as a fraction of screen width. */
  screenCornerRadiusPct: number;
  /** Pulls the screen plane just inside the measured mesh, so its edge does
      not fight the bezel for the same pixels. */
  screenInsetPct: number;
  /** The size the screen UI is authored at; the texture is rasterised at this
      and then mapped onto whatever the mesh measures. */
  screenNative: { width: number; height: number };
  notch: DeviceNotch | null;
  /**
   * Name of the model's own screen material. When set, the renderer binds
   * the screen texture straight onto it instead of hiding the mesh and
   * floating a plane in front — the model already carries screen geometry,
   * UVs and curvature, and reusing them beats reconstructing them.
   * `hideHints` is then unused for that device.
   */
  screenMaterial?: string;
  /**
   * Set when the model's screen UVs run right-to-left, which renders the
   * bound texture mirrored. Nothing about the geometry says which way an
   * author laid them out, so it is a per-model fact rather than something
   * the loader can measure.
   */
  screenFlipX?: boolean;
  /**
   * The same for the V axis, when a model's screen UVs run bottom to top.
   *
   * Separate from `screenFlipX` because the two are independent facts about an
   * export and no model has yet needed both.
   */
  screenFlipY?: boolean;
  /**
   * A quarter turn applied to the screen texture, in degrees.
   *
   * Separate from the flips because it is a different fact: the flips say the
   * UVs run backwards, this says they run along the other axis. The Fold's
   * inner panel is authored landscape, so a portrait screenshot bound to it
   * arrives lying on its side -- and no combination of mirroring stands it
   * back up.
   *
   * Swaps the aspect used to crop as well as turning the texture, or the fit
   * would trim the source against the screen's pre-rotation shape.
   */
  screenRotateDeg?: number;
  /**
   * The aspect of the span the screen mesh's own UVs occupy.
   *
   * Geometry alone does not say how a texture lands on a mesh. The Fold's
   * inner panel is 1.42 times wider than it is tall but its UVs span a 1.0
   * SQUARE, so the mapping stretches anything bound to it by 1.42 -- and the
   * fit, targeting the geometry, cropped to 1.42 as well, for 1.42 x 1.42 =
   * 2.02x. That is the stretch: a circle came back twice as wide as tall no
   * matter what size the source was, which is why no authoring size could fix
   * it from the outside.
   *
   * With this the fit targets uvAspect / meshAspect instead, which is the
   * region shape that comes out undistorted. Read straight off TEXCOORD_0 in
   * the file rather than guessed. Omit it and the fit uses the geometry, which
   * is right for any model whose UVs are laid out proportionally.
   */
  screenUvAspect?: number;
  /**
   * Fit the screenshot to the aspect this device STATES, not the one measured
   * off its screen mesh.
   *
   * The measurement is normally the better source -- it is the screen the
   * renderer will actually draw, so it cannot disagree with it. It stops being
   * reliable when the model is authored LYING FLAT: the box is taken in world
   * space part-way through standing the device up, and what comes back is some
   * mixture of the panel's height and the body's thickness rather than either.
   *
   * On Apple's web-delivered Duo that produced a crop about a tenth of the
   * picture tall, stretched down the panel -- vertical bands of colour where a
   * screenshot should be. Its UVs are a clean proportional 0..1 across the
   * display, so `screenNative` describes the mapping exactly and measuring
   * adds nothing but a chance to be wrong.
   */
  screenFitFromNative?: boolean;
  /**
   * The colour the model was authored in, when part of the body is baked into
   * a base-colour map rather than driven by a material factor. Texels sharing
   * this hue follow the selected finish; everything else in the map — lens
   * rings, flash, mesh — is left alone. Omit and maps are never retinted.
   */
  authoredBodyColor?: string;
  /**
   * Extra yaw applied to the model itself, in degrees.
   *
   * The stage opens at yAxis 180 because the phone GLBs put their screen on
   * -Z. A model built facing the other way shows its back at that default --
   * the MacBook opened on its closed lid. Correcting it here rather than by
   * changing the default keeps ONE camera convention across the registry, so
   * a keyframe or a motion preset means the same thing whichever device is
   * loaded.
   */
  modelYawDeg?: number;
  /**
   * Extra pitch applied to the model itself, in degrees about X.
   *
   * Not every export stands its device up. The iPhone Air is modelled lying
   * flat -- its long axis is Z, not Y -- so at rest the stage showed its edge.
   * Both this and the yaw are applied BEFORE the model is measured, so the
   * fit and the recentring see the pose that will actually be rendered.
   */
  /**
   * Try a handful of quarter turns and keep whichever stands the model up.
   *
   * For exports that are modelled lying down. Measured rather than specified,
   * because a glTF scene carries its own node transforms and a named angle
   * composes with them in ways that are not predictable from the file.
   */
  autoStand?: boolean;
  /**
   * Which mesh is the screen, for `autoStand`.
   *
   * Standing a model up by measuring height and depth cannot tell front from
   * back -- a phone facing away is exactly as tall and as thin as one facing
   * you. Naming the screen lets the search prefer the pose that puts it toward
   * the camera, which is the difference between a mockup and a photo of the
   * back of a phone.
   */
  screenHint?: string;
  /**
   * Where the two ends of the hinge live in the model's own animation.
   *
   * Only for models that ship one. A folding phone has no single correct set
   * of node transforms -- the file's are wherever the rig was left, which for
   * the Fold is both leaves flat with the inner display still folded shut, so
   * the screen renders detached from the body. The poses that make sense are
   * the frames of the clip, and these name the two that matter.
   *
   * Given, the editor grows a Fold control and scrubs between them. Omitted,
   * the device renders exactly as authored and no mixer is built -- which is
   * every rigid phone.
   */
  /**
   * Meshes moved by hand, in the file's own units and world axes, before the
   * model is posed or measured. For a part an export left in the wrong place.
   */
  meshNudges?: Record<string, [number, number, number]>;
  fold?: {
    openSec: number;
    closedSec: number;
    /**
     * Which clip holds the fold, when the file carries more than one.
     *
     * Defaults to the first, which is right for anything this repo converted
     * itself -- those files have exactly one. Apple's web-delivered Duo ships
     * two, `Intro` and `Slider`, and `Intro` comes first: left to the default
     * the lid slider would scrub an entrance animation.
     */
    clip?: string;
  };
  /**
   * A second screen on the same body, with its own source.
   *
   * A fold has two: the big inner panel you open it for, and the cover panel
   * on the outside. They show different things in any real screenshot, so one
   * source bound to both would be a mockup of a phone mirroring itself.
   *
   * Bound exactly like `screenMaterial`, but fed from the second upload and
   * cropped against `native` rather than a measured mesh -- the cover panel is
   * small, flat and rectangular, so its authored aspect is all the fit needs.
   */
  coverScreen?: {
    material: string;
    native: { width: number; height: number };
    flipX?: boolean;
    flipY?: boolean;
    rotateDeg?: number;
    /**
     * The sub-rectangle of texture space the cover mesh's UVs actually
     * occupy, when it is not the full 0..1 square.
     *
     * The Fold's cover panel runs v from 0.3138 to 1.0 -- the model packs it
     * into part of a shared wallpaper. Binding a source without accounting
     * for that samples the wrong 69% of it and offsets what is left.
     */
    uvRect?: { x?: number; y?: number; w?: number; h?: number };
  };
  /**
   * Materials sharing the screen mesh that should stop drawing.
   *
   * `hideHints` cannot reach these: the screen-material branch returns as soon
   * as it has bound, so a prim on the SAME mesh never reaches the hide test.
   * The Fold's inner panel carries "Glass flex" -- black at a third alpha --
   * directly over the OLED, which sits on the screenshot as a grey veil and is
   * what makes that screen read dull and faded.
   */
  screenOverlayHide?: string[];
  /**
   * Materials that are BODY, even though the model marks them transparent.
   *
   * The finish pass leaves anything transparent alone, because on a phone that
   * is nearly always the screen glass or a lens cover and tinting it would be
   * wrong. The Fold names its back panel "Frosted glass" and gives it an alpha
   * of 0.94, so it fell into that branch and stayed the authored near-white in
   * every finish -- the one large surface the finish exists to change.
   */
  bodyMaterials?: string[];
  /**
   * The ONLY materials the finish paints. An allow-list.
   *
   * `keepMaterials` is the deny-list version of the same decision, and the two
   * fail opposite ways: leave a material out of the deny-list and it gets
   * painted, leave one out of this and it keeps what the file says. For an
   * Apple asset the second is a safe default -- the authored colour is already
   * correct for the colourway that file shipped as -- and the first is not.
   *
   * Prefer this on anything with more than a handful of materials. A laptop
   * has around thirty and five of them are the finish; naming those five is
   * both shorter and stable across a reconversion, where the deny-list has to
   * be re-audited every time because a material that appears from nowhere is
   * painted by default.
   *
   * `materialColors` and `meshColors` still win over this, so a device can
   * name an exception without adding it to the finish.
   */
  finishMaterials?: string[];
  /**
   * How strongly the environment shows on the body, overriding the studio's
   * own 2.1.
   *
   * For models whose materials arrived with roughness already baked into a
   * map, which is every model this repo converted rather than received: the
   * map wins over the scalar, and a body the map says is smooth turns the
   * studio's soft key into a hard reflection. Turning the environment down is
   * the only lever left that reaches them.
   */
  bodyEnvMapIntensity?: number;
  /**
   * Materials to REBUILD from the finish rather than retint.
   *
   * Every map dropped and colour, roughness and metalness taken from the finish
   * alone. For imported surfaces whose baked metallic-roughness texture
   * overrules any scalar — where the honest options are to fight the map or to
   * replace it, and replacing it is the one that ends.
   *
   * Nothing uses it at present. The iPhone 18s did, because the converter they
   * came through re-encoded their surface maps; `scripts/usdz-to-glb.mjs`
   * emits no metallic-roughness texture at all, so the finish's own numbers
   * reach the body unopposed and the body keeps the colour map that carries
   * its grain. Kept for the next model that arrives welded shut.
   */
  plainBodyMaterials?: string[];
  /**
   * Surface numbers for named materials, applied AFTER the finish.
   *
   * Not `materialColors`, which is an override list: putting a body material
   * in that takes it out of the finish path altogether and the phone renders
   * grey whatever colour is chosen. This sets only roughness, metalness and
   * environment, and leaves the colour to the finish — which is what lets the
   * back panel be matter than the frame without ceasing to be Sky Blue.
   */
  bodySurfaces?: Record<
    string,
    {
      roughness?: number;
      metalness?: number;
      envMapIntensity?: number;
      /**
       * A literal colour, for surfaces that should NOT wear the finish.
       *
       * Clear glass is the case this exists for. It is not body, so no finish
       * touches it, and it therefore keeps whatever tint the archive composed
       * — burgundy, on these — which then sits over every other colour like a
       * gel. Neutralising it is what lets Silver read silver.
       */
      color?: string;
      /**
       * Drop this material's maps and shade it as plain metal.
       *
       * For a surface whose texture is DETAIL rather than colour. The iris
       * blades are the case: the archive prints a full mechanism onto them —
       * striations, screw heads, etch marks — at a scale meant to be seen from
       * millimetres away, and on a phone-sized render it reads as litter
       * scattered inside the lens rather than as a mechanism.
       *
       * A colour alone cannot fix that, because a colour MULTIPLIES the map:
       * darkening the blades dims the pattern and leaves its contrast exactly
       * where it was. The map has to go.
       *
       * Worth knowing why only one of the two 18s ever looked wrong. The Pro
       * Max is converted with `--rotate-y 180`, so it is seen from the other
       * side of the same blades and shows their plain back face; the Pro shows
       * the printed front. Same geometry, same material, opposite faces. This
       * makes both of them the plain one on purpose rather than by luck.
       */
      flat?: boolean;
    }
  >;
  /**
   * A perforated panel, stated PER FINISH.
   *
   * Every other override in this file is one value that carries across the
   * lineup, because a panel keeps its relationship to the body whatever colour
   * the body is. This one does not, and the reason is worth writing down: the
   * holes are absent from the model -- they live in an opacity map the
   * converter cannot carry -- so what is being tuned is not a colour but an
   * illusion of texture, and the illusion needs opposite settings at opposite
   * ends of the lineup.
   *
   * On Silver the deck is bright by its own albedo, so the band reads as
   * perforated by going LIGHTER and killing its reflection: matte, bright, and
   * obviously not the polished metal beside it. On Space Black the deck is
   * near-black and almost all of its lightness is reflection, so the same
   * treatment produced a black rectangle. There the band has to go slightly
   * darker and reflect MORE than the deck, not less.
   *
   * Four derived attempts failed before this: a quarter step darker read as
   * paint, an eighth still read as a stripe, a twentieth vanished, and the
   * roughness trick inverted between the two finishes. These numbers were set
   * by eye against the real thing, which is the only way to fix a value that
   * stands in for geometry the file does not contain.
   */
  speakerGrille?: {
    material: string;
    /** Keyed by finish id. Falls back to the first entry. */
    byFinish: Record<string, MaterialOverride>;
  };
  /**
   * Materials that carry an etched mark rather than a surface.
   *
   * Rendered white at a low opacity, which is how a logo milled into a back
   * panel actually reads -- it is the same material catching light differently,
   * not a printed white shape. The Fold authors its logo as a 0.84 grey, which
   * against a black finish came out as a bright white sticker.
   */
  logoMaterials?: string[];
  /**
   * The colour those marks render at.
   *
   * A fixed light grey rather than a tint of the finish: an etched logo is the
   * same anodised grey whatever colour the body is, and following the finish
   * would make it vanish on a light one.
   */
  logoColor?: string;
  /**
   * Derive the mark's colour from the finish, darkened by this fraction.
   *
   * Overrides `logoColor` where set, and it is the better model for a logo
   * milled INTO a coloured panel rather than printed onto it: on Apple's own
   * render the mark is the body's colour a step darker, because the recess
   * catches less light -- not a grey, and emphatically not a white. A stated
   * hex cannot express that, since it has to be right in all eight finishes.
   */
  logoDarken?: number;
  /**
   * Materials the finish must not touch at all.
   *
   * The finish pass assumes every opaque material is body, which holds on a
   * model with a handful of materials and stops holding on a detailed one.
   * Apple's iPhone 17 Pro has 64: the lens barrels, the LiDAR window and the
   * mic port are all authored dead black, and tinting them washed the whole
   * camera module the colour of the phone -- the LiDAR window in particular
   * went from a solid black disc to an orange one with a faint outline.
   *
   * An opt-out rather than a rule about dark materials, because the same
   * assumption is load-bearing for the simpler models already here: a black
   * lens ring on those is body-coloured trim that happens to be dark, and
   * exempting it globally would stop it following the finish.
   */
  keepMaterials?: string[];
  /**
   * Explicit colours for named materials, overriding the finish.
   *
   * `keepMaterials` covers parts a model already authored correctly. This is
   * the opposite case: parts the model authored as BODY that are not body on
   * the real hardware. Apple ships each phone in one colour, so the speaker
   * grille, the port shell and the screw heads all carry the body tint in the
   * file -- and following it paints a blue grille onto a blue phone, where the
   * real device has dark openings whatever the finish.
   *
   * A fixed colour rather than a tint of the finish, for the same reason
   * `logoColor` is fixed: a mic port is black on every iPhone ever made.
   *
   * Only the colour is replaced. The maps, metalness and roughness the model
   * shipped are what make a grille read as a grille.
   *
   * The long form adds an opacity, for a part that is a pane rather than a
   * surface -- a back glass laid over the body is a sheet you see the finish
   * through, not a painted panel.
   */
  materialColors?: Record<string, MaterialOverride>;
  /**
   * The same, keyed by MESH name rather than material name.
   *
   * Needed where one material is shared by parts that are not alike. The USB-C
   * port is the case: its rim and the connector tongue deep inside it are both
   * `nwfiSfJrPZRLBAj`, so darkening the tongue by material would darken the
   * rim with it -- and the rim is body-coloured on the real phone.
   *
   * Checked before `materialColors`, since naming a single mesh is always the
   * more specific statement.
   */
  meshColors?: Record<string, MaterialOverride>;
  /**
   * Materials whose base-colour map is dropped, leaving a flat finish colour.
   *
   * Some panels are authored as a painted gradient rather than as a surface
   * the renderer lights. Apple's back glass is one: a 1024x1024 map holding a
   * top-to-bottom fade that its own renderer resolves smoothly and this one
   * does not -- retinting it to a new finish compresses the fade into a
   * handful of 8-bit steps and it reads as horizontal banding.
   *
   * Dropping the map is the honest fix rather than a workaround. The gradient
   * is baked lighting; the studio has real lighting of its own, and a flat
   * panel lit by it is closer to the hardware than a painted fade lit twice.
   */
  plainMaterials?: string[];
  /**
   * How strongly an etched mark shows, 0..1. Default 1.
   *
   * Real alpha rather than a colour mix, because the mark sits over a panel
   * whose own shading varies: blending toward one flat body colour would leave
   * the logo visibly lighter than its surroundings at one end and darker at
   * the other.
   */
  logoOpacity?: number;
  /**
   * The finish ids this device actually ships in, in order.
   *
   * Omit for anything that is not a specific colourway -- the Fold and the
   * image card take the whole list. Naming them is what stops an iPhone Air
   * being offered in Cosmic Orange, which is a colour it does not come in.
   *
   * The first entry is what the device falls back to when the current finish
   * is not one it offers, which is every time you switch between two devices
   * with different lineups.
   */
  finishIds?: string[];
  /**
   * Whole cameras the source model does not ship.
   *
   * Apple's own design-resource files are not uniformly detailed. The iPad
   * Pro's wide camera is built from eight meshes -- rim, cover glass, dark
   * glass, and a stack of tiny elements down the barrel -- while the
   * ultra-wide beside it is a single filled disc standing in for all of it. It
   * reads as a black hole punched in the bump.
   *
   * The second camera is COPIED from the first rather than authored. Building
   * one by hand means guessing a radius, a wall, a material, a roughness and a
   * metalness for every part, and every one of those guesses sits a centimetre
   * from the real thing where the eye can compare them directly. Copying gets
   * all of them right by construction, and stays right if the model is ever
   * reconverted with different textures or tolerances.
   *
   * Which meshes make up a camera is not listed here, because a list would go
   * stale the moment the file changed. It is read off the model: everything
   * lying inside the rim's outer circle is part of that camera and everything
   * else is not. On this file the split is unambiguous -- eight meshes within
   * 5.40mm of the rim's centre, and the next nearest thing 9.67mm out.
   */
  cameraCopies?: {
    /**
     * The rim of a complete camera on this model. The circle it encloses is
     * what decides which meshes belong to that camera.
     */
    from: string;
    /**
     * The stand-in the copy replaces. It sets the position only -- the copy
     * is full size, because a stand-in disc is something somebody drew rather
     * than a measurement, and two lenses on one device are the same lens.
     * Hidden once the real assembly stands in its place.
     */
    onto: string;
  }[];
  /** Licence + author. Required for anything that ships. */
  credit: string;
}

/**
 * The side rail: satin brushed aluminium, not a mirror.
 *
 * It was a mirror, taken from the Air, and against Apple's own crops of the 17
 * that is plainly wrong -- theirs is a soft anodised sheen with a broad
 * highlight, where ours threw a hard specular line and read as chrome trim. A
 * polished rail also turned gold on the sage finish, which is how the antenna
 * bands were finally tracked down.
 *
 * Metalness stays high because it IS aluminium. Roughness is what changed.
 */
const RAIL = {
  lighten: 0.05,
  saturate: 1.25,
  metalness: 0.85,
  roughness: 0.35,
  envMapIntensity: 1,
} as const;

/**
 * The camera rings: polished, and the only part of the trim that is.
 *
 * These were on the rail treatment because a rail and a ring are one material
 * on the Air. On the 17 they are not, and keeping them together would be a
 * loss either way: the rings are the brightest thing on the back, and matting
 * them to match the rail flattens the lenses into the bump.
 */
const RING = {
  lighten: 0.06,
  saturate: 1.9,
  metalness: 1,
  roughness: 0.05,
} as const;

/**
 * The back glass: glossy, where the finish leaves it half matte.
 *
 * A finish sets one roughness for the whole device, and a phone is two
 * materials -- aluminium around glass -- so one number cannot serve both. The
 * rail takes the finish's value; the back states its own.
 *
 * `lighten: 0` is not a no-op. It is what puts the finish COLOUR on a material
 * whose surface is being stated: with no colour key the override sets gloss
 * and leaves the authored white in place.
 */
const BACK_GLASS = {
  lighten: 0,
  metalness: 0,
  roughness: 0.1,
  envMapIntensity: 1.4,
} as const;

/**
 * The camera plateau: one piece of coloured glass, on every finish.
 *
 * Set on sliders against Apple's own crop rather than derived, because the
 * plateau's look comes from translucency, tint and gloss interacting across
 * four stacked meshes and no single one of them can be reasoned about alone.
 * Four separate corrections each fixed the wrong mesh before it went on a
 * panel.
 *
 * Two of these are worth reading twice. `roughness: 0` is a true mirror --
 * anything above it and the bump goes back to reading as paint, which is what
 * every earlier attempt looked like. And `saturate: 1.7` is what separates the
 * plateau from the back, NOT a step in lightness: a coloured pane over a lit
 * surface deepens the colour it passes, so `shade` sits at almost nothing.
 *
 * One value for the whole lineup, unlike the speaker grille -- this one holds
 * because it is a property of glass rather than an illusion standing in for
 * geometry the file does not have.
 */
const PLATEAU = {
  darken: 0.02,
  saturate: 1.7,
  opacity: 0.74,
  roughness: 0,
  metalness: 0,
  envMapIntensity: 1.9,
} as const;

/**
 * The antenna band: matte, where the rail it interrupts is a mirror.
 *
 * How it was finally identified: it rendered GOLD. Nothing in this file is
 * gold, and nothing in the finish lineup is either -- what produces gold is
 * `RAIL` on a sage phone, where metalness 1 at roughness 0.05 turns a
 * yellow-green body into a mirror and the studio comes back off it as
 * chrome. So the band had to be a mesh on the rail treatment, and only two
 * are band-shaped.
 *
 * Deliberately narrower than the first attempt at this, which also matted a
 * 116.8mm strip running nearly the length of the phone and changed the whole
 * side rather than a line across it.
 *
 * Fully matte -- metalness 0, roughness 1, and almost none of the environment.
 * Half measures do not work on a band this narrow: at roughness 0.7 it still
 * caught enough of the rig along its length to read as a polished sliver,
 * because a 0.4mm strip is nearly all edge and an edge finds a highlight at
 * almost any angle.
 *
 * Lighter than the rail, not matched to it. Apple's crops of the 17 show the
 * band clearly paler than the aluminium either side -- it was set near the
 * body colour on the assumption the difference was finish alone, and it is
 * both.
 */
const ANTENNA = {
  lighten: 0.45,
  saturate: 0.5,
  metalness: 0,
  roughness: 1,
  envMapIntensity: 0.25,
} as const;

const MODELS = "/figma-assets/mockup-studio/models";

export const DEVICES: Device[] = [
  /*
   * ------------------------------------------------------------------------
   * Apple's own models
   * ------------------------------------------------------------------------
   *
   * Both come out of a single `iphone-17-pro-e-sim.usdz` from Apple's design
   * resources, which is an ASSEMBLY of two components laid out side by side --
   * converting the file whole produces one 109 x 163 mm object that is two
   * phones. `scripts/usdz-to-glb.mjs --root <prim>` lifts one out.
   *
   * Every prim name in the file is obfuscated, which is why `screenMaterial`
   * below is a hash rather than something like "OLED". It was identified by
   * geometry: of the four stacked panes on the front, this is the innermost
   * and its aspect (2.1648 / 2.1660) is the closest match to the real panels
   * (1206x2622 = 2.1741, 1320x2868 = 2.1727). Do not "tidy" it -- the name is
   * what the file says.
   */
  {
    id: "apple-iphone-17",
    label: "Apple iPhone 17",
    modelPath: `${MODELS}/m-3463a6858cfef1fd.glb`,
    hideHints: [],
    /*
     * 66.5 x 144.9mm, aspect 0.4587 against 1206 x 2622's 0.4600.
     *
     * Cross-checks against the hardware rather than just against itself: a
     * 6.3-inch panel at 460ppi is 66.6 x 144.8mm, so the mesh is within two
     * tenths of a millimetre on both axes.
     */
    screenMaterial: "iqSsZrznlbGUhNs",
    /*
     * The surfaces that ARE the finish -- an allow-list, so a material nobody
     * classified keeps what Apple authored instead of being painted.
     *
     * The deny-list version of this was wrong in a way that showed: the back
     * glass is `KChxKESNhKjaHJY` and `NWVRqxSZYCCnuGM`, both TEXTURED, and the
     * rule that kept anything textured kept them. So the rails and the camera
     * plateau followed the finish while the back stayed the lavender the file
     * shipped in, and switching colour gave a two-tone phone that Apple does
     * not sell.
     */
    finishMaterials: [
      // The back shell, the rails, and the panels between them.
      "SSCOTROIPktOHPN",
      "sWPfdEwNBQxWmmj",
      "QHnEMQTzosCQTsD",
      "qctyujhTxZaVOMy",
      "ttTjynsjERFvYxa",
      "lBQHEyACJPuljkC",
      // The back glass. Textured, which is what hid them.
      "KChxKESNhKjaHJY",
      "NWVRqxSZYCCnuGM",
      // The camera plateau and its rings.
      // The plateau shell itself. Textured like the back glass, and hidden by
      // the same rule: 25.0 x 42.5mm at z 3.8..5.8, which is the bump.
      "botRksrkmicTufW",
      "GSJgRpZoabPIkha",
      "ThlRTlIfGAMlfQi",
      "BZMPiKcUUzPQcpW",
      "TeFnKcOBMBwAIln",
      "kqZbamRFCmYvdWV",
      "EbFQbFEYKgUZRPQ",
      "oKEipclYWPpUKiP",
    ],
    /*
     * `NWVRqxSZYCCnuGM` is declared `alphaMode: "BLEND"` over a fully opaque
     * colour -- the converter carries the blend flag from an opacity map it
     * cannot carry itself -- so three marks it transparent and the finish pass
     * would hand it to the glass branch, which never touches colour. Naming it
     * body is what gets it past that.
     */
    bodyMaterials: ["NWVRqxSZYCCnuGM"],
    /*
     * The two back-glass panels, flattened.
     *
     * Their maps are not body-colour maps -- they are detail masks over a
     * white factor, so running them through `recolorBodyTexture` multiplies
     * the finish by a mostly dark image and the panel comes out near-black.
     * Dropping them and letting the finish fill flat is correct here.
     *
     * `botRksrkmicTufW`, the plateau shell, is the third and was the reason
     * the bump would not take the body colour however it was tuned: a stated
     * colour MULTIPLIES the base map, so its own dark detail map was sitting
     * over every value the sliders produced. No amount of shade or saturation
     * reaches past a map -- the map has to go.
     *
     * Removing this line was tried, to stop the camera plateau flattening
     * along with the glass, and it cost more than it bought. The plateau has
     * its own mesh (`botRksrkmicTufW`) and its own entry below, which is the
     * right place to give it back its depth.
     */
    plainMaterials: ["KChxKESNhKjaHJY", "NWVRqxSZYCCnuGM", "botRksrkmicTufW"],
    /*
     * What this file is: the back shell states linear 0.631/0.533/0.750, which
     * is #d0c1e1 -- Lavender. Any textured body material is recoloured from
     * here rather than multiplied by the finish.
     */
    /*
     * The file's own shell colour, which is NOT the Lavender swatch: #d0c1e1
     * against Apple's published #e6d5f1. This value exists to tell
     * `recolorBodyTexture` what hue the maps were painted in, so it must stay
     * the model's, not the swatch's.
     */
    authoredBodyColor: "#d0c1e1",
    /*
     * The camera plateau and the rails, as offsets from the finish -- the same
     * treatment the Air gets, and derived the same way rather than dialled by
     * eye: each is the panel's authored lightness and saturation measured
     * against the back shell's in sRGB, inverted through `shiftLightness`. So
     * Lavender reproduces the file exactly, and Sage and Black keep the same
     * relationships in their own colour.
     */
    /*
     * The two body shells that form the side wall, named by MESH.
     *
     * Their material `eqbTxKzrzIFoAVn` is authored black and used on eleven
     * meshes -- the front bezel, the camera internals and these. Naming the
     * material would blacken the rail or lighten the lens barrels depending on
     * which way it was set; naming the mesh reaches exactly the two that are
     * the outside of the phone.
     *
     * Given the Air's rail treatment, not a dark offset: a rail is a mirror,
     * and what that lighten really sets is how dark the REFLECTIONS come back.
     */
    meshColors: {
      GMafcrtCzpsZpsb: RAIL,
      CpxQiFcpQUiESUC: RAIL,
      /*
       * The pad the lenses sit in -- 19.6 x 37.0mm. By mesh, because
       * `KChxKESNhKjaHJY` is also the whole back panel, and the back is a soft
       * frosted glass where this is polished.
       */
      jefwjNZicFpvTUO: PLATEAU,
    },
    /*
     * The Air's treatment, role for role.
     *
     * The 17 had been given a set of offsets measured off its own file, which
     * reproduces the Lavender it shipped as and is not the same thing as
     * looking right. Three of those were structurally wrong, and the Air --
     * which has been through this -- had all three the other way round:
     *
     *  - the RAIL was a desaturated dark step, which paints trim onto a phone
     *    whose rail is polished metal;
     *  - the LOGO was lifted, when it is milled INTO the glass and so catches
     *    less light than the panel, not more;
     *  - the BACK sat at the finish exactly, with nothing to separate it from
     *    the rail.
     */

    materialColors: {
      /*
       * The back glass, a step above the rail.
       *
       * The lift is proportional to the headroom left (`l + (1 - l) * amount`)
       * so a dark finish gets a bigger absolute step than a light one from the
       * same number -- which is what lets one value work across all five.
       */
      /*
       * The back shell, and the reason the last two attempts at this changed
       * nothing on screen.
       *
       * An override sets COLOUR and returns; the model's own metalness and
       * roughness survive it. This mesh is authored metalness 1, roughness 1
       * -- a dead-matte metal -- and it had only `{ lighten: 0.1 }`, so every
       * gloss set on the panels around it landed behind a surface that
       * scatters everything. The three back-facing panels sit at zmax 5.76,
       * 3.84 and 3.62, and this is the middle one: outside the sheet I had
       * been making glossy, and the one actually being looked at.
       *
       * The lift is kept; the surface is now stated with it.
       */
      SSCOTROIPktOHPN: { ...BACK_GLASS, lighten: 0.1 },
      KChxKESNhKjaHJY: BACK_GLASS,
      NWVRqxSZYCCnuGM: BACK_GLASS,
      /*
       * The camera plateau, a shade under the back.
       *
       * Both directions have now been tried and the darker one is right on
       * this phone, where it was the lighter one on the Air. The difference is
       * the geometry: the Air's pad is a flat inlay level with the glass and
       * catches the room like the glass does, while this is a raised pill with
       * a curved shoulder, and a curve turned away from a top light reads
       * darker than the flat panel it rises out of, not brighter.
       *
       * The surface is stated because the model gets it wrong: this mesh is
       * authored at roughness 1, fully matte and fully opaque, and the plateau
       * is GLASS -- the same continuous piece as the back on the real phone.
       * No amount of colour fixes that, which is why every value tried here
       * read as paint. What makes it glass is the gloss, the reflection and
       * the translucency, not the shade.
       *
       * Saturated up rather than darkened, because a coloured pane over a
       * lit surface deepens the colour it passes; that is what separates the
       * bump from the back, not a step down in lightness.
       *
       * The pad over it (`oKEipclYWPpUKiP`) needs none of this: the file
       * already authors that one at roughness 0.1 and 25% alpha, and an
       * override sets colour and leaves the surface alone.
       */
      botRksrkmicTufW: PLATEAU,
      /*
       * The surround around each lens -- 13.8mm, and the thing that was
       * actually dark.
       *
       * Authored #393939 and kept, so it stayed near-charcoal in every finish.
       * Two of them sit stacked with the lenses, and together they form the
       * peanut-shaped dark field that filled the plateau: every attempt at
       * lightening the plateau missed because the plateau was not what was
       * dark.
       *
       * Translucent tinted glass rather than a lighter opaque grey. It is part
       * of the same cover as the plateau, and what it does on the hardware is
       * let the dark barrel beneath show through a coloured pane -- so the
       * body colour reads across the whole bump and the lenses still sit in
       * something deeper than the back.
       */
      wiybngYOfUNIZCW: PLATEAU,
      /*
       * The Apple mark -- 15.7 x 19.3mm at dead centre of the back, which is
       * how it was found after being filed with the camera rings.
       *
       * Darker, not lighter, and the same 0.12 as the Air: it is milled into
       * the glass, so it catches less light than the panel around it and reads
       * as etched rather than as printed.
       */
      TeFnKcOBMBwAIln: { darken: 0.12 },
      EbFQbFEYKgUZRPQ: { darken: 0.12 },
      // The rail, and the camera rings that match it on the real phone.
      sWPfdEwNBQxWmmj: RAIL,
      GSJgRpZoabPIkha: RING,
      /*
       * The two antenna bands: 38.00 x 0.09mm and 15.32 x 0.40mm, both at
       * y = -74.8. A line four tenths of a millimetre across is a cut through
       * the rail, not a part of it.
       */
      ThlRTlIfGAMlfQi: ANTENNA,
      BZMPiKcUUzPQcpW: ANTENNA,
      qctyujhTxZaVOMy: { darken: 0.06, saturate: 0.4 },
      /*
       * The pad over the plateau, matched to it.
       *
       * This took the Air's stated lens-coating violet for a while, on the
       * assumption it was the same part. It is not: on the Air that material
       * is a narrow ring around the glass, and here it is a 19.6 x 37.0mm
       * sheet covering the WHOLE plateau top -- so a saturated violet at 25%
       * alpha washed the entire bump purple instead of tinting a lens.
       *
       * Same step as the plateau underneath, so the two read as one surface.
       */
      oKEipclYWPpUKiP: PLATEAU,
      // Small parts flush with the rail, kept on their measured offsets.
      QHnEMQTzosCQTsD: { darken: 0.05, saturate: 0.31 },
      ttTjynsjERFvYxa: { darken: 0.08, saturate: 0.57 },
      lBQHEyACJPuljkC: { darken: 0.08, saturate: 0.57 },
      kqZbamRFCmYvdWV: { darken: 0.06, saturate: 1.09 },
    },
    /*
     * Apple's own lineup for this phone. Lavender first because it is what
     * the file ships as -- the body states linear 0.631/0.533/0.750, which is
     * the Lavender swatch exactly, so the model opens in its authored colour
     * rather than jumping to something else on load.
     */
    finishIds: [
      "lavender",
      "sage",
      "mist-blue",
      "iphone17-white",
      "iphone17-black",
      "iphone17-burgundy",
      "iphone17-sky-blue",
    ],
    screenFlipY: true,
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 1,
    screenNative: { width: 1206, height: 2622 },
    notch: null,
    /*
     * Converted with `--rotate-y 180`, no flattening needed. 72.3 x 149.8 x
     * 11.4mm against Apple's 71.5 x 149.6 x 7.95 -- the extra depth is the
     * camera plateau, which the published figure excludes.
     */
    credit: "Apple — design resources (iphone-17-e-sim.usdz)",
  },
  {
    // A Blender re-export of Apple's iPhone 17 Pro (supplied as "test 4.glb",
    // tuned as TEST 4, now the 17 Pro itself). Blender suffixed every part name (".004", ".008"…), and
    // parts are matched by name — so each name here is the suffixed copy.
    id: "apple-iphone-17-pro",
    label: "Apple iPhone 17 Pro",
    /*
     * Turned to face the camera. The stage's default yaw shows this file's
     * back, and the screen is the side worth opening on.
     */
    modelYawDeg: 180,
    // A new filename, not the old one reused: `public/` is served immutable for
    // a year, so browsers that had the previous 17 Pro kept loading it under
    // this entry's part names, which it does not have.
    modelPath: `${MODELS}/m-54874f8214482e51.glb`,
    hideHints: [],
    // The LiDAR window sat at the bottom of its barrel, 1.2mm inside the body
    // while the flash beside it is flush. Brought up to the barrel's rim, level
    // with the flash cover (z -0.0068; the back faces -z).
    meshNudges: { CUXydfOmpZTOIwn: [0, 0, -0.0012] },
    finishIds: [
      "cosmic-orange",
      "deep-blue",
      "silver",
      "pro-burgundy",
      "pro-sky-blue",
    ],
    screenMaterial: "BsXHDwLKqtDOfrW.004",
    authoredBodyColor: "#e47a44",
    plainMaterials: ["SMUhrjUPCjJkPUK.008"],
    bodyMaterials: ["PJgHvfOhNXkxvzq.004", "iAKEWdNafBldSCV.004"],
    materialColors: {
      "YQFhPSFSryEqJMp.012": "#0d0d0f",
      "edDerJJLuuabITp.012": "#0d0d0f",
      // Surfaces tuned by eye on the Surface bench and locked here.
      // The frame.
      "SLmJkLdkhbbuEfG.032": {
        // `lighten: 0` is the finish colour itself. An override with only
        // surfaces keeps the file's orange whatever finish is picked.
        lighten: 0,
        roughness: 0.76,
        metalness: 0.61,
        envMapIntensity: 1.65,
      },
      // The back glass, as it was before the bench.
      "SMUhrjUPCjJkPUK.008": {
        lighten: 0.07,
        roughness: 0.14,
        metalness: 0,
        envMapIntensity: 2.6,
      },
      // The antenna bands.
      "sJxAokqqlZYuwzy.008": { lighten: 0, roughness: 0.52, metalness: 0.08 },
      "yPEFElLJTRhfWfw.004": { darken: 0.12 },
      "awYxKfiOpRgQIxD.004": { darken: 0.12 },
    },
    meshColors: {
      "IvdeSiYDweqsnZm.004": "#0d0d0f",
      "RhBESHcBbtHIQyo.004": "#0d0d0f",
      "yTmdRacfvebHTTS.004": "#101013",
    },
    keepMaterials: [
      "uFgsppDNoPNkBqW.060",
      "nypJRzXNHbmJCqR.012",
      "ieDmCkHnOnSIOcm.004",
      "ieDmCkHnOnSIOcm.006",
      "LqxrKBoiOXSOFqs.008",
      "JKTmNomFyvfvVAj.012",
      "QEOvfSZiwySWiUk.004",
    ],
    // No screenFlipY, unlike the 17 Pro: Blender's glTF export already writes
    // the screen UVs top-down; the USDZ conversion behind the 17 Pro did not.
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 1,
    screenNative: { width: 1206, height: 2622 },
    notch: null,
    credit: "Apple — design resources, re-exported from Blender",
  },
  {
    /*
     * The same 17 Pro, held.
     *
     * One file: a hand and the phone it is holding, so the "device" the studio
     * poses and fits is the pair of them. Every tuned surface carries over
     * unchanged because it IS the same export -- Blender just suffixed this
     * copy's parts three higher (".032" became ".035"), so the names below are
     * the 17 Pro's with that shift applied.
     *
     * The hand itself is a single mesh on an UNNAMED material, which is what
     * keeps the finish pass off it: every rule here matches by name, so there
     * is nothing for the repaint to catch hold of. It stays the colour it was
     * authored whichever finish is picked, which is what you want -- the
     * finish is the phone's, not the skin's.
     */
    id: "apple-iphone-17-pro-hand",
    label: "iPhone 17 Pro in hand",
    // Same file, same correction as the 17 Pro: it opens on its back.
    modelYawDeg: 180,
    modelPath: `${MODELS}/m-e1abbe683597d9ea.glb`,
    hideHints: [],
    // As on the 17 Pro: the LiDAR window sits 1.2mm down its barrel.
    meshNudges: { CUXydfOmpZTOIwn003: [0, 0, -0.0012] },
    finishIds: [
      "cosmic-orange",
      "deep-blue",
      "silver",
      "pro-burgundy",
      "pro-sky-blue",
    ],
    screenMaterial: "BsXHDwLKqtDOfrW.007",
    authoredBodyColor: "#e47a44",
    plainMaterials: ["SMUhrjUPCjJkPUK.011"],
    bodyMaterials: ["PJgHvfOhNXkxvzq.007", "iAKEWdNafBldSCV.007"],
    materialColors: {
      "YQFhPSFSryEqJMp.015": "#0d0d0f",
      "edDerJJLuuabITp.015": "#0d0d0f",
      // The frame, the back glass and the antenna bands, at the values tuned
      // on the Surface bench for the 17 Pro.
      "SLmJkLdkhbbuEfG.035": {
        lighten: 0,
        roughness: 0.76,
        metalness: 0.61,
        envMapIntensity: 1.65,
      },
      "SMUhrjUPCjJkPUK.011": {
        lighten: 0.07,
        roughness: 0.14,
        metalness: 0,
        envMapIntensity: 2.6,
      },
      "sJxAokqqlZYuwzy.011": { lighten: 0, roughness: 0.52, metalness: 0.08 },
      "yPEFElLJTRhfWfw.007": { darken: 0.12 },
      "awYxKfiOpRgQIxD.007": { darken: 0.12 },
    },
    meshColors: {
      IvdeSiYDweqsnZm005: "#0d0d0f",
      RhBESHcBbtHIQyo003: "#0d0d0f",
      yTmdRacfvebHTTS028: "#101013",
    },
    keepMaterials: [
      /*
       * The hand and the forearm, left exactly as the file authored them.
       *
       * This export carries real skin: a 2K colour map and a 2K roughness map
       * each, with nails and knuckles in them. Nothing here should touch that
       * -- the finish is the phone's, and a repaint would drag the skin along
       * with it, which is what happened to the first hand when it arrived
       * with no material at all.
       */
      "Skin.001",
      "Skin.002",
      "uFgsppDNoPNkBqW.063",
      "nypJRzXNHbmJCqR.014",
      "ieDmCkHnOnSIOcm.008",
      "LqxrKBoiOXSOFqs.011",
      "JKTmNomFyvfvVAj.015",
      "QEOvfSZiwySWiUk.007",
    ],
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 1,
    screenNative: { width: 1206, height: 2622 },
    notch: null,
    credit: "Apple — design resources, re-exported from Blender",
  },
  {
    id: "apple-iphone-17-pro-max",
    label: "Apple iPhone 17 Pro Max",
    modelPath: `${MODELS}/m-432f2a96ef902e9c.glb`,
    hideHints: [],
    finishIds: [
      "cosmic-orange",
      "deep-blue",
      "silver",
      "pro-burgundy",
      "pro-sky-blue",
    ],
    screenMaterial: "BsXHDwLKqtDOfrW",
    /*
     * Apple ships these in Cosmic Orange, and the back glass is a solid
     * 1024x1024 panel of it -- measured srgb(228,122,68) off the converted
     * texture, not guessed. Without this the finish swatches change the body
     * factor and leave the atlas alone, so every finish rendered as an orange
     * back with a differently coloured rail: `recolorBodyTexture` matches
     * texels by HUE against this value, and with nothing to match against it
     * has nothing to do.
     *
     * Deliberately not the #e8712e on the Pro Max entry below. That is a
     * different asset by a different author and its orange is its own; taking
     * one model's authored colour as another's would put the hue window in the
     * wrong place and half-retint the body.
     */
    authoredBodyColor: "#e47a44",
    /*
     * The Apple logo, as two coplanar layers.
     *
     * Both have to be named. `tintMaterial` treats any transparent material
     * as glass and leaves its colour alone -- correct for a lens cover, wrong
     * here -- so greying only the opaque layer left the translucent one
     * sitting over it and the logo stayed Cosmic Orange on a deep blue phone.
     * Whichever layer is missed is the one you end up looking at.
     */
    /*
     * The logo is deliberately NOT in `logoMaterials`.
     *
     * That path exists for a mark printed on a panel: it forces a flat colour,
     * roughness 0.55 and a quarter of the environment, which is right for a
     * silkscreen and wrong for this. Apple mills its logo INTO the glass and
     * models it as two shells 0.4mm apart, the front one clearcoated at
     * roughness 0.1 -- and that gloss is the whole reason the mark has an edge
     * highlight and reads as a recess rather than a sticker.
     *
     * Colouring it through `materialColors` instead leaves every one of those
     * surface properties as Apple authored them, and changes only the hue. The
     * depth was in the model all along; the etched-mark treatment was flattening
     * it out.
     */
    /*
     * The back glass, flattened.
     *
     * Its map is a painted vertical gradient, and retinting a gradient to a
     * new finish is what put horizontal bands down the back of the phone --
     * the retint mixes most of the way to a flat colour, which leaves the fade
     * only a few 8-bit levels to live in. Flat, lit by the studio's own rig,
     * is both cleaner and closer to the real panel.
     */
    plainMaterials: ["SMUhrjUPCjJkPUK"],
    /*
     * The Camera Control button, same story: `iAKEWdNafBldSCV` is opaque and
     * already takes the finish, `PJgHvfOhNXkxvzq` is 70% and was reading as
     * glass. Forced to body so the rail matches the phone it is set into.
     *
     * Only the translucent layers need naming -- the opaque ones are tinted
     * anyway -- but the pair is listed together because they are one control,
     * and a later reader should not have to rediscover why one of two
     * identically-placed materials is here and the other is not.
     */
    bodyMaterials: ["PJgHvfOhNXkxvzq", "iAKEWdNafBldSCV"],
    /*
     * Everything Apple authored dead black: the three lens barrels, the LiDAR
     * window, the mic port and the inner front pane. Found by reading the
     * converted materials rather than by eye -- these are the six whose base
     * colour is rgb(0,0,0), minus the screen, which the screen pass owns.
     */
    /*
     * The one part of the bottom edge that is not body-coloured.
     *
     * The speaker grille and the screw heads were overridden here too at one
     * point and should not be: on the real phone those ARE the finish, and
     * what makes them read is their own mesh texture and the shadow in their
     * recess, not a different colour.
     */
    materialColors: {
      /*
       * Inside the USB-C shell, and only inside it.
       *
       * The port is a stack: `nwfiSfJrPZRLBAj` is the 9.0 x 4.4mm rim, and
       * these two sit within it -- the 8.4mm inner wall and the 9.9mm shield.
       * Apple's own render of this phone shows a body-coloured rim around a
       * black cavity, so darkening the rim as well, which an earlier pass did,
       * closed the opening up and lost the depth entirely.
       *
       * The deeper `nwfiSfJrPZRLBAj` pieces at 6.7 and 5.8mm are deliberately
       * left alone: those are the connector tongue, and it really is
       * body-coloured down there.
       */
      YQFhPSFSryEqJMp: "#0d0d0f",
      edDerJJLuuabITp: "#0d0d0f",
      /*
       * The back glass, as a half-clear white sheet over the body.
       *
       * It is in `plainMaterials` as well, so the painted gradient map is
       * dropped first -- white multiplied by that map would put the banding
       * straight back. What is left is a flat pane, and at 50% the finish
       * beneath reads through it exactly as glass over anodised metal does.
       */
      /*
       * The back glass: the body's colour, lifted.
       *
       * Not a stated hex and not a white sheet -- either would look right in
       * one finish and wrong in the rest. On the real phone the glass panel
       * IS the anodised colour, just brighter, because a polished surface
       * returns more of the light that a matte rail scatters. Deriving it from
       * the finish keeps that true across all eight swatches.
       *
       * It is in `plainMaterials` too, so the painted gradient is dropped
       * first and this lands on a flat panel rather than multiplying a fade.
       */
      SMUhrjUPCjJkPUK: {
        lighten: 0.07,
        /*
         * Surface stated, so the panel actually reflects the studio.
         *
         * Roughness 0.14 is polished glass rather than the anodised rail
         * beside it, and it is what makes the rig read across the back as a
         * soft sweep instead of an even fill. The environment is pushed above
         * the body's 2.1 because a back panel is the flattest, most mirror-
         * like surface on the phone and takes the most sky.
         *
         * Non-metal on purpose: this is glass over metal, not metal. Raising
         * metalness would tint every reflection with the body colour and the
         * panel would go coppery in the highlights instead of white.
         *
         * The model's normal map survives all of this -- only the BASE map is
         * dropped -- so the fine anodised grain still breaks the reflection up
         * rather than leaving a mirror.
         */
        roughness: 0.14,
        metalness: 0,
        envMapIntensity: 2.6,
      },
      /*
       * The two logo shells, the body's colour a step darker.
       *
       * Both, because the front one is 50% opaque and sits over the back one:
       * colouring only the opaque layer leaves the translucent shell tinted as
       * the file authored it. Their own alpha is left alone -- glass over
       * glass is what gives the mark its depth.
       */
      yPEFElLJTRhfWfw: { darken: 0.12 },
      awYxKfiOpRgQIxD: { darken: 0.12 },
    },
    /*
     * The connector tongue and the two shells around it.
     *
     * All three share `nwfiSfJrPZRLBAj` with the port's outer rim, which is
     * why they are named as MESHES: by material they cannot be told apart, and
     * the rim has to stay body-coloured.
     */
    meshColors: {
      IvdeSiYDweqsnZm: "#0d0d0f",
      RhBESHcBbtHIQyo: "#0d0d0f",
      yTmdRacfvebHTTS: "#101013",
    },
    keepMaterials: [
      "uFgsppDNoPNkBqW",
      "nypJRzXNHbmJCqR",
      "CVcxUAKakDuRdCf",
      "ieDmCkHnOnSIOcm",
      "LqxrKBoiOXSOFqs",
      /*
       * Dark, but not dark enough to have been caught by reading the model for
       * pure black. Each of these sits IN FRONT of one that was: the LiDAR
       * window's visible face is #333333 over a black backing, and the lens
       * barrel's is #393939 -- so exempting only the black layers left the
       * orange one on top, which is the layer you actually see.
       */
      "jKYrqbVsPDbEaqj",
      "JKTmNomFyvfvVAj",
      // The flash. Near-white, and tinting it made the phone look like it had
      // an orange bulb.
      "QEOvfSZiwySWiUk",
    ],
    /*
     * V only.
     *
     * Reasoned wrong the first time and worth recording: the screenshot
     * arrived looking upside down AND reversed, which reads as a 180 degree
     * turn, so both flips went on. That produced an upright but left-right
     * mirrored screen -- meaning the original error had been `flipY` alone,
     * and `flipX` was adding a mirror rather than removing one. A vertical
     * mirror of a page of text looks reversed too, which is what made the two
     * cases hard to tell apart by eye.
     */
    screenFlipY: true,
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 1,
    screenNative: { width: 1320, height: 2868 },
    notch: null,
    /*
     * Converted with `--rotate-y 180`.
     *
     * The two phones face OPPOSITE ways in Apple's layout, and the studio's
     * default pose assumes a screen facing -Z -- which is why the editor opens
     * at yAxis 180. Without the yaw this one opened on its camera bump. The
     * turn is baked into the geometry rather than carried as a per-device
     * offset: it is a fact about the file, not a setting anyone downstream
     * should have to know.
     *
     * Measured 79.0 x 162.9 mm against Apple's published 78.0 x 163.4.
     */
    credit: "Apple — design resources (iphone-17-pro-e-sim.usdz)",
  },
  /* =========================================================================
     The 18s and the Duo.

     Converted from Apple's USDZ rather than shipped as GLB, which is why the
     credits name a usdz and the pipeline is worth recording: `usdcat --flatten`
     to text USD (three cannot read the binary `.usdc` inside a usdz at all),
     textures unzipped beside it with their package-syntax references rewritten,
     then three's own loader and exporter with sharp standing in for the canvas.

     The two Pros came out of ONE archive that holds both phones side by side —
     73 x 150mm and 79 x 163mm, at x +19 and -15 — so each was split out by
     subtree and recentred. A model 19mm off the origin is 19mm off in every
     shot taken with it.

     NOT tuned the way the 17s are. Those entries carry `materialColors`,
     `meshColors` and `keepMaterials` lists worked out by reading each model;
     these have the screen and the finishes and nothing else yet, so the body
     retint is whatever the finish's three numbers do unaided. That is the next
     pass, not a reason to hold the devices back.
     ========================================================================= */
  {
    id: "apple-iphone-18-pro",
    label: "Apple iPhone 18 Pro",
    modelPath: `${MODELS}/m-4e890183b312676b.glb`,
    hideHints: [],
    // The archive's own variant data names these three, which is also where
    // Burgundy came from — a real colour on this device rather than a guess.
    finishIds: [
      "iphone18-black",
      "iphone18-burgundy",
      "iphone18-sky-blue",
      "iphone18-silver",
    ],
    /*
     * The single flat black panel at the front face: one mesh, 96.2cm2, no
     * texture, no thickness. Every material here is a random id, so this was
     * measured rather than read — the same way the 17s were done.
     *
     * A JUDGEMENT CALL, and worth stating as one. `bjwbzXNxYqKWocZ` is a
     * second black panel 0.2mm behind it at 102.4cm2, and one of the two is
     * the glass over the other. If a screenshot lands on the cover rather
     * than the display, they are the wrong way round and that is the swap.
     */
    screenMaterial: "KSynYqGGNGMUJti",
    /*
     * Which materials the finish is allowed to touch.
     *
     * Without this the retint hits EVERY material on the model, which is why
     * the first pass rendered these two as flat coloured slabs: the display,
     * the camera glass and the shell all went burgundy together. `keepMaterials`
     * is the deny-list; this is the allow-list, and on a model whose materials
     * are random ids it is the only thing standing between a finish and the
     * screen.
     *
     * `DodbyqhrrBLNbcB` is the shell — the one mesh that is 10.6mm thick,
     * spans the whole body and carries a texture. `IxiedJEUxrDhLIX` is the
     * back panel behind the camera plateau.
     */
    finishMaterials: [
      // The chassis. Measured 71.8 x 150 x 11.4mm — the whole device, plus the
      // three little 1.4 x 7mm meshes that are the side buttons. It was left
      // out of this list at first, which is why the body read as two colours:
      // the shell took the finish and the frame around it stayed burgundy.
      "vUgmkmbQjXTaqEc",
      // The shell, 71.8 x 130.6 x 10.6mm and textured.
      "DodbyqhrrBLNbcB",
      /*
       * The layer UNDER the back glass, and not the glass itself.
       *
       * The back is two panels at the same 62.5cm2: `IxiedJEUxrDhLIX`, which
       * the model states at `opacity 0.3`, and this one solid behind it. That
       * is how the real thing is built — colour goes under clear glass, not on
       * it — and colouring the correct one of the two is the whole difference
       * between anodised metal and moulded plastic.
       *
       * Forcing the glass to tint was tried, via `bodyMaterials`, and it works
       * in the sense that the panel changes colour. It also turns the back
       * into a glossy shell with one blown specular sweep across it, because
       * a tinted transparent layer over a tinted opaque one is two coats of
       * paint and a varnish. The retint's instinct to step around anything
       * transparent was right; the fault was that nothing underneath was
       * listed for it to colour instead.
       *
       * The sheet DOES carry the finish now, but through `materialColors` and
       * with its painted map dropped — glass coloured by what it is made of,
       * over a flat panel. That is a different thing from `bodyMaterials`
       * pushing the body treatment onto a transparent surface, which is what
       * produced the varnish.
       */
      "WElbLmMkunjUugH",
    ],
    /*
     * What the body texture IS, so the retint knows what to shift it FROM.
     *
     * Sampled rather than guessed: the shell's own diffuse map averages
     * #381d20 and the back panel's #452a2f, both dark maroon, because the
     * variant the archive composes by default is Burgundy. Without this the
     * recolour never runs — it is gated on the pair — and every finish left
     * the phone the colour it shipped in, which is what "too dark" was.
     */
    /*
     * BOTH back panels, flat rather than as the archive painted them.
     *
     * They ship a 1024px PNG holding a top-to-bottom fade, and that fade is
     * baked lighting — Apple's renderer resolves it smoothly, this one
     * retints it to a new finish and the gradient collapses into a handful of
     * 8-bit steps. What you see then is a set of horizontal lines across the
     * back, most visible on the darker colourways where the steps are widest.
     *
     * Dropping it is the honest fix rather than a workaround: the studio has
     * real lighting of its own, and a flat panel lit by it is closer to the
     * hardware than a painted fade lit twice.
     *
     * The clear sheet needs it as much as the layer under it, and that is not
     * obvious: flattening only the lower panel changed nothing visible,
     * because the gradient the eye was reading was the one on the pane in
     * front of it.
     */
    plainMaterials: ["WElbLmMkunjUugH", "IxiedJEUxrDhLIX"],
    authoredBodyColor: "#452a2f",
    // Apple's render has no mirror on the rails at all — the chamfer is a
    // gradient. Measured against that rather than chosen: at the studio's 2.1
    // this body throws white streaks that nothing on the real phone does.
    // Tuned on the live bench against Apple's own render, then read off it.
    bodyEnvMapIntensity: 1.8,
    /*
     * The three surfaces that are not simply "the finish".
     *
     * The panel under the glass is matter and much less lit than the frame —
     * it sits behind a sheet, so what reaches it is diffuse. The glass itself
     * is smooth and not metal at all. Everything here was found by moving
     * sliders against Apple's render rather than derived, which is the only
     * way this particular question gets answered.
     */
    bodySurfaces: {
      WElbLmMkunjUugH: { roughness: 0.25, metalness: 0.26, envMapIntensity: 0 },
      /*
       * The iris blades, darkened to read as a mechanism.
       *
       * Six leaves in a ring inside the bottom barrel, a twentieth of a
       * millimetre thick, carrying a white base colour and a detailed
       * mechanical texture. They are not body, so no finish touches them —
       * which against a Black phone left them looking like bright shrapnel
       * scattered in the lens, and against Burgundy merely busy. The real
       * thing is a dark metal leaf that catches one edge of the light.
       *
       * Dark and quite smooth, so what shows is the shape of the aperture
       * rather than the detail of the texture.
       */
      NZtZZWsItDhUsxA: {
        flat: true,
        color: "#15151a",
        roughness: 0.28,
        metalness: 0.75,
        envMapIntensity: 0.5,
      },
    },
    materialColors: {
      /*
       * The Apple logo: a 16.3 x 20mm flat mesh, with the back glass sitting
       * 0.4mm in front of it.
       *
       * It is not in the finish list, so it never took the body colour — it
       * disappeared because the tinted glass was drawn OVER it. With the glass
       * left alone it shows again, but only just, because the logo and the
       * panel behind it are close in tone on a light finish.
       *
       * So it is separated the way the real one is: by SHEEN rather than by
       * colour. The body is matte anodising and the logo is polished, which is
       * what makes it legible on Black — where a darker logo would be
       * invisible — and keeps it subtle on Silver, where a black one would
       * look printed on.
       */
      yPeTOPaiWwFMSdb: { darken: 0.1, roughness: 0.12, metalness: 0.85 },
      /*
       * The antenna bands, the port and Camera Control — the body colour, a
       * shade up.
       *
       * All three arrived burgundy: the archive is composed in it, and any
       * material the finish does not own keeps whatever it was authored as.
       * That put a plum stripe across the top edge of a Black phone and a plum
       * socket in the bottom of a Sky Blue one.
       *
       * `lighten` rather than a hex, because these are the body seen through a
       * different material — plastic where the band is, sapphire over the
       * button, a machined wall inside the port — and each returns the finish
       * a little brighter than the anodised aluminium beside it. Deriving it
       * keeps that relationship true in all four colourways; a literal would
       * have to be right four times and would be right once.
       *
       * They are here rather than in `finishMaterials` deliberately. The
       * finish path would give them the body colour EXACTLY, and the whole
       * point is that they are a shade off it.
       */
      /*
       * 27.2 x 4.5mm across the top edge, and two more of 9.0 and 9.6mm at the
       * bottom: the plastic filling the splits in the frame so the radios can
       * see out.
       *
       * `lighten: 0` is the finish colour EXACTLY, and is deliberate rather
       * than a value not yet chosen. Lifting them read as a band; Apple gives
       * these the same material as the frame, so the seam is the only thing
       * that shows one is there.
       */
      /*
       * The back glass: the finish colour, on the sheet as well as under it.
       *
       * Here rather than in `bodySurfaces` because that only takes a literal,
       * and a literal cannot be four colours. `lighten: 0` is the finish
       * exactly — the sheet is glass over anodised metal, not a gel.
       *
       * Its 0.3 opacity is left as the archive states it, so this is still a
       * clear pane tinted by what it is made of rather than a coat of paint.
       * The surface numbers come with it, since the branch that used to supply
       * them is no longer the one that runs.
       */
      IxiedJEUxrDhLIX: {
        lighten: 0,
        roughness: 0.31,
        metalness: 0,
        envMapIntensity: 0.32,
      },
      ZKYcumThEAllgKc: { lighten: 0 },
      nuwSyerWvJfhsMd: { lighten: 0 },
      // The bottom edge with them: the 42.5mm hairline, the two plates either
      // side of the port, and the 15.3mm strip between.
      hGSiEINnkluBUrq: { lighten: 0 },
      mEyfsugDbInWtmQ: { lighten: 0 },
      /*
       * Camera Control: three coincident layers on the side edge at y -23mm,
       * a 0.7mm button behind two 0.3mm covers.
       *
       * Glassier than anything around it, which is what identifies it on the
       * actual phone — it returns the room sharply where the aluminium
       * scatters it.
       */
      NTEUvFZCGwiAbXI: {
        lighten: 0,
        roughness: 0.12,
        metalness: 0.4,
        envMapIntensity: 1.4,
      },
      crYYDRbonRWlXIT: {
        lighten: 0,
        roughness: 0.1,
        metalness: 0.4,
        envMapIntensity: 1.6,
      },
      /*
       * The outermost cover, and the one that has to be made OPAQUE.
       *
       * The archive states it `alphaMode: BLEND` at 0.7, so the colour set on
       * it was only ever seven tenths of what showed — the rest was whatever
       * sat behind, which is the dark inside of the recess. That is why this
       * button stayed plum while the antenna band beside it followed the
       * finish from the same override list. Colour alone could not fix it.
       */
      vmHtEpzvjsKvWzR: {
        lighten: 0,
        opacity: 1,
        roughness: 0.1,
        metalness: 0.4,
        envMapIntensity: 1.6,
      },
      // The USB-C cavity, four meshes making 9.0 x 4.6 x 3.2mm. Lightest of
      // the three, and the roughest: a machined wall rather than a polished
      // one, so it holds the colour without a highlight running round it.
      bKCxnOaKtDpUlmo: {
        lighten: 0.3,
        roughness: 0.45,
        metalness: 0.6,
        envMapIntensity: 0.7,
      },
    },
    /*
     * The panel maps its source upside down: a screenshot came out with the
     * status bar along the bottom and every line of text mirrored top to
     * bottom. A flip, not a 180 turn — the layout order was preserved, only
     * the axis was inverted.
     */
    screenFlipY: true,
    // The 17 Pro's, and the geometry is within a millimetre of it.
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 1,
    screenNative: { width: 1206, height: 2622 },
    notch: null,
    // Converted with:
    //   npm run convert:model -- <in.usdz> <out.glb> \
    //     --root UBGArkKGrAMRRnj --iris NZtZZWsItDhUsxA --iris-lens 0
    credit: "Apple — design resources (iphone-18-pro-e-sim.usdz)",
  },
  {
    id: "apple-iphone-18-pro-max",
    label: "Apple iPhone 18 Pro Max",
    modelPath: `${MODELS}/m-205521341af2ef23.glb`,
    hideHints: [],
    finishIds: [
      "iphone18-black",
      "iphone18-burgundy",
      "iphone18-sky-blue",
      "iphone18-silver",
    ],
    // The same ids as the Pro: one archive, one set of materials, two bodies.
    screenMaterial: "KSynYqGGNGMUJti",
    /*
     * Which materials the finish is allowed to touch.
     *
     * Without this the retint hits EVERY material on the model, which is why
     * the first pass rendered these two as flat coloured slabs: the display,
     * the camera glass and the shell all went burgundy together. `keepMaterials`
     * is the deny-list; this is the allow-list, and on a model whose materials
     * are random ids it is the only thing standing between a finish and the
     * screen.
     *
     * `DodbyqhrrBLNbcB` is the shell — the one mesh that is 10.6mm thick,
     * spans the whole body and carries a texture. `IxiedJEUxrDhLIX` is the
     * back panel behind the camera plateau.
     */
    finishMaterials: [
      // The chassis. Measured 71.8 x 150 x 11.4mm — the whole device, plus the
      // three little 1.4 x 7mm meshes that are the side buttons. It was left
      // out of this list at first, which is why the body read as two colours:
      // the shell took the finish and the frame around it stayed burgundy.
      "vUgmkmbQjXTaqEc",
      // The shell, 71.8 x 130.6 x 10.6mm and textured.
      "DodbyqhrrBLNbcB",
      /*
       * The layer UNDER the back glass, and not the glass itself.
       *
       * The back is two panels at the same 62.5cm2: `IxiedJEUxrDhLIX`, which
       * the model states at `opacity 0.3`, and this one solid behind it. That
       * is how the real thing is built — colour goes under clear glass, not on
       * it — and colouring the correct one of the two is the whole difference
       * between anodised metal and moulded plastic.
       *
       * Forcing the glass to tint was tried, via `bodyMaterials`, and it works
       * in the sense that the panel changes colour. It also turns the back
       * into a glossy shell with one blown specular sweep across it, because
       * a tinted transparent layer over a tinted opaque one is two coats of
       * paint and a varnish. The retint's instinct to step around anything
       * transparent was right; the fault was that nothing underneath was
       * listed for it to colour instead.
       *
       * The sheet DOES carry the finish now, but through `materialColors` and
       * with its painted map dropped — glass coloured by what it is made of,
       * over a flat panel. That is a different thing from `bodyMaterials`
       * pushing the body treatment onto a transparent surface, which is what
       * produced the varnish.
       */
      "WElbLmMkunjUugH",
    ],
    /*
     * What the body texture IS, so the retint knows what to shift it FROM.
     *
     * Sampled rather than guessed: the shell's own diffuse map averages
     * #381d20 and the back panel's #452a2f, both dark maroon, because the
     * variant the archive composes by default is Burgundy. Without this the
     * recolour never runs — it is gated on the pair — and every finish left
     * the phone the colour it shipped in, which is what "too dark" was.
     */
    /*
     * BOTH back panels, flat rather than as the archive painted them.
     *
     * They ship a 1024px PNG holding a top-to-bottom fade, and that fade is
     * baked lighting — Apple's renderer resolves it smoothly, this one
     * retints it to a new finish and the gradient collapses into a handful of
     * 8-bit steps. What you see then is a set of horizontal lines across the
     * back, most visible on the darker colourways where the steps are widest.
     *
     * Dropping it is the honest fix rather than a workaround: the studio has
     * real lighting of its own, and a flat panel lit by it is closer to the
     * hardware than a painted fade lit twice.
     *
     * The clear sheet needs it as much as the layer under it, and that is not
     * obvious: flattening only the lower panel changed nothing visible,
     * because the gradient the eye was reading was the one on the pane in
     * front of it.
     */
    plainMaterials: ["WElbLmMkunjUugH", "IxiedJEUxrDhLIX"],
    authoredBodyColor: "#452a2f",
    // Apple's render has no mirror on the rails at all — the chamfer is a
    // gradient. Measured against that rather than chosen: at the studio's 2.1
    // this body throws white streaks that nothing on the real phone does.
    // Tuned on the live bench against Apple's own render, then read off it.
    bodyEnvMapIntensity: 1.8,
    /*
     * The three surfaces that are not simply "the finish".
     *
     * The panel under the glass is matter and much less lit than the frame —
     * it sits behind a sheet, so what reaches it is diffuse. The glass itself
     * is smooth and not metal at all. Everything here was found by moving
     * sliders against Apple's render rather than derived, which is the only
     * way this particular question gets answered.
     */
    bodySurfaces: {
      WElbLmMkunjUugH: { roughness: 0.25, metalness: 0.26, envMapIntensity: 0 },
      /*
       * The iris blades, darkened to read as a mechanism.
       *
       * Six leaves in a ring inside the bottom barrel, a twentieth of a
       * millimetre thick, carrying a white base colour and a detailed
       * mechanical texture. They are not body, so no finish touches them —
       * which against a Black phone left them looking like bright shrapnel
       * scattered in the lens, and against Burgundy merely busy. The real
       * thing is a dark metal leaf that catches one edge of the light.
       *
       * Dark and quite smooth, so what shows is the shape of the aperture
       * rather than the detail of the texture.
       */
      NZtZZWsItDhUsxA: {
        flat: true,
        color: "#15151a",
        roughness: 0.28,
        metalness: 0.75,
        envMapIntensity: 0.5,
      },
    },
    materialColors: {
      /*
       * The Apple logo: a 16.3 x 20mm flat mesh, with the back glass sitting
       * 0.4mm in front of it.
       *
       * It is not in the finish list, so it never took the body colour — it
       * disappeared because the tinted glass was drawn OVER it. With the glass
       * left alone it shows again, but only just, because the logo and the
       * panel behind it are close in tone on a light finish.
       *
       * So it is separated the way the real one is: by SHEEN rather than by
       * colour. The body is matte anodising and the logo is polished, which is
       * what makes it legible on Black — where a darker logo would be
       * invisible — and keeps it subtle on Silver, where a black one would
       * look printed on.
       */
      yPeTOPaiWwFMSdb: { darken: 0.1, roughness: 0.12, metalness: 0.85 },
      /*
       * The antenna bands, the port and Camera Control — the body colour, a
       * shade up.
       *
       * All three arrived burgundy: the archive is composed in it, and any
       * material the finish does not own keeps whatever it was authored as.
       * That put a plum stripe across the top edge of a Black phone and a plum
       * socket in the bottom of a Sky Blue one.
       *
       * `lighten` rather than a hex, because these are the body seen through a
       * different material — plastic where the band is, sapphire over the
       * button, a machined wall inside the port — and each returns the finish
       * a little brighter than the anodised aluminium beside it. Deriving it
       * keeps that relationship true in all four colourways; a literal would
       * have to be right four times and would be right once.
       *
       * They are here rather than in `finishMaterials` deliberately. The
       * finish path would give them the body colour EXACTLY, and the whole
       * point is that they are a shade off it.
       */
      /*
       * 27.2 x 4.5mm across the top edge, and two more of 9.0 and 9.6mm at the
       * bottom: the plastic filling the splits in the frame so the radios can
       * see out.
       *
       * `lighten: 0` is the finish colour EXACTLY, and is deliberate rather
       * than a value not yet chosen. Lifting them read as a band; Apple gives
       * these the same material as the frame, so the seam is the only thing
       * that shows one is there.
       */
      /*
       * The back glass: the finish colour, on the sheet as well as under it.
       *
       * Here rather than in `bodySurfaces` because that only takes a literal,
       * and a literal cannot be four colours. `lighten: 0` is the finish
       * exactly — the sheet is glass over anodised metal, not a gel.
       *
       * Its 0.3 opacity is left as the archive states it, so this is still a
       * clear pane tinted by what it is made of rather than a coat of paint.
       * The surface numbers come with it, since the branch that used to supply
       * them is no longer the one that runs.
       */
      IxiedJEUxrDhLIX: {
        lighten: 0,
        roughness: 0.31,
        metalness: 0,
        envMapIntensity: 0.32,
      },
      ZKYcumThEAllgKc: { lighten: 0 },
      nuwSyerWvJfhsMd: { lighten: 0 },
      // The bottom edge with them: the 42.5mm hairline, the two plates either
      // side of the port, and the 15.3mm strip between.
      hGSiEINnkluBUrq: { lighten: 0 },
      mEyfsugDbInWtmQ: { lighten: 0 },
      /*
       * Camera Control: three coincident layers on the side edge at y -23mm,
       * a 0.7mm button behind two 0.3mm covers.
       *
       * Glassier than anything around it, which is what identifies it on the
       * actual phone — it returns the room sharply where the aluminium
       * scatters it.
       */
      NTEUvFZCGwiAbXI: {
        lighten: 0,
        roughness: 0.12,
        metalness: 0.4,
        envMapIntensity: 1.4,
      },
      crYYDRbonRWlXIT: {
        lighten: 0,
        roughness: 0.1,
        metalness: 0.4,
        envMapIntensity: 1.6,
      },
      /*
       * The outermost cover, and the one that has to be made OPAQUE.
       *
       * The archive states it `alphaMode: BLEND` at 0.7, so the colour set on
       * it was only ever seven tenths of what showed — the rest was whatever
       * sat behind, which is the dark inside of the recess. That is why this
       * button stayed plum while the antenna band beside it followed the
       * finish from the same override list. Colour alone could not fix it.
       */
      vmHtEpzvjsKvWzR: {
        lighten: 0,
        opacity: 1,
        roughness: 0.1,
        metalness: 0.4,
        envMapIntensity: 1.6,
      },
      // The USB-C cavity, four meshes making 9.0 x 4.6 x 3.2mm. Lightest of
      // the three, and the roughest: a machined wall rather than a polished
      // one, so it holds the colour without a highlight running round it.
      bKCxnOaKtDpUlmo: {
        lighten: 0.3,
        roughness: 0.45,
        metalness: 0.6,
        envMapIntensity: 0.7,
      },
    },
    /*
     * The panel maps its source upside down: a screenshot came out with the
     * status bar along the bottom and every line of text mirrored top to
     * bottom. A flip, not a 180 turn — the layout order was preserved, only
     * the axis was inverted.
     */
    screenFlipY: true,
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 1,
    screenNative: { width: 1320, height: 2868 },
    notch: null,
    // As the Pro, plus `--root wUOhcMgiBmCgGaw --rotate-y 180`.
    //
    // The yaw is not cosmetic. The two phones face OPPOSITE WAYS in the
    // archive's layout, so this one arrived with its screen at +Z and its
    // cameras at -Z — the reverse of what the stage assumes, and the reverse
    // of every other device in this registry. Measured rather than guessed:
    // screen z -4.4 against cameras +9.3 now, which is the 17 Pro's
    // arrangement exactly.
    //
    // Its lens layout is mirrored too, but `--iris-lens` counts by height, so
    // 0 is the bottom lens on both phones regardless.
    credit: "Apple — design resources (iphone-18-pro-e-sim.usdz)",
  },
  {
    /*
     * The same phone from Apple's own product viewer rather than from their
     * design resources, and it is a different asset in the way that matters:
     * ITS FOLD IS SKINNED.
     *
     * The design-resource USDZ ships two static poses, open and closed, and
     * the clip beside it is one this repo derived — a screw interpolation
     * about a hinge line measured from the spine. That is geometrically
     * correct and it is still two rigid plates. This file carries a 27-joint
     * skeleton and a 61-key clip authored against it, so the inner display
     * BENDS across the hinge the way the real panel does, and every angle
     * between open and shut is a pose someone chose rather than one this code
     * interpolated.
     *
     * The only Duo now. The design-resource model sat beside it for a while
     * and was removed on 2026-09-13: two entries with the same name, one of
     * which folded as two rigid plates, was a choice nobody wanted to make in
     * a device list. Worth recording that it was not strictly worse -- it
     * carried more detail, and its provenance was a file Apple publishes for
     * exactly this use, where this one was fetched from their product page.
     * It is in git if a higher-detail static Duo is ever wanted.
     */
    id: "apple-iphone-duo-web",
    label: "Apple iPhone Duo",
    /*
     * Named for its provenance, and RENAMED once on purpose.
     *
     * The orientation in this file was rebaked three times while the path
     * stayed the same, and `useGLTF` caches by url -- so the app kept loading
     * the first copy and every fix looked like it had done nothing. A new name
     * is the only way to be sure which file is on screen.
     */
    modelPath: `${MODELS}/m-3fe00b563e718862.glb`,
    hideHints: [],
    finishIds: ["cloud-white", "duo-night-sky"],
    /*
     * `Slider`, by name, because this file also carries `Intro` and lists it
     * first. The lid would otherwise scrub an entrance animation.
     *
     * Open at 2s and shut at 0s — the reverse of the converted model, and
     * taken from the viewer's own states, which map their range input
     * linearly onto the clip with `closed: 0` at one end and `landscape: 1`
     * at the other.
     */
    fold: { openSec: 2, closedSec: 0, clip: "Slider" },
    /*
     * The inner panel: one flat mesh, 15.8 x 11.0 units, spanning both leaves
     * on the front face. The only mesh in the file that does.
     */
    screenMaterial: "pkUBCyCvYJYVzTr",
    /*
     * And the cover panel, which this asset names outright — the only
     * legible material name in the file, and worth the trust: it is on the
     * back half at 7.7 x 11.2, which is where a cover screen is.
     */
    coverScreen: {
      material: "screenTextureOuterDisplay_usd_shd_lts",
      native: { width: 1080, height: 1560 },
    },
    /*
     * NOTHING repainted: every material renders exactly as Apple authored it.
     *
     * This listed seven materials as "the shells and the anodised trim", and
     * two of them were the parts that most need to be left alone. The frame
     * (`lrXfpZcYrByzvym`, the 8.3 x 11.8 outer shell) and the camera rings
     * (`jqlebwNqkTyrcyd`) are authored as polished champagne metal --
     * metalness 1, roughness 0.05 -- and the finish pass repainted both in
     * flat Cloud White at the finish's own metalness and roughness. That is
     * why the frame read as matte white where Apple's is shiny and faintly
     * gold, and why the lens rings vanished into the body.
     *
     * An empty list is correct rather than lazy. This device ships in ONE
     * colour and the file was authored in it, so every authored colour is
     * already Cloud White's real colour; the finish pass has nothing to add
     * and can only take away. An empty array -- not an absent one -- is what
     * tells the retint that no material here is body.
     */
    /*
     * The body, so a finish can colour it -- with every surface restored below.
     *
     * This list was EMPTY while Cloud White was the only colourway: the file is
     * authored in it, so leaving every material alone reproduced Apple's render
     * exactly and the retint could only take away. A second colour ends that --
     * nothing repainted means nothing to repaint.
     *
     * What matters is that these eight do not share a surface. The shell is a
     * mirror at roughness 0.05, the hinge spine is matte at 1, the back panels
     * are barely-metallic glass -- and a finish carries ONE metalness and ONE
     * roughness for everything it touches. So the finish supplies the colour
     * and `bodySurfaces` puts each material's own measured surface back
     * afterwards. Without that, Cloud White would flatten into a single
     * plastic sheen: the exact fault that emptying this list once fixed.
     */
    finishMaterials: [
      // The outer shell, 8.3 x 11.8 -- the whole body.
      "lrXfpZcYrByzvym",
      // The polished edge strip, and the bottom trim.
      "mAvfMvCzYIPKaNG",
      "UcYWmlwZxcfqNko",
      // The camera plateau: its ring, and the surround it sits in.
      "jqlebwNqkTyrcyd",
      "OwqobJiNTlvAFyj",
      // The hinge spine down the fold.
      "jeFtQmHBLCfgIkY",
      // The two back panels. Their maps are dropped -- see `plainMaterials`
      // below -- so the finish fills them flat; near-white texels are exactly
      // what the atlas retint skips, which is why they stayed Cloud White.
      "MZiYIrcFSqDDBWG",
      "ZoizrWFccovSVQl",
    ],
    /*
     * The cream the file is authored in, read off the shell's own base colour
     * (0.89, 0.85, 0.78 linear). The retint shifts the textured panels FROM
     * this, so a wrong value here would tint their grain.
     */
    authoredBodyColor: "#f2ede5",
    /*
     * The two back panels, filled with the finish rather than retinted.
     *
     * They stayed Cloud White under Night Sky while the frame and the logo
     * changed, and the reason is what `recolorBodyTexture` is FOR: it retints
     * coloured trim inside an atlas, skipping any texel below a saturation or
     * value floor and any whose hue is far from the authored one. These panels
     * are near-white and essentially unsaturated, so every texel was skipped
     * and the panel came through cream at any finish.
     *
     * Dropping the map lets the finish colour fill them flat, which is what
     * `plainMaterials` exists for and what the 18s' back glass already does.
     * It costs the plateau's baked shadow, which lived in that map -- the
     * studio's own lighting is what draws it now.
     */
    plainMaterials: ["MZiYIrcFSqDDBWG", "ZoizrWFccovSVQl"],
    /*
     * Both panels again, this time for their METALLIC-ROUGHNESS map.
     *
     * `plainMaterials` drops `map` only, which is all the banding fix needed.
     * It leaves `roughnessMap` in place, and three multiplies factor by map --
     * so `MZiYIrcFSqDDBWG`, which ships one (tex 47), renders at map x factor
     * no matter what roughness is stated above. Stating 0.18 without this
     * changes nothing visible, which is the same failure the 18s' chassis hit.
     *
     * It also settles a difference between the two: `ZoizrWFccovSVQl` has no
     * such map, so the studio's grain pass was adding one to that panel and
     * not to its neighbour, and the halves of one back were lit differently.
     */
    plainBodyMaterials: ["MZiYIrcFSqDDBWG", "ZoizrWFccovSVQl"],
    /*
     * The lens stack, given back a surface that catches the light.
     *
     * Apple's render shows a navy glint in each lens and a bright ring round
     * it. Theirs comes off an EXR environment this studio does not ship; the
     * inner element here is authored at roughness 0.5, which under a studio
     * rig of a few soft emitters reflects almost nothing, so the lens read as
     * a flat black disc. Smoother and more reflective, and the inner element
     * tinted the navy of Apple's glint, so the lens reads as glass with depth
     * rather than a hole. Tuned by eye against their render, and the first
     * place to look if the lenses now read too bright.
     */
    bodySurfaces: {
      /*
       * Each body material's own surface, put back after the finish.
       *
       * Measured from the model rather than chosen: these are the numbers
       * Apple authored, and they are what makes the shell a mirror, the spine
       * matte, and the plateau something between. The finish sets the colour;
       * this sets everything else.
       */
      lrXfpZcYrByzvym: { metalness: 1, roughness: 0.05 },
      mAvfMvCzYIPKaNG: { metalness: 1, roughness: 0.009 },
      UcYWmlwZxcfqNko: { metalness: 1, roughness: 0.15 },
      jqlebwNqkTyrcyd: { metalness: 1, roughness: 0.05 },
      // The plateau pad, under the glass: tighter than Apple's authored 0.17,
      // because the glass above it is what carries the highlight and a matte
      // pad under a clear sheet reads as paint.
      OwqobJiNTlvAFyj: { metalness: 1, roughness: 0.17 },
      jeFtQmHBLCfgIkY: { metalness: 1, roughness: 1 },
      /*
       * The back glass, and the reason it read as painted card.
       *
       * Apple authors both panels `roughnessFactor: 1` -- fully matte, no
       * specular, no environment. That is not what their render shows: the
       * back is glass with a soft vertical gradient and a bright edge where it
       * meets the rail. The authored 1 is a placeholder their own renderer
       * overrides; ours took it literally.
       *
       * Dielectric, not metal. Glass is metalness 0: at 0.1 the highlight
       * takes the body colour and reads as anodised aluminium, which is what
       * the rail beside it already is and why the two never separated.
       *
       * `plainBodyMaterials` below is what makes the number reach the surface.
       */
      MZiYIrcFSqDDBWG: { metalness: 0, roughness: 0.18 },
      ZoizrWFccovSVQl: { metalness: 0, roughness: 0.18 },
      // The inner element: dark teal metal, authored at roughness 0.5.
      uykWUEajxHqfrmh: {
        color: "#26325c",
        metalness: 1,
        roughness: 0.08,
        envMapIntensity: 2.6,
      },
      // The element pair in front of it, authored matte at 0.65.
      XVBEVNwvEGGqQcm: { roughness: 0.14, envMapIntensity: 2 },
      // The coating: a mirror at 0.001 already, just dim.
      FVyIOhmektXDyZR: { envMapIntensity: 3 },
    },
    /*
     * The camera plateau's cover glass, stated per MESH and not per material.
     *
     * `iVzCHFKAaRqjQhl` covers two planes: the 5.6 x 2.1 sheet over the
     * plateau, and a 1.6 x 2.0 one on the same footprint as the logo. Stating
     * the material would put a half-clear pane over the logo as well, so the
     * sheet is named directly.
     *
     * LIGHTER than the body, which is the whole of it, and what two attempts
     * here got wrong in the same way.
     *
     * The Air is the reference and it does NOT use the 17's `PLATEAU`: it
     * declares no `finishMaterials`, so its pad reaches this same branch with
     * only `{ lighten: 0.05 }` on it, KEEPING the alpha and gloss Apple
     * authored -- translucent at 50%, tinted #dfe8f0. A light pane at half
     * alpha over a near-black body composites to the pale pad in Apple's crop.
     * The lightness is the tint, not the gloss.
     *
     * This sheet is authored `BLEND` at alpha 0: no tint and no alpha to keep,
     * so both have to be stated. Both earlier attempts stated a colour DERIVED
     * from the finish -- first a metal tint, then a dielectric at 0.74 -- which
     * is body colour over a backing already in body colour. No value of
     * roughness rescues that: a metalness-0 dielectric reflects about 4% head
     * on, so the environment cannot supply the contrast the tint is not
     * providing, and the bump reads flat at every gloss setting.
     *
     * Lifted well clear of the body instead, at half alpha, so the composite
     * lands between the two the way the Air's does.
     */
    meshColors: {
      MjAVumOaiYuioav: {
        darken: 0.22,
        saturate: 1.25,
        opacity: 0.74,
        roughness: 0.04,
        metalness: 0,
        envMapIntensity: 1.9,
      },
    },
    materialColors: {
      /*
       * The band around the rim -- the part that stayed pale on every dark
       * finish.
       *
       * Found by ray-casting the model rather than by reading the material
       * list: from the front, the top edge, the bottom edge and the side, the
       * first surface a ray meets along the outer lip is `FoAbzXGuCEeVRQW`,
       * and it is the ONLY untouched material that appears in all four views
       * (7.0% of the front, 5.5-7.4% of each edge, spanning the full length of
       * every one). It borders the display and wraps the rim: the band.
       *
       * Why it hid: it is authored #595959, a MID GREY, not cream. Against
       * Cloud White it is darker than the body and reads as a normal shadowed
       * edge, so nothing looks wrong. Against Night Sky at L 0.27 the same
       * grey sits at L 0.36 -- LIGHTER than the body -- and the eye reads it
       * as the old white finish left behind. Searching for pale materials
       * could never have found it, which is what the two earlier attempts did.
       *
       * Darkened rather than lightened, so it keeps its authored relationship
       * to the body on every colourway instead of only on the dark ones. Its
       * surface is left alone: matte at metalness 0 is what makes a band read
       * as an inlay rather than as more frame.
       */
      /*
       * Darkened only slightly. The first pass used 0.45, which is close to
       * the relationship Apple authored (#595959 on a near-white body is a
       * 0.64 darken) -- but that relationship is what makes the band a hard
       * dark line on a DARK finish, where the same proportion of a much lower
       * lightness lands almost at black. Apple's own render has the inlays
       * barely separated from the rail. 0.15 keeps them readable as inlays on
       * Cloud White and subtle on Night Sky, which is the look, rather than
       * reproducing a ratio that only ever suited the white phone.
       */
      FoAbzXGuCEeVRQW: { darken: 0.15 },
      /*
       * The rim grille, authored pure white over a woven 128x128 map.
       *
       * The map stays -- it is what makes this read as a grille rather than a
       * painted stripe -- and only the colour under it moves, which is exactly
       * what `materialColors` does to a textured material.
       */
      hAKVdrzztJgljCR: { darken: 0.12 },
      /*
       * The chassis, where it shows at a gap in the shell.
       *
       * These three were the first guess at the band and they were NOT it:
       * ray-casting puts them at 0.6-1.9% of any view, too little to be what
       * was visible. They are kept because the reasoning still holds on its
       * own terms -- they are unfinished chassis that does show at the seams,
       * and Apple's render has it a touch lighter than the body -- but they
       * are not the fix, and the comment that said they were was wrong.
       */
      stlMkdXkRsspsoE: { lighten: 0.08 },
      NtNSwEIIFmIbXaY: { lighten: 0.08 },
      hpmqrCvWLXWudrz: { lighten: 0.08 },
      /*
       * The logo, which was never missing -- it was underneath.
       *
       * `ZgMnqnyPATyacDv` is a 1.6 x 2.0 mark centred on the back, authored
       * 0.02 units UNDER the glass, and in Apple's renderer the glass over it
       * lets it through. Here the glass is opaque, so the converter lifts it
       * just clear -- see `--nudge` in the command below.
       *
       * Lifted, it still vanished: it is authored the same cream as the panel
       * it sits on, 1.00/0.97/0.94 against 1.00/0.98/0.94, and a mark the
       * colour of its ground is not a mark. Apple's reads as a faint sheen, a
       * touch darker and glossier than the glass, which is the treatment the
       * 18s' logo already gets. Derived from the finish, so it follows it.
       */
      ZgMnqnyPATyacDv: { darken: 0.14, roughness: 0.16, metalness: 0.7 },
      /*
       * One of two coincident back panels, taken out.
       *
       * `QTguOGnxQOXIuCV` and `MZiYIrcFSqDDBWG` cover the back at EXACTLY the
       * same depth -- colour variants, which Apple's viewer weights between
       * so that one shows. Here both drew and fought over the same pixels.
       * This is the flat one; the other carries the soft shadow under the
       * camera plateau that Apple's render shows, so it is the one kept.
       */
      QTguOGnxQOXIuCV: { opacity: 0 },
    },
    screenCornerRadiusPct: 0.06,
    screenInsetPct: 1,
    /*
     * The inner panel's own proportions, 15.79 x 11.04 in model units.
     *
     * Not a guess and not a spec sheet: this device is authored lying flat, so
     * the stage's measurement of its display comes out zero-height and the fit
     * falls back to this number. It has to be the panel's real aspect or the
     * screenshot is cropped to the wrong shape.
     */
    screenNative: { width: 2316, height: 1620 },
    // And use it for the fit rather than the measured mesh. See the field.
    screenFitFromNative: true,
    /*
     * Upright in the FILE, like every other model here.
     *
     * Apple's product viewer orbits a camera around a device lying flat, so
     * that is how its glTF ships: measured through the skin, the inner
     * display's normal is +Y, face up. The converter stands it up on the way
     * in -- see the command below -- which lands the display's normal on
     * (0, 0, -1).
     *
     * A quarter turn about X ALONE does that, and is wrong: it also carries
     * the model's +Z to world +Y, and this phone's top edge is at -Z, so the
     * device came up correctly facing you and upside down. Turning the other
     * way about X and then half a turn about Y reaches the same normal with
     * the opposite up vector, which is the one that has the camera at the top.
     *
     * Verified against the 17 Pro rather than by eye: its screen material's
     * mean normal is (0, 0, -1) too, so this device now sits in the same
     * neutral as the rest of the registry and needs no `autoStand` search and
     * no `modelYawDeg` to correct it afterwards.
     *
     * Baking it beats standing it up at runtime. `autoStand` scores candidate
     * poses by height minus depth, which is a guess that happens to be right;
     * a rotation in the file is a fact, and it can be measured offline instead
     * of inferred from what the canvas looks like.
     */
    notch: null,
    // Converted with:
    //   node scripts/gltf-to-glb.mjs <product-viewer.gltf> <out.glb> \
    //     --rotate-x 90 --rotate-y 180 \
    //     --nudge ZgMnqnyPATyacDv:0,-0.0261,0
    credit: "Apple — iPhone Duo product viewer (apple.com)",
  },
  {
    id: "apple-iphone-air",
    label: "Apple iPhone Air",
    modelPath: `${MODELS}/m-30685fd59ff29dbc.glb`,
    hideHints: [],
    /*
     * Identified by geometry, like the Pro pair -- Apple obfuscates every prim
     * name. Of the large panes on the front this one measures 69.6 x 151.5mm,
     * an aspect of 2.1748 against the real Air panel's 2.171; the next closest
     * candidate is 2.1281, which is the cover glass over it.
     */
    finishIds: ["sky-blue", "light-gold", "cloud-white", "space-black"],
    screenMaterial: "JYaVgRyCxtrmyCa",
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 1,
    /*
     * The Air's own panel. No baked wallpaper in this model to measure
     * instead, and a screenshot off the device is exactly this size.
     */
    screenNative: { width: 1260, height: 2736 },
    /*
     * Sky Blue, measured off the back-glass texture at srgb(220,231,237)
     * rather than taken from Apple's marketing swatch.
     */
    authoredBodyColor: "#dce7ed",
    /*
     * The plateau pad, flattened so it takes the finish.
     *
     * It carries its colour in a MAP rather than a factor, and the retint could
     * not touch it: `recolorBodyTexture` matches texels by hue within a
     * saturation floor of 0.3, and this model is exported in Sky Blue --
     * #dce7ed, a saturation of 0.07. Nothing matched and nothing was
     * recoloured. Raising the floor would be the wrong fix; it exists so a
     * near-black is not dragged along by a hue computed off three tiny channel
     * values. The map is a flat swatch (stddev 2 across 1024x512) carrying only
     * the pad's outline, so dropping it loses nothing.
     *
     * The main back panel is NOT here. It needs no help -- `AzVoGzmZGKrQkNn`
     * has no base map at all and takes the finish directly -- and it carries
     * the Apple logo as relief in its NORMAL map, which this would not touch
     * but which is worth knowing before anyone reaches for it.
     */
    plainMaterials: ["bozFptYZktLMuie"],
    materialColors: {
      /*
       * The camera plateau's glass pad.
       *
       * Authored translucent at 50% and tinted #dfe8f0 -- Sky Blue, the
       * colourway this file was exported in. The finish pass leaves anything
       * transparent alone, so that tint survived into every finish and the
       * plateau rendered as a grey pad stuck on a black phone. Routed through
       * an override it takes the finish and keeps its own alpha and gloss,
       * which is what makes it read as glass over the pad rather than as paint
       * on it.
       */
      FVWIzbdaZVWwNoh: { lighten: 0.05 },
      /*
       * The back glass sheet.
       *
       * Same shape of problem as the plateau pad, and it caught me out for the
       * same reason: it is translucent, so the finish pass files it as glass
       * and preserves its authored white. The opaque layer underneath
       * (`AzVoGzmZGKrQkNn`) was going black correctly -- and then this white
       * sheet over it put the back right back to white while the rail and the
       * plateau turned black around it.
       *
       * Lifted, so the panel reads a step above the rail.
       *
       * 0.10 rather than 0.07 on the strength of Apple's Space Black render:
       * the back there is a soft dark grey against a near-black rail and
       * plateau, and the separation is the most visible thing about that
       * colourway. Because the lift is proportional to the headroom left
       * (`l + (1 - l) * amount`), a dark finish gets a larger absolute step
       * than a light one from the same number -- which is what makes one
       * value work across all four.
       */
      EDOyiaPETeawpLH: { lighten: 0.1 },
      /*
       * Inside the lens barrels, front and back.
       *
       * These are authored white and were taking the finish, so on Cloud White
       * the inside of the lens rendered as a pale ring and the front camera as
       * a light blob in the island. A camera's interior is black on every
       * phone in every colour -- it is the inside of a barrel.
       *
       * Only the BARREL, not the glass. `EPeQHrTgnRaWRxp` at 7.7mm is the
       * inner wall between the 11mm black housing and the lens elements; the
       * 3.4-4.1mm parts inside it are the optical stack and are exempted
       * instead, in `keepMaterials`. Flattening those too turned the lens into
       * a black disc -- the coating tint and the highlight that make it read
       * as glass are in their own maps, and a stated colour replaces them.
       *
       * The flash cluster at x=18.5..21.1 -- `dzQFRwNxecBufUA`,
       * `VhajVEosMxrmDGk`, `rXVscJnBKfSEJOy`, `wICDXtrEMzZWvZY`,
       * `IJiGJXsJmUCZWQl`, `FbKvlZuTeRkZQye` -- is left alone on purpose. It
       * is authored white because it is a flash, and darkening it along with
       * the lenses would trade one wrong render for another.
       *
       * Not pure black: these are glass elements deep in a recess, and #000
       * renders as a hole rather than as something with depth.
       */
      /*
       * The Apple logo, both shells, darkened off the finish.
       *
       * Same treatment as the Pro models and for the same reason: it is milled
       * INTO the glass, so it catches less light than the panel around it and
       * reads darker rather than as a printed mark. On Apple's Space Black
       * render it is very nearly the body colour -- visible, not bright.
       *
       * Both are named because they are stacked: `giFWuszLwQVarIk` is opaque
       * and was taking the finish correctly, while `OEfwEadFATlixvl` sits over
       * it at 80% and -- being translucent -- was filed as glass and kept the
       * Sky Blue this file was exported in. That pale shell over a dark one is
       * what made the logo read as light grey on a black phone.
       *
       * They sit at y=1 and measure 15.3 x 18.8mm, which is how they were
       * finally found: an earlier search for them filtered on the back face
       * and these classify just in front of the panel's own centre.
       */
      giFWuszLwQVarIk: { darken: 0.12 },
      OEfwEadFATlixvl: { darken: 0.12 },
      /*
       * The coated ring outside the glass -- violet, not black.
       *
       * This is the lens's anti-reflective coating, and on Apple's own crop it
       * reads as a distinct dark purple around the elements rather than as
       * more barrel. It was stated neutral near-black here, which lost the one
       * thing that makes a phone lens look like an optic instead of a hole.
       *
       * Dark enough to stay a recess: the value is the coating's albedo, and
       * the studio's rig lifts it considerably at the top of the curve, which
       * is where the purple actually shows.
       */
      EPeQHrTgnRaWRxp: "#332d47",
      /*
       * The mic grille, at x=14.0 between the lens stack and the flash.
       *
       * Polished metal, on the same terms as the rail and the camera ring --
       * Apple's crop shows a bright silver bezel with the black perforation
       * sitting inside it, not a dark dot. It was stated flat grey for a
       * while, which killed the bezel along with the brightness.
       *
       * The perforation is safe: it lives in the material's own map, and a
       * colour MULTIPLIES that map rather than replacing it, so the holes stay
       * dark against whatever the bezel becomes.
       *
       * Derived from the finish rather than pinned to a hex, so it is silver
       * on Cloud White and Sky Blue and warms with Light Gold, the way a metal
       * part on a metal phone does.
       */
      KwWjcBRJvLZraqN: {
        lighten: 0.06,
        saturate: 1.9,
        metalness: 1,
        roughness: 0.05,
      },
      /*
       * The rail AND the camera ring -- one material does both, which is why
       * they always match on the real phone.
       *
       * Apple authors it metalness 1.0, roughness 0.01: a mirror. The finish
       * pass was overwriting that with the body's own 0.55/0.38 and flattening
       * it into painted trim, which is why the rail rendered as a solid band
       * of colour instead of chrome. Routing it through an override keeps the
       * authored surface, because an override sets colour and returns.
       *
       * Saturated up because polished metal returns a deeper version of the
       * body colour than matte glass does -- it is what makes Light Gold's
       * rail read gold against a cream back.
       *
       * Lifted slightly too, which matters most in Space Black: at the
       * finish's own value the rail went nearly to nothing. A mirror shows
       * almost none of its albedo, so what that number really sets is how
       * dark the REFLECTIONS come back -- and at #1e1e21 the rig reflected
       * into it as a black band. Still below the back panel's 0.10, so the
       * panel keeps reading as the lighter of the two.
       */
      cdkzsMrKAIfdCgl: { lighten: 0.06, saturate: 1.9 },
      /*
       * The ring's second disc, made to match.
       *
       * `qzTeHyKNlzBPTRF` is exactly the same 15.8mm size as the chrome bezel
       * and sits with it, but is authored matte -- metalness 0, roughness 1 --
       * so it took the finish as a flat painted disc and sat there dulling the
       * chrome next to it. On Apple's own crops the ring is one material in
       * every colourway: chrome-blue on Sky Blue, gold on Light Gold, silver
       * on Cloud White, near-black on Space Black.
       *
       * The surface is stated here rather than inherited, because an override
       * otherwise keeps what the model authored -- and what the model authored
       * is the thing being corrected. Same lighten and saturate as the rail so
       * the two track each other across all four finishes.
       */
      qzTeHyKNlzBPTRF: {
        lighten: 0.06,
        saturate: 1.9,
        metalness: 1,
        roughness: 0.05,
      },
    },
    /*
     * Everything the file authors dead black: the lens barrels, the flash
     * window and the panes behind the screen. Read out of the converted
     * materials, minus `JYaVgRyCxtrmyCa`, which the screen pass owns.
     */
    keepMaterials: [
      "nDDUrurZqhIwGTb",
      "XbIMcOXQPgioTJH",
      "XJBDPVJKGkXvaGI",
      "mOhEPSexeCXxYUi",
      "offBMueUqTCIKfx",
      "IQfpoXuwllwMZgX",
      // Authored #262f33 -- dark already, and used in both camera stacks. It
      // only needed exempting from the finish, not restating.
      "iQihqVOqStAAmgX",
      /*
       * The lens elements themselves, front and back.
       *
       * Exempted rather than darkened. They are authored white against their
       * own maps, which is what carries the coating tint and the specular
       * highlight -- the things that make a lens look like glass. Stating a
       * colour here replaces the map's contribution and the whole assembly
       * flattens into a black hole with faint rings.
       *
       * One entry covering two places again: the model uses this in the rear
       * stack at x=-21.1 and the front camera at x=7.4.
       */
      "wVjTyqwIKEfgsSj",
      /*
       * The front camera's own element, for the same reason.
       *
       * It was stated dark for a while, which fixed the pale blob it had been
       * and replaced it with a flat one -- the housing around it is already
       * black, so what the lens needed was not to be darker but to be glass.
       */
      "ZvqQfyJNesUwPqC",
    ],
    /*
     * Same UV convention as the Pro models -- same author, same export -- so
     * this is carried over rather than rediscovered. If a screenshot lands
     * upside down or mirrored on this device and not the others, that
     * assumption is what is wrong.
     */
    screenFlipY: true,
    notch: null,
    /*
     * Converted with `--rotate-y -90`.
     *
     * Unlike the Pro pair this one is a single component, but it is authored
     * lying on its side: the file measures 11.3 x 156.6 x 75.7mm, with the
     * THICKNESS on X. The studio opens at yAxis 180 on the assumption of a
     * screen facing -Z, so the quarter turn is baked into the geometry. After
     * it, 75.7 x 156.6 x 11.3mm against Apple's published 74.7 x 156.2 -- the
     * extra depth is the camera plateau.
     */
    credit: "Apple — design resources (iphone-air-e-sim.usdz)",
  },
  {
    id: "apple-ipad-pro",
    label: "Apple iPad Pro",
    /*
     * The one model still shipped uncompressed.
     *
     * Meshopt quantisation rewrites each mesh's geometry into its own
     * normalised space and puts the difference on the node, which is
     * invisible to anything that renders and fatal to `cameraCopies` below:
     * `radialSpan` measures the rim in LOCAL coordinates and compares it
     * against every other mesh's, so once those spaces stop agreeing it
     * matches the wrong parts and copies them at the wrong size. On the live
     * site that came out as a single lens the size of the whole tablet.
     *
     * ponytail: costs ~2.6MB against the other twelve. The fix is to measure
     * in world space in `addCameraCopies`; worth doing when something else
     * needs that code opened anyway.
     */
    modelPath: `${MODELS}/m-6ac055b703108758.glb`,
    hideHints: [],
    /*
     * 264.4 x 198.0mm, aspect 1.3356 against the real 13-inch panel's 1.3333
     * (2752 x 2064). The next candidate up is 1.3118, which is the cover glass
     * over it -- the display is the smaller, darker one inside the bezel.
     */
    /*
     * Apple sells the iPad Pro in two, and this file is the Silver one -- its
     * enclosure is authored white at metalness 1, which is the silver
     * anodising, not a colour.
     */
    finishIds: ["silver", "space-black"],
    screenMaterial: "dUmOgLJvvBzDJsS",
    /*
     * The panel is landscape -- 264.4 x 198.0mm -- but its UVs are not: U runs
     * along the 198mm side and V along the 264mm one, measured off the mesh.
     * So a screenshot bound to it arrives lying on its side, which is the
     * exact case `screenRotateDeg` exists for.
     */
    screenRotateDeg: -90,
    screenCornerRadiusPct: 0.03,
    screenInsetPct: 1,
    screenNative: { width: 2064, height: 2752 },
    notch: null,
    keepMaterials: [
      "sTxjZEaaZCEAdSG",
      "asTuNFUpfGPjMcx",
      "YCcebkAXtICaczr",
      "DVJDZUsBtkmFcUI",
      "HsAPHiTgUtTYmiz",
      "AyDTMpfiGqgZKCy",
      /*
       * The ultra-wide lens and the flash, which share one material.
       *
       * Both are single domes on the bump -- 8.5mm at (114.9, 254.6) and
       * 3.5mm at (129.0, 241.9) -- and the model authors them near-black and
       * glossy (0.022, roughness 0.1). Without this the finish pass reads
       * them as body and repaints them in the selected colour, which turns
       * the second camera into a blank silver disc: the lens is not missing,
       * it is painted over. The wide camera escaped only because its glass
       * happens to sit on `sTxjZEaaZCEAdSG`, which was already kept.
       */
      "zwvjNESxlDTOtJp",
    ],
    /*
     * `ndwzBqEeWjhbAAd` is the wide camera's rim, an annulus of inner radius
     * 4.98mm and outer 5.40 wrapping cover glass of 5.00. `CyYMSQWHZHooFQu`
     * is the stand-in for the second lens, 12.03mm along the bump from it.
     *
     * The copy clears the first camera's rim by 1.24mm and the LiDAR by 5.34,
     * and stays inside the camera plateau on every edge.
     */
    cameraCopies: [{ from: "ndwzBqEeWjhbAAd", onto: "CyYMSQWHZHooFQu" }],
    screenFlipY: true,
    /*
     * Converted with `--root DgiadvLtuFUnohu --rotate-x 30.5 --rotate-y 180`.
     *
     * Three things had to happen to get a tablet out of this file. It is an
     * ASSEMBLY of an iPad, a Magic Keyboard and an Apple Pencil -- 283 x 218 x
     * 305mm all told, because the whole thing is standing up -- so `--root`
     * takes the tablet alone. The tablet is POSED in that keyboard, tilted
     * back, and measured 282 x 188 x 112mm instead of 282 x 216 x 7; 30.5
     * degrees of pitch levels it, found by sweeping for the angle that
     * minimises depth. And its screen then faced +Z, so the yaw turns it to
     * meet the studio's default pose.
     *
     * The file also needed flattening before any of that: its geometry hangs
     * off a payload to a nested layer, and three's reader does not resolve
     * those -- it loaded zero meshes until `usdcat --flatten` composed it.
     */
    credit: "Apple — design resources (ipad-pro-silver.usdz)",
  },
  {
    id: "apple-macbook-neo",
    label: "MacBook Neo",
    /*
     * Turned to face the camera. The stage's default yaw shows this file's
     * back, and the screen is the side worth opening on.
     */
    modelYawDeg: 180,
    modelPath: `${MODELS}/m-baecd0e112e97dca.glb`,
    hideHints: [],
    /*
     * 278.2 x 174.2mm measured in the lid's plane, aspect 1.5966 -- 16:10,
     * which no other Mac in this list is. The MacBook Pro 14 and the Air are
     * both 1.539, so this panel is a different shape rather than a different
     * size of the same one, and its diagonal works out at 12.9 inches.
     *
     * `screenNative` is therefore an ASSUMPTION. 2560 x 1600 is the 16:10
     * retina resolution that fits, but this model is of a machine that has no
     * published spec, so it is a guess where every other entry here is a
     * measurement.
     */
    finishIds: ["macbook-blush", "macbook-citrus", "macbook-indigo", "macbook-silver"],
    screenMaterial: "hXtiMyeKExVbRFQ",
    /*
     * The four surfaces that ARE the finish, found by area rather than by
     * colour.
     *
     * The chroma rule that worked on the phones fails outright here. This
     * machine's outside is `KHHvFZfpkvtZonL` on the lid (296 x 194mm, and
     * yellow) but `UPulTUSNtwaSJxl` on the base (296 x 207mm, and authored
     * WHITE) -- so the rule kept the entire bottom half and painted the lid,
     * which rendered as a lavender lid on an off-white body: two colours the
     * machine does not come in, neither of them the one it does.
     *
     * Biggest panels win. The lid, the base, the deck and the rim are the
     * finish; the twelve black shells, the bezel, the keyboard and the screen
     * are not.
     */
    finishMaterials: [
      "KHHvFZfpkvtZonL",
      "UPulTUSNtwaSJxl",
      "KVZSQhfJQHQvYgL",
      "rdGooAQcPGBkiCj",
      "CIyTCPGAldnNfGM",
      "ULqkeDqArmhsrXJ",
      "LpPERdJkupwUXNF",
      "MyFKZJwTFMkKJZH",
      "XrZvzuidKgCcMWr",
      "RNuqjmcXvvUnMcF",
      "wzVnkwDCLKpZtry",
      "eQGVTkgZBnOSOIe",
    ],
    /*
     * Panels stated as offsets from the finish, measured against the lid shell
     * the same way the iMac's are -- authored lightness and saturation in
     * sRGB, inverted through `shiftLightness`. Citrus reproduces the file, and
     * Indigo gets the same relationships in blue.
     *
     * Without these every one of these surfaces came out the flat finish
     * colour, and two things disappeared: the keys, which are lighter than
     * the deck they sit in, and the logo.
     */
    materialColors: {
      // The keycaps -- authored #fffeaa against the shell's #f5f381. That gap
      // is what separates the keys from the deck at a glance.
      LpPERdJkupwUXNF: { lighten: 0.38, saturate: 1.18 },
      MyFKZJwTFMkKJZH: { lighten: 0.38, saturate: 1.18 },
      XrZvzuidKgCcMWr: { lighten: 0.2, saturate: 0.88 },
      /*
       * The lid logo: 36 x 42mm dead centre of the lid, and authored only six
       * percent darker than the shell around it. Painted the flat finish
       * colour it was mathematically identical to the lid and vanished
       * completely.
       *
       * Six percent is not enough on its own either -- what makes it read on
       * the hardware is that it is a polished inlay in a matte panel, so it
       * catches the room where the lid does not. Hence the roughness and the
       * envMapIntensity: the logo is a difference in FINISH more than a
       * difference in colour.
       */
      rdGooAQcPGBkiCj: {
        darken: 0.06,
        saturate: 0.82,
        roughness: 0.18,
        metalness: 0.7,
        envMapIntensity: 1.8,
      },
      // Recessed: the rim, the hinge shoulder and the port bay.
      RNuqjmcXvvUnMcF: { darken: 0.12, saturate: 0.51 },
      eQGVTkgZBnOSOIe: { darken: 0.12, saturate: 0.51 },
      wzVnkwDCLKpZtry: { darken: 0.02, saturate: 0.79 },
    },
    screenFlipY: true,
    screenCornerRadiusPct: 0.012,
    screenInsetPct: 1,
    screenNative: { width: 2560, height: 1600 },
    notch: null,
    /*
     * Needed the same flatten-and-repack as the MacBook Pro 14 -- three's
     * crate reader failed with "Unsupported scalar type 55" and produced
     * nothing. `usdzip` then dropped the texture directory and the convert
     * came up one PNG short, so the archive is rebuilt by hand instead:
     * stored, no compression, every file's data aligned to 64 bytes.
     *
     * 297.2 x 198.5 x 281.3mm open. No finish list, because the machine has
     * no announced colourway to restrict it to -- the file itself is yellow.
     */
    credit: "Apple — design resources (macbook-neo.usdz)",
  },
  {
    id: "apple-macbook-pro-14",
    label: "Apple MacBook Pro 14\"",
    /*
     * Turned to face the camera. The stage's default yaw shows this file's
     * back, and the screen is the side worth opening on.
     */
    modelYawDeg: 180,
    modelPath: `${MODELS}/m-ddbfa960dc4cc05d.glb`,
    hideHints: [],
    /*
     * Measured IN THE LID'S OWN PLANE, not from the bounding box.
     *
     * The lid is open and tilted back, so every mesh on it has a box that
     * grows in both Y and Z and states nothing useful about the panel. Along
     * the lid this one is 300.8 x 195.5mm, aspect 1.5387 against the real
     * 14-inch panel's 1.5397 -- a 0.06% error, which is the display and
     * nothing else.
     *
     * `gGmExFByNnyrwMm` was here first and was wrong: it is on SEVEN meshes,
     * two of them lid layers behind the panel and three of them the base --
     * the bottom cover, the inner shell and a deck plate. So the screenshot
     * was bound to the underside of the laptop and to the keyboard deck, and
     * the display, being a different material, stayed black. A material is
     * only safe to bind a screen to if it is unique to the screen.
     */
    /*
     * Apple sells the 14-inch Pro in two, and this file is the Space Black
     * one: its largest panel states #565457 at metalness 1, which is that
     * anodising rather than aluminium catching the room.
     */
    finishIds: ["space-black", "silver"],
    screenMaterial: "HlQwFCAPWzetDQy",
    screenCornerRadiusPct: 0.012,
    screenInsetPct: 1,
    screenNative: { width: 3024, height: 1964 },
    notch: null,
    /*
     * The five surfaces that ARE the finish. Everything else in the file --
     * around two dozen materials: bezel, hinge, keyboard well, keycaps,
     * legends, Touch ID, ports, feet, internals -- keeps what Apple authored.
     *
     * `HdeQgqDhVRltuvQ`, `XvtJEVWVvyDeJRR` and `zNRfbdNyoCOxSDD` are the
     * aluminium shells, `gGmExFByNnyrwMm` the bottom cover and the layers
     * behind the display, and `WiyOPYJEeiHNVjF` the trackpad -- which is
     * interior to the deck and still body, one of the reasons no positional
     * rule separates these from the keyboard.
     *
     * This replaced a sixteen-name `keepMaterials` that had already been wrong
     * twice: once when the screenshot bound to seven meshes including the
     * underside, and once when the surfaces around the keys came out in the
     * body colour. Both were materials nobody had thought to deny.
     */
    finishMaterials: [
      "HdeQgqDhVRltuvQ",
      "XvtJEVWVvyDeJRR",
      "zNRfbdNyoCOxSDD",
      "gGmExFByNnyrwMm",
      "WiyOPYJEeiHNVjF",
    ],
    /*
     * The two speaker grilles -- a pair of 13.9 x 106.5mm plates flanking the
     * keyboard, 12 vertices between them.
     *
     * They are here rather than simply left out of `keepMaterials`, and that
     * distinction is the whole bug. The model states them black and punches
     * the holes with an OPACITY MAP (`yZHxHesWWWUpuZv.jpg` on the red channel,
     * plus a normal map for the dimples), letting the deck show through from
     * behind. The converter cannot carry that map, but it does carry the fact
     * that the material is blended -- so the glTF says `alphaMode: "BLEND"`
     * over a fully opaque colour, three sets `transparent = true`, and the
     * finish pass hands the material to the GLASS branch, which adjusts
     * reflections and never touches colour. Dropping them from
     * `keepMaterials` therefore changed nothing at all: they stayed black
     * because they were never reaching the body branch to begin with.
     *
     * `materialColors` is what gets them out of that branch: it runs ahead of
     * the transparency test, so a stated colour reaches them, where
     * `bodyMaterials` alone only changed which branch they fell into.
     *
     * Made visible by ROUGHNESS, not by colour.
     *
     * Darkening alone has no good setting. A quarter step under the deck read
     * as a grey stripe someone had painted on the aluminium; an eighth was
     * still a stripe; a twentieth disappeared. That is because the difference
     * being modelled is not one of colour at all -- the panel is the same
     * aluminium as the deck, and what sets it apart on the hardware is that
     * several thousand half-millimetre holes SCATTER the light the deck
     * reflects.
     *
     * So the band is nearly the deck's colour and answers the room quite
     * differently: rough where the deck is polished, and taking a fraction of
     * the environment. It reads as an inset at any angle without ever reading
     * as paint, which is what the holes actually do at this size.
     */
    /*
     * The grille is `alphaMode: "BLEND"` over an opaque colour -- the
     * converter carries the blend flag from an opacity map it cannot carry
     * itself -- so without this it falls to the glass branch, which never
     * touches colour, and stays black whatever else is set.
     */
    bodyMaterials: ["YMmdfGRsPviDXYd"],
    speakerGrille: {
      material: "YMmdfGRsPviDXYd",
      byFinish: {
        // Bright and dead matte against polished aluminium.
        silver: { lighten: 0.6, roughness: 0, metalness: 0.67, envMapIntensity: 0 },
        // A shade under the deck, and reflecting nearly three times as much --
        // on a black machine the reflection is the only thing there is to
        // differ in.
        "space-black": {
          darken: 0.1,
          roughness: 0.73,
          metalness: 0,
          envMapIntensity: 2.85,
        },
      },
    },
    materialColors: {
      /*
       * The key legends. Authored as a flat 0.8 grey with no map, so left to
       * the finish pass they picked up the body colour and the whole keyboard
       * was lettered in Cosmic Orange. White on every finish, which is what
       * the backlit keys are.
       */
      quuXrfeUujYrUMo: "#ffffff",

    },
    screenFlipY: true,
    /*
     * The one model here that is not flat. It arrives OPEN -- 311.7 x 211.6 x
     * 300.4mm -- and is left that way, because a closed laptop is a slab and
     * the whole point of putting a screenshot on one is that the lid is up.
     *
     * The stage frames on whichever side runs out first rather than on height,
     * which is what makes this possible at all: normalising to height alone
     * would scale a landscape body to one unit TALL and put it one and a half
     * units wide, filling the frame edge to edge.
     *
     * Needed the same `usdcat --flatten` as the iPad. Worse, actually: three's
     * crate reader failed outright on this one with "Unsupported scalar type
     * 55" and produced no geometry at all, and the file also carries a Color
     * variant set that has to be composed down before anything can read it.
     */
    credit: "Apple — design resources (macbook-pro-14-in-space-black-variant.usdz)",
  },
  {
    id: "apple-imac-24",
    label: "Apple iMac 24\"",
    /*
     * Turned to face the camera. The stage's default yaw shows this file's
     * back, and the screen is the side worth opening on.
     */
    modelYawDeg: 180,
    modelPath: `${MODELS}/m-812007bce13a9c7c.glb`,
    hideHints: [],
    /*
     * 520.1 x 292.0mm in the panel's own plane, aspect 1.7811 against
     * 4480 x 2520's 1.7778. Measured in-plane because the screen tilts back
     * about eight degrees, which foreshortens its bounding box to 289.2mm and
     * would have made the aspect look wrong by two percent.
     */
    screenMaterial: "FBoFbQxFTGDSJfj",
    finishIds: [
      "imac-blue",
      "imac-purple",
      "imac-pink",
      "imac-orange",
      "imac-yellow",
      "imac-green",
      "imac-silver",
    ],
    /*
     * The two-tone enclosure, carried through every finish.
     *
     * An iMac is not one colour: the rear shell is deep and saturated and the
     * chin in front of it is pale, and painting both with the finish -- which
     * is what happens to any material that just falls through to the body
     * branch -- collapses that into a flat slab. It is the single most
     * recognisable thing about this machine.
     *
     * So each panel states its own offset FROM the finish rather than a colour
     * of its own. None of these numbers is chosen by eye: each is the panel's
     * authored lightness and saturation measured against the REAR SHELL's in
     * sRGB, then inverted through `shiftLightness`, so picking Blue reproduces
     * the file exactly and picking Yellow gives the same relationships in
     * yellow.
     *
     * Which panel is the reference matters more than the arithmetic. The first
     * version measured against `BaYfiGSQafXWMJP` -- picked as the chromatic
     * material on the most meshes, which turns out to be the twelve
     * Thunderbolt connectors, not a panel at all. Every offset came out
     * relative to a port, so the whole machine rendered a pale wash. The shell
     * is `gsFcgkEVeCyWNEt`, the single 548 x 373mm surface, and it takes the
     * finish untouched -- which is why it is absent from the table below.
     */
    materialColors: {
      /*
       * The stand. Lighter than the shell AND polished where the shell is
       * blasted matte -- on the hardware it is the one part that throws a
       * proper highlight, and with the shell's own roughness it read as the
       * same flat slab continuing downward.
       */
      CXQIHleaUtrytdw: {
        lighten: 0.41,
        saturate: 0.78,
        roughness: 0.28,
        metalness: 0.62,
        envMapIntensity: 1.5,
      },
      // The chin and the panel behind it: lighter, and matte like the shell.
      bwhllwxfTuQUeTe: { lighten: 0.41, saturate: 0.78 },
      McYhbkQhRgXsulg: { lighten: 0.41, saturate: 0.78 },
      hjBHiqduEUsTjWz: { lighten: 0.52, saturate: 1.0 },
      OxCRqvrJBBjZaSz: { lighten: 0.6, saturate: 1.0 },
      shbEUnsXpTPWhzR: { lighten: 0.3, saturate: 0.48 },
      EawlUsidsXxTKSk: { lighten: 0.3, saturate: 0.48 },
      TFWpUowOykkxbOj: { lighten: 0.28, saturate: 0.26 },
      /*
       * The woven power cord.
       *
       * Apple braids it in the machine's own colour -- it is the one cable
       * they colour-match -- and it was in `keepMaterials`, so a pink iMac
       * trailed a white lead. Kept because it is authored white and textured,
       * which is exactly the shape of thing that rule was meant to protect.
       *
       * Lifted and desaturated off the finish rather than set to it: the braid
       * is fabric, so it reads paler and softer than the anodised shell it
       * plugs into. The weave survives -- it lives in the material's own map,
       * and a stated colour multiplies that map rather than replacing it.
       */
      PeoHJzUfJXylKvT: { lighten: 0.34, saturate: 0.55 },
      // Recessed and shadowed: the port bay, the vent and the trim around it.
      BaYfiGSQafXWMJP: { darken: 0.32, saturate: 0.41 },
      HDhDeSCxdQAGYWj: { darken: 0.05, saturate: 0.53 },
      RQgrpgoKrgbmKZd: { darken: 0.65, saturate: 0.39 },
      INOQqKBFDbXxyLJ: { darken: 0.19, saturate: 0.51 },
      FqYoilDNNQXhPEm: { darken: 0.08, saturate: 0.31 },
    },
    /*
     * Everything the file did NOT author as a colour.
     *
     * Picked by measurement rather than by eye, because these models carry
     * thirty-odd materials each and naming the wrong one is invisible until
     * someone switches finish. A material follows the finish only if it has
     * real chroma, is not textured, is not polished to a mirror, and sits
     * within 60 degrees of the body's hue. Everything else is kept.
     *
     * The last two tests are what stop the obvious version being wrong: a
     * mirror finish is a lens or a contact rather than a panel, and an
     * off-hue metal is a different substance entirely.
     */
    keepMaterials: [
      "YxfzGNleNQMFMrR",
      "wugwtfdQOByMWZn",
      "BgxFiSggCXLzjkS",
      "LMQHrYWjYSLyjsA",
      "HcXeXWGnYpAxYia",
      "llvxOmqBTHaCsLN",
      "fqrjVUYlmCEhncX",
      "DZizbSGEdVauBiQ",
      "KJBYmZgvVcBUSvC",
      "TNnXTeNhIPYkOsa",
      "VNbdnbBXcjtnKdJ",
      "vprnhkKaWJfLVCe",
      "OtjAwuWiGXjZVfW",
      "LyDqttVHFnVIjqu",
      "OnfBadaKkpAPVzM",
      "KCzcUVmPRfCcGrd",
    ],
    screenFlipY: true,
    // Square, like the Studio Display and unlike everything portable here.
    screenCornerRadiusPct: 0,
    screenInsetPct: 1,
    screenNative: { width: 4480, height: 2520 },
    notch: null,
    /*
     * Converted with `--root lXCRCNUacPtLDKW`, after the same flatten and
     * hand-repack the MacBook needed. The file is an assembly: the other two
     * roots are the Magic Mouse (57.1 x 21.6 x 113.9mm) and the Magic
     * Keyboard (278.9 x 16.4 x 115.2mm), both dropped.
     *
     * 547.6 x 460.9 x 177.2mm against Apple's published 547 x 461.
     *
     * The one thing to know about this model: the enclosure is TWO-TONE, a
     * deep blue back against a pale blue chin, and the finish pass paints one
     * colour. Picking a finish therefore flattens it. Left that way rather
     * than half-fixed, because the honest fix is to carry each panel's own
     * lightness relative to the body through the finish, which is a change to
     * the finish pass and not to this entry.
     */
    credit: "Apple — design resources (imac-with-accessories-blue.usdz)",
  },
  {
    id: "apple-studio-display",
    label: "Apple Studio Display",
    modelPath: `${MODELS}/m-9113e92474234ca9.glb`,
    hideHints: [],
    /*
     * 595.2 x 334.3mm, aspect 1.7803 against 5120 x 2880's 1.7778.
     *
     * NOT the obvious mesh. `ZQLlPihLbCcQtXw` sits right beside it at
     * 596.7 x 335.8 -- a closer aspect, and a dead match for the real 27-inch
     * active area of 596.5 x 335.6 -- so it looks like the better answer and
     * is not the display at all. Ray-testing the middle of the panel against
     * every triangle says it is OPEN there: it is a 0.75mm frame drawn around
     * the edge of the picture, and binding a screenshot to it would have lit
     * a hairline rectangle and left the screen black.
     *
     * The two are coplanar to the last bit -- both at z 1.69577508mm exactly,
     * as is the surround `aQccjubsBUcrILS` -- which normally means
     * z-fighting. Here it does not: all three are nested frames and a fill
     * that TILE the plane rather than stack on it, so no two ever cover the
     * same pixel.
     */
    screenMaterial: "KxgzPwdxWQPjqSG",
    // Square. A desktop display's picture has corners, unlike every phone
    // and tablet above it in this list.
    screenCornerRadiusPct: 0,
    screenInsetPct: 1,
    screenNative: { width: 5120, height: 2880 },
    notch: null,
    /*
     * Everything that is not the enclosure.
     *
     * Inverted from the usual list because this model is the opposite shape
     * to the phones: two materials are aluminium -- `TQKNDCPAZitfZzq` on the
     * stand and `wTRySRHltaosTlU` on the body, both stating the same
     * 0.661/0.677/0.692 at metalness 0.8 -- and the other twenty-three are
     * glass, bezel, camera, speaker slats and internals that should not move
     * when a finish is picked. Naming the two that DO follow the finish and
     * keeping the rest is the shorter and the more robust statement.
     */
    keepMaterials: [
      "qtjedrcDjVtNUGz",
      "HhqelzPoDtNmTrb",
      "HfkYMcykYVUNXtT",
      "rvQwufwYKYlOZAD",
      "gXrvflTESmJUXOz",
      "mrPfbpQfWbCqgYU",
      "OyPPZCedKdhpDtS",
      "lieRsyonMJFJlVP",
      "xKfSTPilyNRwkqI",
      "jmflzZVCxiEidBC",
      "aQccjubsBUcrILS",
      "ZQLlPihLbCcQtXw",
      "IQAXNupDLRkLyTT",
      "FVZdyPciOOojoEH",
      "MgvEhXTdNNZtzJa",
      "gQOUAgKDzqkQTZA",
      "TNLmHgxtvVZHOpu",
      "SPGLzkHBBAPFwQE",
      "jkwvXOHrNwcBvrF",
      "QTqAYcbOuuZQiAn",
      "tMEyZYQuXWlUvvx",
      "IFFseTomZZQFAcW",
      "vlHqjqyELAjiygG",
    ],
    // Silver is the only one Apple sells, so the picker shows one swatch.
    finishIds: ["silver"],
    screenFlipY: true,
    /*
     * Converted with `--rotate-y 180`, and this one needed no flattening at
     * all -- no payloads, no variant sets, 81 meshes in a single crate that
     * three's reader took first time.
     *
     * 622.7 x 530.1 x 285.4mm with the stand. The width is the fact worth
     * checking: 622.7 against Apple's published 622.8, which is what says the
     * file is a Studio Display and the "xdr" in its name is Apple's own asset
     * naming rather than a Pro Display XDR, whose panel is 717.9mm across.
     */
    credit: "Apple — design resources (studio-display-xdr.usdz)",
  },
  {
    /*
     * Not a device: the uploaded artwork itself, as a card on the stage.
     *
     * It earns its place in this list because everything downstream is already
     * device-agnostic -- the camera transform sits on a wrapper group, the fit
     * is measured off a bounding box, the shadow reads the canvas alpha and the
     * export reads the canvas. Registering it here is what gives it the whole
     * studio for free.
     */
    id: "image-card",
    label: "Image card",
    kind: "image",
    hideHints: [],
    // Nothing here is measured off a model, because there is no model. The
    // aspect comes from the image, and the rest does not apply.
    screenCornerRadiusPct: 0,
    screenInsetPct: 0,
    screenNative: { width: 1000, height: 1000 },
    notch: null,
    credit: "Generated geometry -- nothing third-party to licence.",
  },
];

/*
 * Named, not `DEVICES[0].id`.
 *
 * The list is ordered for the picker -- iPhones, then iPad, then laptops,
 * then desktops -- and reordering it for that reason silently changed which
 * model the studio opens on, and which one `useGLTF.preload` fetches before
 * anything is chosen. The default should be a deliberate choice: the 17 Pro
 * is the most worked-over model here, so it is the one to land on.
 */
export const DEFAULT_DEVICE_ID = "apple-iphone-17-pro";

/** Can this device be opened and shut? Only a model with a hinge clip can. */
export function canFold(device: Device): boolean {
  return Boolean(device.fold);
}

export function getDevice(id: string | undefined): Device {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0];
}
