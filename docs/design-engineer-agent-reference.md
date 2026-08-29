# Koshmoney Design Engineer Reference

## Scope

This document backs the Koshmoney Design Engineer agent defined in [AGENTS.md](AGENTS.md).

It is built from:

- the current `Koshmoney.com` repo structure
- the existing website-system and design-system files
- the available local Codex session history from the last roughly three months on this machine, with strongest signal from the recent Koshmoney USD-account and website-system work

This is not a generic style guide. It is a practical reference for building and updating Kosh landing pages inside this repo.

## Session-Derived Product And Design Preferences

These are recurring patterns visible in the available local Koshmoney work:

- The user prefers iterative visual refinement over greenfield redesign.
- Browser-based review loops are common, especially on `/usd-account` and `/website-system`.
- Asset swaps are often exact and section-specific.
- Hover motion should feel premium and restrained.
- Glow effects are usually less preferred than tilt, opacity, and directional shadow.
- Motion should be smooth, subtle, and 60fps-safe.
- Opacity-based handoff is preferred to abrupt swapping.
- The USD account page is treated as a modular product funnel with many surgical improvements rather than full rewrites.
- The website-system route is being used as a living internal reference, not a static design doc.

## Core Design System

### Typography

Source:

- [src/lib/fonts.ts](src/lib/fonts.ts)
- [src/features/design-system/data/foundations.ts](src/features/design-system/data/foundations.ts)

Rules:

- Primary typeface is `Saans`.
- Display typography is bold but controlled, not decorative for its own sake.
- Existing utility classes are part of the system and should be reused.
- Common hierarchy:
  - `type-display` for major hero statements
  - `type-h1` and `type-h2` for section heads
  - `type-body-l` for section lead copy
  - `type-body-m` for supporting paragraph copy
  - `type-action` for buttons
  - `type-micro` for metadata, pills, and helper labels

Representative scale:

- Display: `64/70`
- H1: `48/54`
- H2: `36/42`
- Body L: `20/30`
- Body M: `16/24`
- Micro: `14/21`

### Color System

Source:

- [src/features/design-system/data/foundations.ts](src/features/design-system/data/foundations.ts)

Visual character:

- dark, contrast-led product storytelling
- foreground-led headings
- heavy use of white opacity ramps
- restrained blue accent for links and emphasis
- subtle surface borders rather than loud fills

Important semantic tokens:

- `background`: `#08090A`
- `foreground`: `#F7F9FC`
- `text-primary`: white at `90%`
- `text-secondary`: white at `60%`
- `text-muted`: white at `40%`
- `border`: `#252B36`
- `accent`: `#2563EB`

### Opacity Language

The project already uses standardized opacity stops. Reuse them rather than inventing new arbitrary values.

Common stops:

- white `0.04` for subtle fills
- white `0.06` for dividers
- white `0.10` for borders and chips
- white `0.30` and `0.40` for tertiary text
- white `0.50` and `0.60` for body/supporting text

### Breakpoints

Source:

- [src/lib/breakpoints.ts](src/lib/breakpoints.ts)

Current contract:

- `mobile`: `480`
- `tablet`: `480`
- `laptop`: `1000`
- `desktop`: `1440`

Practical reading:

- mobile first
- meaningful page-width change at laptop
- full desktop spacing at 1440+

### Materials

Source:

- [src/features/design-system/data/materials.ts](src/features/design-system/data/materials.ts)

Material patterns already present:

- dark section fields
- glass cards
- overlay borders
- restrained interactive glow
- layered gradients and subtle image overlays

Use materials to support hierarchy, not as decoration alone.

### Motion

Source:

- [src/features/design-system/DesignSystemPage.tsx](src/features/design-system/DesignSystemPage.tsx)
- current `/website-system/motion`

Rules:

- prefer transform and opacity
- avoid abrupt swap states
- keep hover motion intentional
- loaders should feel calm and ordered
- one strong motion idea per surface is better than several competing effects

Recent project-specific motion decisions:

- medallion hover on USD account badges uses tilt without glow
- dotLottie can be used when a specific hosted asset is requested
- motion studies in website-system should be lightweight and implementation-oriented

## Route Map

### Primary public routes

- `/` homepage story stack
- `/usd-account` USD account conversion page
- `/about`
- `/business`
- `/payments`
- `/rewards`
- `/global-card`

