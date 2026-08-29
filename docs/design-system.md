# Design System Contribution Guide

This guide defines how to add or update design-system documentation and shared UI rules for `koshmoney.com`.

## Source of truth
- Runtime tokens: `src/app/globals.css`
- Website system route: `src/app/website-system/page.tsx`
- Feature modules: `src/features/design-system/**`
- Breakpoint constants: `src/lib/breakpoints.ts`

## Breakpoint contract
- Device widths: `mobile=390`, `tablet=768`, `desktop=1440`.
- Treat mobile as the base layout.
- Add responsive overrides only at tablet and desktop tiers.
- For runtime JS behavior, use `BREAKPOINT_MEDIA` from `src/lib/breakpoints.ts`.
- For token tables/showcase math, use `BREAKPOINT_PX` from `src/lib/breakpoints.ts`.

## Token model
Use three layers:
1. `primitive`: raw values (for example black/white).
2. `semantic`: intent-based values (background, foreground, muted, surface).
3. `component`: aliases mapped for specific components.

Rule: shared component styles should map to semantic/component tokens, not new hardcoded values.

## Adding a new token
1. Add the runtime token in `globals.css`.
2. Add documentation entry in `src/features/design-system/data/foundations.ts`.
3. Add usage guidance in the relevant design-system section.
4. If token changes visual behavior, update at least one real component example.

## Adding a new component spec
1. Add spec object in `src/features/design-system/data/component-specs.ts`.
2. Include:
   - purpose
   - anatomy
   - variants
   - states
   - interaction
   - accessibility
   - responsive behavior
   - code usage snippet
3. Add a live preview if component is reusable across multiple pages.

## Delivery workflow (hard gate)
Use this sequence for every Figma handoff:
1. Extract specs into tokens first (color/type/spacing/radius/motion).
2. Confirm breakpoint behavior at 390/768/1440 before coding interactions.
3. Implement component using semantic/component tokens only.
4. Validate in `/website-system` showcase at all three breakpoints.
5. Run guardrails + lint + build before merge.

Required review artifacts per cycle:
- Figma node links used for implementation.
- Screenshots at `390`, `768`, and `1440` widths.
- Pass/fail notes for token usage, responsive behavior, and interactive states.

## SEO + AI docs hygiene
- Keep route headings explicit and semantic.
- Maintain FAQ entries as short, unambiguous answers.
- Keep metadata and schema content aligned with on-page content.

## PR checklist
- [ ] Breakpoint behavior verified at 390 / 768 / 1440.
- [ ] No new hardcoded color drift in shared components.
- [ ] Token usage is documented and semantically named.
- [ ] Design system page still renders and is readable on mobile.
- [ ] `npm run check:system` passes for changed scope.
- [ ] `npm run lint` and `npm run build` pass for changed scope.
- [ ] If SEO files are changed, verify `robots.txt` and `sitemap.xml` output locally.
