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

## Deploying

No CI is configured — the original workflows were tied to another org's Vercel project and
were removed. Deploy from the Vercel dashboard, or add a workflow using the Vercel CLI with
your own `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as repo secrets.

`wrangler.jsonc` and `open-next.config.ts` are left in for the Cloudflare/OpenNext path;
ignore them if you deploy to Vercel.
