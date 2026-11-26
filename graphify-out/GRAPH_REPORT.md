# Graph Report - ecoquest-main  (2026-11-26)

## Corpus Check
- Corpus is ~30,147 words - fits in a single context window. You may not need a graph.

## Summary
- 294 nodes · 632 edges · 18 communities (14 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Frontend Views & Routing
- Express Server & SQLite DB
- Cloudflare AI Vision & Tests
- Dev Dependencies & Tooling
- TypeScript Compiler Config
- Runtime Package Dependencies
- Field Journal Design System
- Auth Forms & Zod Schemas
- Vite & Tailwind Build Config
- NPM Project Scripts
- App Icons & Hero Visuals
- Shop Preview Modal
- Core Architecture & Progression
- React Entry Point
- Quest Card Illustrations
- Zero-Budget & AI Constraints
- Moderation & Fallback Policy
- Mandatory Verification Gate

## God Nodes (most connected - your core abstractions)
1. `apiFetch()` - 23 edges
2. `createApiRouter()` - 21 edges
3. `UserProfile` - 20 edges
4. `App()` - 16 edges
5. `compilerOptions` - 16 edges
6. `AppRoute` - 14 edges
7. `lucide-react` - 13 edges
8. `AdminView()` - 13 edges
9. `QuestDetailView()` - 13 edges
10. `react` - 12 edges

## Surprising Connections (you probably didn't know these)
- `startServer()` --calls--> `createApiRouter()`  [EXTRACTED]
  server.ts → server/routes.ts
- `AuthenticatedRequest` --references--> `UserProfile`  [EXTRACTED]
  server/routes.ts → src/shared/types.ts
- `SeedQuest` --references--> `QuestCategory`  [EXTRACTED]
  server/db.ts → src/shared/types.ts
- `SeedQuest` --references--> `QuestDifficulty`  [EXTRACTED]
  server/db.ts → src/shared/types.ts
- `SeedQuest` --references--> `QuestType`  [EXTRACTED]
  server/db.ts → src/shared/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Conservative AI Verification & Admin Fallback Loop** — agents_cloudflare_workers_ai, agents_needs_review_fallback, product_conservative_verification, product_moderation_loop [EXTRACTED 1.00]
- **The Field Journal Design Rules** — design_zero_shadow_rule, design_rare_lime_rule, design_semantic_clarity_rule, design_tabular_telemetry_rule, design_dual_theme_system [EXTRACTED 1.00]
- **Zero-Budget Server-Authoritative Prototype** — agents_runtime_stack, agents_zero_paid_budget, agents_server_authoritative_progression, product_core_user_loop [INFERRED 0.85]

## Communities (18 total, 4 thin omitted)

### Community 0 - "Frontend Views & Routing"
Cohesion: 0.09
Nodes (54): lucide-react, react, AuthenticatedRequest, App(), handleHashChange(), formatHashRoute(), parseHashRoute(), PUBLIC_ROUTES (+46 more)

### Community 1 - "Express Server & SQLite DB"
Cohesion: 0.08
Nodes (46): express, clearSessionCookie(), EPHEMERAL_SECRET, extractTokenFromRequest(), getSessionSecret(), hashPassword(), parseCookies(), requireCsrfHeader() (+38 more)

### Community 2 - "Cloudflare AI Vision & Tests"
Cohesion: 0.12
Nodes (22): buildCloudflareVisionPayload(), buildFallbackResult(), CloudflareVerificationParams, DEFAULT_CLOUDFLARE_MODEL, extractJsonObject(), parseCloudflareVisionResponse(), verifyEvidenceWithCloudflare(), buildFallbackResult() (+14 more)

### Community 3 - "Dev Dependencies & Tooling"
Cohesion: 0.12
Nodes (23): devDependencies, autoprefixer@^10.4.21, esbuild@^0.25.0, tailwindcss@^4.3.3, tsx@^4.21.0, @types/express@^4.17.21, @types/node@^22.14.0, @types/react@^19.3.0 (+15 more)

### Community 4 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+9 more)

### Community 5 - "Runtime Package Dependencies"
Cohesion: 0.12
Nodes (16): dependencies, better-sqlite3@^13.2.0, dotenv@^17.2.3, express@^4.21.2, @google/genai@^2.4.0, lucide-react@^0.546.0, motion@^12.23.24, react@^19.0.1 (+8 more)

### Community 6 - "Field Journal Design System"
Cohesion: 0.18
Nodes (10): AGENTS.md — EcoQuest Contributor & AI Agent Guide, Dual-Theme System (Dark Forest & Light Sage), DESIGN.md — The Field Journal Design System, Spatial Shells (Public Top Bar, Desktop Sidebar, Mobile Bottom Nav), Typography Hierarchy (Plus Jakarta Sans, DM Sans, JetBrains Mono), Google Fonts Stylesheet (DM Sans, JetBrains Mono, Plus Jakarta Sans), index.html — EcoQuest HTML Entry Point, PWA Manifest & App Icons (+2 more)

### Community 7 - "Auth Forms & Zod Schemas"
Cohesion: 0.17
Nodes (9): @hookform/resolvers@^7.0.9, zod@^4.6.7, @hookform/resolvers, zod, AuthLoginSchema, AuthSignupSchema, AuthView(), LoginValues (+1 more)

### Community 8 - "Vite & Tailwind Build Config"
Cohesion: 0.20
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^8.3.0, @vitejs/plugin-react@^6.1.1, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 9 - "NPM Project Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, clean, dev, lint, preview, start, test

### Community 10 - "App Icons & Hero Visuals"
Cohesion: 0.29
Nodes (8): EcoQuest Standard App Icon, EcoQuest Maskable App Icon, Maskable Icon Lime-to-Emerald Leaf Motif, Dark Forest Rounded Icon Frame (#070D0A / #1E3026), Faceted Leaf and Gear Ring Achievement Emblem, Forest Guardian 3D Metallic Badge, Biophilic Forest Architecture & Twilight Canopy Theme, Eco Canopy Forest Pavilion Hero Image

### Community 11 - "Shop Preview Modal"
Cohesion: 0.29
Nodes (4): PLACEHOLDER_REWARDS, PlaceholderReward, ShopView(), ShopViewProps

### Community 12 - "Core Architecture & Progression"
Cohesion: 0.40
Nodes (3): Active Runtime Architecture (React 19, Vite 8, Express 4, SQLite), Core User Habit & Verification Loop, UTC Streak & Reset Rules (1-Day Grace Period)

### Community 14 - "Quest Card Illustrations"
Cohesion: 0.50
Nodes (4): Paperless Digital Notes Quest Illustration, Digital Sustainability / Paperless Note-Taking Habit, Sustainable Urban Cycling & Low-Carbon Transport, Sustainable Bicycle Commute Quest Illustration

## Knowledge Gaps
- **14 isolated node(s):** `Active Runtime Architecture (React 19, Vite 8, Express 4, SQLite)`, `Cloudflare Workers AI (@cf/google/gemma-4-26b-a4b-it)`, `Mandatory Verification Gate (lint, test, build)`, `Spatial Shells (Public Top Bar, Desktop Sidebar, Mobile Bottom Nav)`, `PRODUCT.md — EcoQuest Product Specification` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 85 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Frontend Views & Routing` to `Shop Preview Modal`, `Dev Dependencies & Tooling`, `Runtime Package Dependencies`, `Auth Forms & Zod Schemas`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `createApiRouter()` (e.g. with `requireCsrfHeader()` and `attachOptionalUser()`) actually correct?**
  _`createApiRouter()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Active Runtime Architecture (React 19, Vite 8, Express 4, SQLite)`, `Cloudflare Workers AI (@cf/google/gemma-4-26b-a4b-it)`, `Mandatory Verification Gate (lint, test, build)` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Views & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.08933601609657947 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `Auth Forms & Zod Schemas` to `Express Server & SQLite DB`, `Cloudflare AI Vision & Tests`, `Dev Dependencies & Tooling`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `Express Server & SQLite DB` be split into smaller, more focused modules?**
  _Cohesion score 0.08181818181818182 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Frontend Views & Routing` to `Shop Preview Modal`, `Dev Dependencies & Tooling`, `Runtime Package Dependencies`, `Auth Forms & Zod Schemas`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._