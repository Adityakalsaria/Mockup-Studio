# Website Implementation Cycle

Use this cycle for every new Figma-to-code task.

## 1. Intake
- Collect Figma node links and expected behavior.
- Confirm target route/component and affected variants/states.
- Confirm breakpoint expectations at `390`, `768`, and `1440`.

## 2. System alignment
- Add or update required tokens first in `src/app/globals.css`.
- If a value does not map to an existing token, create a token before component edits.
- Use `src/lib/breakpoints.ts` for viewport and media-query logic.

## 3. Implementation
- Implement shared behavior in `src/components/ui` or `src/components/layout`.
- Keep section-level composition in `src/components/sections`.
- Avoid direct hex literals in shared component surfaces.

## 4. Verification
- Run `npm run check:system`.
- Run `npm run lint`.
- Run `npm run build`.
- Capture screenshots for `390`, `768`, and `1440`.

## 5. Delivery packet
Send this with every review:
- Figma node links used.
- 3 screenshots (`390`, `768`, `1440`).
- Notes for hover/active/focus/disabled states.
- Confirmation that token and breakpoint checks passed.
