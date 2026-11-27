---
name: EcoQuest
description: Dark-first Forest Obsidian sustainability quest & habit ledger with crisp lime/emerald accents and tabular telemetry.
colors:
  canopy-lime: "#84cc16"
  canopy-lime-fg: "#061109"
  canopy-lime-light: "#4d7c0f"
  emerald-verified: "#10b981"
  emerald-verified-light: "#059669"
  forest-obsidian: "#070d0a"
  pine-surface: "#0e1713"
  moss-elevated: "#14221b"
  mist-text: "#f1f7f3"
  lichen-muted: "#92a89c"
  sage-canvas: "#f4f7f5"
  sage-surface: "#ffffff"
  sage-elevated: "#eaf1ec"
  ink-obsidian: "#0b1611"
  slate-moss: "#4a5d52"
  amber-review: "#fbbf24"
  rose-rejected: "#fb7185"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: "tnum"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.canopy-lime}"
    textColor: "{colors.canopy-lime-fg}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.pine-surface}"
    textColor: "{colors.mist-text}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    height: "44px"
  card-surface:
    backgroundColor: "{colors.pine-surface}"
    textColor: "{colors.mist-text}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.forest-obsidian}"
    textColor: "{colors.mist-text}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "42px"
---

# Design System: EcoQuest

## Overview

**Creative North Star: "The Field Journal"**

EcoQuest is a calm, grounded, evidence-led sustainability ledger. Rather than leaning on loud gamification or glossy gradients, the interface treats real-world eco-actions like field entries: dark nocturnal surfaces recede behind crisp botanical lime actions, tabular XP/EcoPoints telemetry, and unboxed metadata.

The system defaults to a dark-first Forest Obsidian mode and pairs seamlessly with a Light Sage toggle via CSS custom properties. Surfaces rely on quiet tonal stepping and subtle hairline borders rather than drop shadows, keeping photo evidence, verification criteria, and daily quest progress immediately scannable on both mobile thumb-zones and desktop workstations.

**Key Characteristics:**
- Dark-first nocturnal canvas with a Light Sage theme parity toggle
- High-contrast botanical lime primary actions paired with emerald verification states
- Translucent liquid-glass surfaces floating over a fixed botanical aurora, still with zero drop shadows
- Tabular monospace numerals for all XP, EcoPoints, streaks, and confidence scores
- Icon-plus-text semantic status indicators that never rely on color alone

## Colors

A disciplined nocturnal botanical palette anchored by deep obsidian greens and high-contrast lime and emerald accents, with semantic amber and rose reserved strictly for review and rejection states.

### Primary
- **Canopy Lime** (`canopy-lime` / `canopy-lime-light`): Drives primary CTAs (`Start Your First Quest`, `Submit a Quest`, `Publish Quest`), active tab pills, and active level indicators. Paired with deep dark foreground text (`canopy-lime-fg`) in dark mode and crisp white in light mode.

### Secondary
- **Emerald Verified** (`emerald-verified` / `emerald-verified-light`): Signals verified quest completions, approved submissions, unlocked achievements, and admin shield badges.

### Neutral
- **Forest Obsidian & Pine Surface** (`forest-obsidian`, `pine-surface`, `moss-elevated`): Three-step dark tonal hierarchy separating the page canvas from cards and elevated hover/selected states, mirrored by **Sage Canvas & Surface** (`sage-canvas`, `sage-surface`, `sage-elevated`) in light mode.
- **Mist Text & Lichen Muted** (`mist-text`, `lichen-muted`): Primary and secondary text ink in dark mode, paired with `ink-obsidian` and `slate-moss` in light mode.
- **Hairline Borders**: Translucent lime-tinted hairlines in dark mode (`rgba(163, 230, 53, 0.12)`) and cool slate hairlines in light mode (`rgba(15, 23, 42, 0.1)`) define boundaries without heavy chrome.

### Named Rules
**The Rare Lime Rule.** Canopy Lime is reserved for primary actions, active navigation/tab states, and key progress markers; never flood card backgrounds or body copy with it.
**The Semantic Clarity Rule.** Verification statuses (`approved`, `needs_review`, `rejected`, `in_progress`, `pending`) always pair a distinct Lucide icon with explicit text and semantic tint.

