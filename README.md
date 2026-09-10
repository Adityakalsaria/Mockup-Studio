# mockup-studio

The Kosh device studio — a 3D phone stage for rendering app screens as stills and video —
plus the koshmoney.com site it was built inside.

Copied from the `mockup-studio` branch of the Kosh website repo.

## Requirements

- Node 22+ (developed on 25.x)
- npm — the repo ships `package-lock.json`

## Setup

```bash
npm install
npm run dev
```

Then open:

- **http://localhost:3000/mockup-studio** — the studio (editor, timeline, export)
- http://localhost:3000/mockup-studio/classic — the earlier non-3D version

`npm install` is not optional. `next.config.ts` imports `@content-collections/next`; without
the install, the config fails to load and every route dies.

`npm run dev` uses webpack (`next dev --webpack`), not Turbopack.

## Environment

**The studio needs none.** It reads only `NODE_ENV`, so it runs fully offline with no
credentials.

The rest of the site (marketing pages, referral routes) reads the variables documented in
`.env.example`. Copy it to `.env.local` and fill in what you need:

```bash
cp .env.example .env.local
```

Without `NEXT_PUBLIC_BACKEND_API` the site still builds and renders — only backend-backed
routes degrade, e.g. `/r/<code>` and `/odyssey/<code>` return 404 for every code.

## Layout

```
src/app/mockup-studio/            routes (page, classic, layout)
src/features/mockup-studio/       the studio itself
  ├── MockupStudioClient.tsx     top-level client component
  ├── PhoneStage3D.tsx         r3f scene, GLB device
  ├── StudioEnvironment.tsx    HDRI lighting
  ├── editor/                  EditorShell, Timeline, TopBar, RightPanel, editorState
  ├── screens/                 the app screens rendered onto the phone
  ├── recordVideo.ts           MP4/WebM capture
  └── renderVideoExact.ts      frame-exact export
public/figma-assets/mockup-studio/  studio assets (~24 MB, incl. GLB phone models)
src/components/                shared UI — see docs/design-system.md
docs/                          design system + implementation notes
```

The studio imports only four things from outside its own folder: `@/components/KoshLogo`,
`@/components/ui/Button`, `@/components/ui/GlassCard` and `@/lib/metadata`.

## Scripts

| command                | what it does                          |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | dev server on :3000                   |
| `npm run build`        | production build                      |
| `npm start`            | serve the production build            |
| `npm run lint`         | eslint                                |
| `npm run check:system` | design-system guardrails (`scripts/`) |
| `npm run convert:model` | USDZ → GLB, for adding a device (see below) |

## Adding a device

Device models are **GLB**. They arrive as **USDZ** — Apple publishes its design
resources that way — and `scripts/usdz-to-glb.mjs` is the one-way trip between the
two. Nothing loads USDZ at runtime, and nothing should: three's USD reader cannot
read the binary crate inside most archives at all, and Apple's own site does not
render USDZ in a browser either — it ships one for AR Quick Look, the native
viewer, and pre-rendered image sequences for everything you actually see.

```sh
npm run convert:model -- <in.usdz> public/figma-assets/mockup-studio/models/<id>.glb
```

Useful flags, all of which exist because a real archive needed them:

| flag | for |
| --- | --- |
| `--root <prim>` | an archive holding several devices side by side — Apple ships the Pro and Pro Max in one file |
| `--rotate-y 180` | a component that comes out back-to-front; the studio expects a screen facing −Z |
| `--rotate-x N` | a device posed rather than laid flat (the iPad ships tilted in a Magic Keyboard) |
| `--fold <pose>` | a foldable whose open state is a USD *variant* rather than an animation; names the open one and builds the clip |
| `--iris <material>` | a camera whose aperture blades arrive beside the lens instead of inside it; names their material and recentres them |
| `--iris-lens <n>` | which lens the iris belongs to, counted from the bottom. The blades do not start nearest their own camera, so the default guess can be wrong; the script prints the lenses it found |
| `--max-texture N` | cap on map size, default 2048 |
| `--roughness-range lo,hi` | the band the roughness map is remapped into, default `0.28,0.62` — Apple authors around 0.17, which renders as chrome under this stage's rig |

Then add an entry to `src/features/mockup-studio/devices.ts`. The renderer needs no
changes: screen size, position and facing are **measured from the geometry** at load,
so an entry supplies only what geometry cannot say — corner radius, notch, and the
material names the finish system binds to. Record the source archive in `credit`.

**Requires macOS `usdcat`** (ships with the OS). It is used to compose the archive to
ASCII, which is where material names come from — `USDComposer` never sets them, and
without them the studio can never find a device's screen. Without `usdcat` the script
warns and continues, producing a model with unnamed materials.

## Deploying

No CI is configured — the original workflows were tied to another org's Vercel project and
were removed. Deploy from the Vercel dashboard, or add a workflow using the Vercel CLI with
your own `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as repo secrets.

`wrangler.jsonc` and `open-next.config.ts` are left in for the Cloudflare/OpenNext path;
ignore them if you deploy to Vercel.