### Internal reference routes

- `/website-system`
- `/website-system/typography`
- `/website-system/spacing`
- `/website-system/colors`
- `/website-system/materials`
- `/website-system/motion`
- `/website-system/button`
- `/website-system/header`
- `/website-system/logo`
- `/website-system/sections`

### Preview and experimental routes

- `/usd-account-list-preview`
- `/usd-account-motion-preview`
- `/design-system/*`

## Current Route Composition

### Homepage

Source:

- [src/app/page.tsx](src/app/page.tsx)

Current stack:

- `Navbar`
- `HeroSection`
- `HeroSecondSection`
- `FourthSection`
- `FutureSection`
- `BusinessCTASection`
- `FAQsSection`
- `FooterSection`
- `FloatingQRCode`

Character:

- cinematic and narrative
- large scroll-driven product storytelling
- layered reveals and strong visual set pieces

### USD Account

Source:

- [src/app/usd-account/page.tsx](src/app/usd-account/page.tsx)
- [src/app/usd-account-list-preview/UsdAccountListPreviewClient.tsx](src/app/usd-account-list-preview/UsdAccountListPreviewClient.tsx)

Current stack:

- `Navbar`
- `UsdHeroSection`
- `UsdValueStrip`
- `KeyFeatures`
- `PowerfulFeatures`
- `Testimonial`
- `StepsToGetUsdAccount`
- `UsdAccountList`
- `MoreThanUsdAccountSection`
- `UsdCtaSection`
- `FAQsSection`
- `FooterSection`

Character:

- modular
- section-led
- product-benefit heavy
- built for rapid visual iteration

## Shared Layout Components

### `Navbar`

Source:

- [src/components/layout/Navbar.tsx](src/components/layout/Navbar.tsx)

Use for:

- primary public top navigation
- top-of-page entry point for conversion CTAs
- pages that should feel part of the main Kosh marketing site

Notes:

- often paired with modal open handlers
- must remain visually compatible with dark hero backgrounds

### `Header`

Source:

- [src/components/layout/Header.tsx](src/components/layout/Header.tsx)

Use for:

- alternate header treatment documented in website-system
- isolated frame or reference usage

### `Container`

Source:

- [src/components/layout/Container.tsx](src/components/layout/Container.tsx)

Use for:

- horizontal safe zone
- consistent content width

### `Footer`

Source:

- [src/components/layout/Footer.tsx](src/components/layout/Footer.tsx)

Use for:

- structural footer primitive where section-level footer treatment is not needed

## Shared UI Components

### `Button`

Source:

- [src/components/ui/Button.tsx](src/components/ui/Button.tsx)

Purpose:

- main CTA system

Use when:

- a section needs a primary, secondary, or prominent action
- you need a button that already understands Kosh light/dark context

Notes:

- variants already documented in component specs
- do not replace with custom one-off button styling unless absolutely necessary

### `Badge`

Source:

- [src/components/ui/Badge.tsx](src/components/ui/Badge.tsx)

Purpose:

- compact label, metadata, or category surface

Use when:

- marking sections, states, or compact trust/utility copy

### `FeatureCard`

Source:

- [src/components/ui/FeatureCard.tsx](src/components/ui/FeatureCard.tsx)

Purpose:

- reusable marketing feature summary card

Use when:

- showing a feature title with supporting copy in a consistent card format

### `FeatureIcons`

Source:

- [src/components/ui/FeatureIcons.tsx](src/components/ui/FeatureIcons.tsx)

Purpose:

- iconography set for feature-led marketing surfaces

### `FloatingCta`

Source:

- [src/components/ui/FloatingCta.tsx](src/components/ui/FloatingCta.tsx)

Purpose:

- persistent floating action surface

Use when:

- you need a lightweight conversion reminder without building a new sticky module

### `LogoMarquee`

Source:

- [src/components/ui/LogoMarquee.tsx](src/components/ui/LogoMarquee.tsx)

Purpose:

- partner or platform social-proof strip

Use when:

- a section needs brand logo movement or credibility reinforcement

### `PlatformStoreIcon`

Source:

- [src/components/ui/PlatformStoreIcon.tsx](src/components/ui/PlatformStoreIcon.tsx)

Purpose:

- store/platform icon rendering