## Typography

**Display Font:** Plus Jakarta Sans (with `system-ui, sans-serif` fallback)
**Body Font:** DM Sans (with `system-ui, sans-serif` fallback)
**Label/Mono Font:** JetBrains Mono (with `ui-monospace, monospace` fallback, `tabular-nums` enabled)

**Character:** Geometric, friendly, and crisp—Plus Jakarta Sans gives quest titles and headings structured clarity, DM Sans keeps multi-step instructions effortless to read, and JetBrains Mono locks every XP counter, streak day, and confidence percentage into aligned columns.

### Hierarchy
- **Display** (`700`, `2.25rem`–`3.75rem` / `36px`–`60px`, `1.15` line-height, `-0.025em` tracking): Landing hero headline and major marketing statements.
- **Headline** (`700`, `1.5rem`–`1.875rem` / `24px`–`30px`, `1.25` line-height, `-0.02em` tracking): Page headers (`Dashboard`, `Admin Console`, `Settings`).
- **Title** (`600`, `1rem`–`1.125rem` / `16px`–`18px`, `1.4` line-height): Quest card titles, section headings, and modal headers.
- **Body** (`400`, `0.875rem`–`1rem` / `14px`–`16px`, `1.6` line-height): Quest descriptions, step-by-step instructions, and privacy disclosures.
- **Label / Telemetry** (`600`, `0.75rem` / `12px`, `1.4` line-height, `tabular-nums`): Metadata lines (`Category · Difficulty · Duration`), XP/EcoPoints counters, and status indicators.

### Named Rules
**The Tabular Telemetry Rule.** Every numeric progression value (XP, level progress, EcoPoints, UTC streak days, AI confidence %) uses `JetBrains Mono` with `font-variant-numeric: tabular-nums` so numbers never jitter when updated.

## Layout

EcoQuest separates public entry from the authenticated workspace using two complementary spatial shells:
- **Public Shell:** Sticky 3-zone top bar (`max-w-7xl` centered, `16px`–`24px` horizontal padding) with brand mark on the left, 4 anchor links in the center (`hidden md:flex`), and a single primary CTA on the right.
- **Authenticated App Shell:**
  - **Desktop (`>= 1024px`):** Fixed `240px` left sidebar on `pine-surface` with brand header, vertical nav items, and a bottom user/logout footer; main content flows in a generous padded container (`space-y-6` to `space-y-8`).
  - **Mobile (`< 1024px`):** Fixed `64px` thumb-zone bottom navigation bar (`lg:hidden`) keeping core routes (`Dashboard`, `Explore`, `Shop`, `Profile`, `Settings`) within one-handed reach.
- **Grid Rhythm:** 3-column KPI strips (`sm:grid-cols-3`), 2-column review/form grids (`md:grid-cols-2`), and `max-w-3xl` single-column reading/settings layouts.

## Elevation & Depth

EcoQuest is a **flat, tonally layered** system with **zero drop shadows**. Depth and hierarchy are communicated exclusively through surface stepping (`forest-obsidian` canvas → `pine-surface` cards → `moss-elevated` interactive states) and `1px` hairline borders. Overlays on photographic hero cards use a dark vertical gradient scrim (`from-black/85 via-black/30 to-transparent`) to guarantee legible white text.

### Named Rules
**The Zero-Shadow Rule.** Never add `box-shadow` elevation to cards, buttons, or nav bars; convey containment with `1px` hairline borders and tonal surface steps.

### Liquid Glass Layer

Every surface that uses the `--bg-surface` token automatically receives a translucent **liquid glass** material, inspired by iOS Liquid Glass:

