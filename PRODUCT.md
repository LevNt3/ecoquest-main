# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary users:** Students and classmates building everyday sustainability habits (energy saving, water conservation, recycling, sustainable transport, digital sustainability, responsible consumption, and general eco-habits) on mobile and desktop web.
- **Moderators / Admins:** Team members reviewing ambiguous quest submissions (`needs_review`) and managing the quest catalog.
- **Demo evaluators:** Course instructors and peers evaluating the 2-day school project demonstration.

## Product Purpose

EcoQuest turns real-world sustainability actions into verifiable daily, weekly, one-time, and special quests. Users start a quest, upload photo evidence, receive conservative AI-assisted verification, earn XP (leveling) and EcoPoints (ledger-tracked future rewards), maintain UTC streaks, and unlock achievements—demonstrating a complete, trustworthy habit loop on a zero-budget free tier.

## Positioning

Unlike honor-system habit trackers or expensive AI wrappers, EcoQuest pairs **conservative server-side vision verification** (`@cf/google/gemma-4-26b-a4b-it` via Cloudflare Workers AI) with an **automatic `needs_review` fallback and human Admin Review Queue** on a strict $0 free-tier budget—refusing to auto-approve unverifiable claims (such as off-camera page counts or quantities) while staying usable even when AI quota is exhausted or offline.

## Operating Context

- **Core user loop:** Browse/filter 13 starter quests across 7 categories → `Start Quest` → capture/upload compressed JPEG/PNG/WebP photo evidence (`<= 5 MB`) with optional note → server-side AI verification (`approved`, `rejected`, or `needs_review`) → atomic reward credit (`finalizeSubmissionTx`) → Dashboard streak & 7-day UTC activity tracking → Profile & Reward Transaction ledger.
- **Moderation loop:** Admin Console (`Review Queue` + `Quest Manager`) allows role-verified admins to inspect private evidence photos, approve or reject `needs_review` submissions (with `approved` terminal), create new quests, and edit/toggle existing quests.
- **Streak & reset rules:** UTC midnight reset with a 1-day grace period (same UTC day keeps streak; `+1` or `+2` UTC days increments; `3+` missed UTC days resets to `1`).
- **Demo environment:** Local/self-hosted Vite + React + Express + SQLite (`./data/ecoquest.db`) prototype; external Supabase PostgreSQL schema (`supabase/migrations/001_initial_schema.sql`) and seed (`supabase/seed.sql`) are preserved as migration blueprints and not yet applied.

## Capabilities and Constraints

- **Zero paid services:** Strict $0 free-tier budget; no paid AI APIs, subscriptions, or paid dependencies.
- **Server-side AI & security:** All Cloudflare credentials (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`), `SESSION_SECRET`, and `ADMIN_PASSCODE` remain strictly server-side. Clients cannot forge AI results, approval status, XP, EcoPoints, or admin role.
- **Rate limits & guards:** 10 AI verifications/hour/user, 1 active/approved submission per quest period, login and admin-claim rate limiting, and terminal `approved` submission status.
- **Non-transactional MVP shop:** `ShopView` displays EcoPoints balance and reward previews as a non-transactional placeholder; spending/redemption is out of scope for the MVP.
- **Undecided / deferred:** Full migration to external Next.js App Router + Supabase repository is deferred until after the 2-day demo.

## Brand Commitments

- **Name:** EcoQuest
- **Privacy-first evidence policy:** Never require selfies, facial recognition, government IDs, or background camera access. Evidence photos are stored privately and can be deleted individually or in bulk by the user without losing earned XP or EcoPoints.
- **Honest AI disclosure:** Clearly disclose external vision-model processing and conservative verification limitations to users.

## Evidence on Hand

- **Working prototype:** Express + SQLite backend (`server.ts`, `server/*`) and React + Vite frontend (`src/views/*`, `src/components/*`) with 13 seeded quests and 8 seeded achievements.
- **Generated visual assets:** `src/assets/images/hero_eco_canopy_1795617618936.jpg`, `quest_digital_notes_1795617620749.jpg`, `quest_sustainable_commute_1795617621118.jpg`, `badge_forest_guardian_1795617620663.jpg`.
- **PWA assets:** `public/manifest.webmanifest`, `public/icons/icon.svg`, `public/icons/icon-maskable.svg`.
- **Absences (do not fabricate):** No real customer testimonials, third-party sustainability certifications, or live reward fulfillment partners exist.

## Product Principles

1. **Conservative verification over false certainty:** Never claim a single photo proves off-camera quantities or durations; route ambiguity to `needs_review`.
2. **Graceful degradation without AI:** Missing credentials, timeouts, or free-tier quota exhaustion must never block quest submission.
3. **Server-authoritative progression:** XP, levels (`25 * (L - 1) * (L + 2)`), EcoPoints, streaks, and achievements are computed and persisted atomically on the server.
4. **Privacy by default:** Collect only the minimum photo evidence needed and let users delete stored photos anytime.

## Accessibility & Inclusion

- Responsive web experience supporting both mobile thumb-zone navigation and desktop sidebar workflows, with semantic status indicators (icon + text, not color alone) and dark/light theme support.