### `CookieBanner`

Source:

- [src/components/ui/CookieBanner.tsx](src/components/ui/CookieBanner.tsx)

Purpose:

- consent surface

### `PhoneFrame`

Source:

- [src/components/ui/PhoneFrame.tsx](src/components/ui/PhoneFrame.tsx)

Purpose:

- device frame wrapper for app screens

Use when:

- a section needs to show app UI in a framed mobile-device presentation

### `AnimatedElement`

Source:

- [src/components/ui/AnimatedElement.tsx](src/components/ui/AnimatedElement.tsx)

Purpose:

- reusable motion wrapper for entrance and reveal behavior

### `FloatingQRCode`

Source:

- [src/components/ui/FloatingQRCode.tsx](src/components/ui/FloatingQRCode.tsx)

Purpose:

- floating download or app-entry utility

Use when:

- a route benefits from ambient app acquisition affordance

### `GlassCard`

Source:

- [src/components/ui/GlassCard.tsx](src/components/ui/GlassCard.tsx)

Purpose:

- translucent elevated surface in Kosh glass style

Use when:

- you want a polished premium layer without inventing another card treatment

### `TrustBadge`

Source:

- [src/components/ui/TrustBadge.tsx](src/components/ui/TrustBadge.tsx)

Purpose:

- compact trust/value item with title and supporting structure

## Section Catalog

Every section below lives in `src/components/sections`.

### Production and core landing sections

- `HeroSection`: homepage hero. Use for the main Kosh opening statement and top-of-funnel conversion surface.
- `HeroSecondSection`: continuation of homepage narrative. Use when you need a second-act hero or deeper storytelling band.
- `FourthSection`: multi-panel homepage showcase with product story cards. Use for large, scroll-led feature storytelling.
- `FutureSection`: forward-looking product capability carousel/strip. Use for showing roadmap-like or breadth-of-product value.
- `BusinessCTASection`: major conversion and reveal section under homepage storytelling. Use near the end of long narrative pages.
- `FAQsSection`: shared FAQ renderer. Use whenever the page needs trust-building Q&A at the bottom.
- `FooterSection`: large marketing footer with offerings and link structure. Use as the default public-site footer section.

### USD account funnel sections

- `UsdHeroSection`: USD account hero. Use at the top of the USD page for named-account positioning and primary CTA framing.
- `UsdValueStrip`: compact value statement strip directly under the hero. Use to reinforce immediate benefit bullets.
- `KeyFeatures`: multi-card feature section for core USD account capabilities. Use when each feature needs a richer visual treatment.
- `PowerfulFeatures`: accordion-like feature list with large visual swap area. Use when one feature is active at a time and imagery changes with selection.
- `Testimonial`: social proof section. Use where a case study or quote is needed to validate the product.
- `StepsToGetUsdAccount`: step-by-step onboarding section. Use for process explanation and onboarding clarity.
- `UsdAccountList`: medallion-heavy section showing expansion beyond a single USD account. Use for multi-account or multi-rail positioning.
- `MoreThanUsdAccountSection`: broader capability section after the account-specific story. Use to widen the product story beyond the hero promise.
- `UsdCtaSection`: focused USD-specific CTA block. Use before FAQs or at the final push point of the funnel.

### Product capability sections

- `OfferingsSection`: product category overview, including wallet, virtual accounts, card, and rewards. Use for high-level breadth framing.
- `VirtualAccounts`: multi-currency virtual account benefits section. Use for account infrastructure and payment rails storytelling.
- `Security`: trust and protection section with structured benefit cards. Use when regulation, encryption, monitoring, or safety needs emphasis.
- `SendReceive`: operational payments section. Use for transfer flows or send/receive messaging.
- `AppShowcase`: mobile product showcase with multiple app benefit states. Use when the app itself is the hero asset.
- `CardShowcase`: card-led product storytelling section. Use for physical or virtual card experiences.
- `DockShowcase`: visual product showcase with a denser, more interactive presentation. Use for experimental or premium visual scenes.
- `FeatureShowcaseSection`: larger feature composition section. Use for rich visual/product demonstrations when simpler cards are insufficient.
- `BelowBentoSection`: follow-up section under a denser hero or bento composition. Use as secondary support after a visually busy block.
- `HowItWorks`: three-step explainer. Use when the flow is simple and should read in one pass.
- `TrustSection`: trust value grid. Use for credibility, service, monitoring, reporting, and support claims.
- `CTA`: generic CTA section. Use when a route needs a broad conversion block but not a USD-specific one.

