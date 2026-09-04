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
  fold?: { openSec: number; closedSec: number };
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
  /** Licence + author. Required for anything that ships. */
  credit: string;
}

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
    id: "apple-iphone-17-pro",
    label: "Apple iPhone 17 Pro",
    modelPath: `${MODELS}/apple-iphone-17-pro.glb`,
    hideHints: [],
    finishIds: ["cosmic-orange", "deep-blue", "silver"],
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
       *
       * 0.07, and it is a LIGHTNESS lift rather than a mix toward white --
       * see the note at the override. Mixing white in desaturates as it
       * brightens, and the panel read as pale rather than as the same colour
       * lit better.
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
    // The real panel. This model ships no baked wallpaper to measure instead,
    // and a screenshot off a 17 Pro is exactly this size.
    screenNative: { width: 1206, height: 2622 },
    notch: null,
    // Measured 72.8 x 149.6 mm against Apple's published 71.9 x 150.0.
    credit: "Apple — design resources (iphone-17-pro-e-sim.usdz)",
  },
  {
    id: "apple-iphone-17-pro-max",
    label: "Apple iPhone 17 Pro Max",
    modelPath: `${MODELS}/apple-iphone-17-pro-max.glb`,
    hideHints: [],
    finishIds: ["cosmic-orange", "deep-blue", "silver"],
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
  {
    id: "apple-iphone-air",
    label: "Apple iPhone Air",
    modelPath: `${MODELS}/apple-iphone-air.glb`,
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
    id: "iphone-fold",
    label: "iPhone Fold",
    modelPath: `${MODELS}/iphone-fold.glb`,
    hideHints: [],
    // Two screens in this model: "OLED" is the outer cover display and
    // "OLED IN" the inner one that folds. The match is exact, so naming one
    // binds only that one -- the other keeps the model's own wallpaper.
    screenMaterial: "OLED IN",
    // Just the mirror. An earlier reading added a 90 degree turn as well, on
    // the strength of test cards that could not tell the two apart -- a square
    // card is rotation-blind, and a portrait one came back upright either way.
    // A card carrying a CIRCLE settled it: the panel maps the source upright,
    // so the turn was doing nothing except sending the crop to the wrong axis,
    // which is what stretched every portrait source across the panel.
    screenRotateDeg: 90,
    screenFlipX: true,
    // TEXCOORD_0 on the inner panel spans u 0..1, v 0..1 -- a square, over a
    // 1.42 mesh.
    screenUvAspect: 1,
    // Black at 0.336 alpha, laid straight over the OLED prim on the same mesh.
    // "Glass flex" veils the inner panel, "Glass" the cover one -- black at
    // 0.336 and 0.211 alpha respectively, both sitting directly over their
    // screen. Measured with a step wedge: the inner one multiplied everything
    // by a flat 0.686, and a constant ratio across the range is what says
    // "layer on top" rather than "tone curve".
    screenOverlayHide: ["Glass flex", "Glass"],
    // The back panel. Transparent in the file, body in every other sense.
    // The back panel and the camera island. Both authored as a 0.84 grey with
    // an alpha of 0.94, so both fell through the finish pass as glass.
    bodyMaterials: ["Frosted glass", "Tinted glass"],
    logoMaterials: ["Metal tint"],
    // Matched to the side button in the same model, which is the look this is
    // after: a light grey that reads as milled metal rather than as paint.
    logoColor: "#9c9c9c",
    // The outer panel, measured at 77.2 x 115.1mm in the file. Upright and
    // the right way round without help, unlike the inner one.
    coverScreen: {
      material: "OLED",
      native: { width: 772, height: 1151 },
      // TEXCOORD_0 on the cover panel: u 0..1, v 0.3138..1.0.
      uvRect: { y: 0.3138, h: 0.6862 },
      // Its UVs run right to left, like the inner panel's: text bound to it
      // came back reversed when read from outside the closed phone, which is
      // the only side this screen is ever seen from.
      flipX: true,
    },
    // The clip closes the phone: the leaves are parallel at t=0 and have swung
    // 180 degrees onto each other by t=2, holding shut to 5. Rendering both
    // ends settled which way round it goes -- "parallel leaves" describes
    // flat-open and folded-shut equally well, so the angle alone cannot say.
    fold: { openSec: 0, closedSec: 2 },
    // Open, this model puts its inner screen on the face the stage's default
    // yaw turns AWAY from -- so it opened showing the back, and the big screen
    // the device exists for was behind it. Half a turn here rather than a new
    // camera default, so one convention still holds across the registry.
    modelYawDeg: 180,
    // The inner panel measures 158.9 x 111.9mm in the file, so the mockup is
    // authored landscape. Portrait would letterbox against the mesh.
    screenNative: { width: 1589, height: 1119 },
    screenCornerRadiusPct: 0.045,
    screenInsetPct: 1,
    // A book fold has no notch on the inner panel; the cameras sit in the
    // outer half.
    notch: null,
    // TODO: unconfirmed. Supplied as `iPhone fold.glb`; provenance and licence
    // still to be established before this ships anywhere public.
    credit: "UNKNOWN — provenance not yet confirmed",
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

export const DEFAULT_DEVICE_ID = DEVICES[0].id;

export function getDevice(id: string | undefined): Device {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0];
}