- **Ambient aurora:** the page canvas paints three fixed radial gradients (`--aurora-lime`, `--aurora-emerald`, `--aurora-teal`) so the glass has color to refract while scrolling.
- **Material:** `--bg-surface` is a semi-transparent tint (`rgba(255, 255, 255, 0.58)` in Light Sage, `rgba(18, 30, 24, 0.55)` in Dark Forest) with `backdrop-filter: blur(18px) saturate(165%)`.
- **Specular rim:** a masked `1px` gradient ring (`::before`) traces a bright top-left highlight that fades toward the bottom-right, imitating a lit glass edge.
- **Sheen:** a diagonal low-alpha white gradient adds the characteristic curved-glass reflection.
- **Zero shadows preserved:** depth still comes from translucency, blur, and the specular rim — never `box-shadow`.
- **Fallback:** browsers without `backdrop-filter` receive a near-opaque surface tint so text contrast never drops.

The material is scoped by the `bg-[var(--bg-surface)]` attribute selector, so cards, the sidebar, modals, and panels stay in lockstep across both themes without per-component classes.

## Shapes

- **Compact Controls (`8px` radius):** Top-bar CTAs, segmented filter buttons, and compact admin toggles.
- **Interactive Controls (`12px` radius):** Primary/secondary action buttons, text inputs, selects, and textareas.
- **Containers & Cards (`16px` radius):** KPI cards, quest cards, review queue items, settings sections, and hero media frames.
- **Progress & Avatars (`9999px` pill):** XP progress bars and circular status dots.

## Components

Tactile, crisp, and restrained—controls use generous touch targets (`40px`–`44px` minimum height), hairline borders, and subtle opacity or surface shifts on hover.

### Buttons
- **Shape:** Smoothly rounded corners (`12px` for primary/feature buttons, `8px` for compact header/tab controls).
- **Primary:** Solid Canopy Lime fill with dark obsidian text (`10px 20px` padding, `44px` min-height), transitioning opacity on hover (`hover:opacity-90`).
- **Secondary / Outline:** Pine Surface fill with `1px` hairline border and Mist text, shifting to Moss Elevated on hover.
- **Destructive:** Soft rose tint (`rgba(244, 63, 94, 0.1)`) with rose hairline border and rose text for evidence deletion and rejection actions.

### Cards / Containers
- **Corner Style:** Gently rounded containers (`16px` radius).
- **Background:** Pine Surface in dark mode, pure white in light mode.
- **Shadow Strategy:** Flat; zero drop shadows.
- **Border:** `1px solid` hairline border.
- **Internal Padding:** `20px` (`p-5`) for dense data/review cards; `24px` (`p-6`) for settings and form panels.

### Inputs / Fields
- **Style:** Recessed Forest Obsidian canvas fill inside Pine Surface cards, `1px` hairline border, `12px` radius, `8px 14px` padding (`42px` min-height).
- **Focus:** Explicit `2px` lime focus-visible outline (`outline-offset: 4px`) for keyboard navigation.

### Navigation
- **Style:** Left `240px` sidebar on desktop with `12px`-rounded nav items (`44px` min-height); active route highlighted with Moss Elevated surface and Canopy Lime text/icon. Mobile switches to a `64px` bottom tab bar.

### Status Indicator
- **Signature Component:** Inline icon-plus-text indicator (`12px` medium weight, `6px` icon-to-label gap, `whitespace-nowrap`) rendering `Completed` / `Approved` (emerald check), `In Progress` (lime play), `Needs Review` (amber alert), `Pending` (slate clock), `Rejected` (rose cross), or `Available` (slate compass) without heavy pill chrome.

## Do's and Don'ts

### Do:
- **Do** use CSS custom properties (`--bg-canvas`, `--bg-surface`, `--accent-primary`) so Dark Forest and Light Sage themes stay in lockstep.
- **Do** pair every status color with a Lucide icon and explicit text label.
- **Do** format all XP, EcoPoints, streak counts, and confidence scores with `JetBrains Mono` and `tabular-nums`.
- **Do** keep quest metadata inline and unboxed (`Category · Difficulty · Duration`).

### Don't:
- **Don't** add drop shadows (`box-shadow`) to cards or buttons; preserve flat tonal layering.
- **Don't** wrap every metadata tag in nested pill badges inside cards.
- **Don't** use Canopy Lime for large background fills or long-form body text.
- **Don't** disable or override `prefers-reduced-motion` safeguards.