### Home and navigation support sections

- `HeroPhone`: framed phone component used inside hero systems. Use inside sections that need synchronized phone UI.
- `HeroRandomScatter`: decorative hero scatter system. Use for more experimental hero scenes, not for structured docs.
- `TabExplainer`: tabbed explainer for Kosh product pillars like Wallet, USD Accounts, Card, and Rewards. Use when content should be segmented without leaving the page.
- `ItemListCarousel`: reusable carousel section for cards or items. Use when content is horizontal, repeatable, and navigable.
- `ListOfUsers`: audience segmentation section. Use when showing which customer groups benefit from the product.
- `FutureSection`: roadmap-like feature breadth section. Use for product expansion and adjacent use cases.

### Supporting or route-specific sections

- `HeroSecondSection`: large scroll continuation after homepage hero. Use only when the page has enough story depth to justify a second immersive act.
- `HeroPhone`: helper section-piece rather than a standalone route section.
- `UsdValueStrip`: only use where a compact financial-value strip belongs directly after a hero.
- `UsdCtaSection`: keep scoped to USD or account-conversion pages unless rewritten.

### Experimental or older section inventory

- `FutureSection`, `DockShowcase`, `HeroRandomScatter`, and parts of `FeatureShowcaseSection` are more experimental and visual. Prefer them for inspiration or adaptation before creating entirely new effects.
- `HeroSecondSection` and `FourthSection` are large homepage narrative constructs. Reuse patterns from them carefully; do not transplant them blindly into shorter pages.

### Data-only helper

- `faqs-data.ts`: shared FAQ content source for FAQ-driven routes and JSON-LD.

## How To Use Sections Correctly

### When adding a new landing page

- start with the closest route match
- reuse `Navbar` and `FooterSection` unless there is a clear reason not to
- compose from existing sections first
- only create a new section if the marketing story or content structure is genuinely new

### When updating an existing section

- keep the section’s core layout contract intact
- prefer asset updates, copy changes, motion refinement, and spacing polish over structural rewrites
- preserve existing hook-up points to route composition

### When documenting or evolving the system

- update `/website-system` if the change affects the shared language
- keep design-system docs implementation-aware
- document variant usage and constraints, not just visuals

## Recent Sensitive Areas

These areas have been edited repeatedly and should be changed carefully:

- [src/components/sections/KeyFeatures.tsx](src/components/sections/KeyFeatures.tsx)
- [src/components/sections/PowerfulFeatures.tsx](src/components/sections/PowerfulFeatures.tsx)
- [src/components/sections/UsdAccountList.tsx](src/components/sections/UsdAccountList.tsx)
- [src/features/design-system/DesignSystemPage.tsx](src/features/design-system/DesignSystemPage.tsx)
- [src/app/usd-account-list-preview/UsdAccountListPreviewClient.tsx](src/app/usd-account-list-preview/UsdAccountListPreviewClient.tsx)

Typical edit patterns there:

- exact image swaps
- motion refinement
- hover treatment tuning
- section-order and section-content adjustments
- design-system reference improvements

## Implementation Expectations For The Agent

When the design engineer agent works in this repo, it should:

- inspect the route before changing visuals
- anchor styling to tokens and current type utilities
- reuse sections and primitives before inventing new ones
- optimize for visual clarity and conversion hierarchy
- keep motion subtle and performant
- run targeted lint after edits
- open the relevant local route when asked for visual verification

## If Context Is Unclear

Inspect these files first:

- [src/app/page.tsx](src/app/page.tsx)
- [src/app/usd-account/page.tsx](src/app/usd-account/page.tsx)
- [src/app/usd-account-list-preview/UsdAccountListPreviewClient.tsx](src/app/usd-account-list-preview/UsdAccountListPreviewClient.tsx)
- [src/features/design-system/DesignSystemPage.tsx](src/features/design-system/DesignSystemPage.tsx)
- [src/features/design-system/data/foundations.ts](src/features/design-system/data/foundations.ts)
- [src/features/design-system/data/component-specs.ts](src/features/design-system/data/component-specs.ts)
