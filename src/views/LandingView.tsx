import {ArrowRight, Award, Camera, CheckCircle2, Flame, Leaf, ShieldCheck, Zap} from 'lucide-react';
import type {AppRoute} from '../components/AppShell';

interface LandingViewProps {
  isAuthenticated: boolean;
  onNavigate: (route: AppRoute, slug?: string) => void;
}

const SAMPLE_QUESTS = [
  {
    slug: 'digital-learner',
    title: 'Digital Learner',
    meta: 'Digital Sustainability · Daily · Easy · 20 min',
    rewards: '+30 XP · +15 EcoPoints',
    description: 'Write at least two pages of study notes digitally instead of using disposable paper.',
    image: '/src/assets/images/quest_digital_notes_1795617620749.jpg',
  },
  {
    slug: 'sustainable-commute',
    title: 'Sustainable Commute',
    meta: 'Sustainable Transport · Daily · Medium · 30 min',
    rewards: '+50 XP · +25 EcoPoints',
    description: 'Walk, cycle, or take public transportation for a suitable campus or errand journey.',
    image: '/src/assets/images/quest_sustainable_commute_1795617621118.jpg',
  },
  {
    slug: 'refill-hero',
    title: 'Refill Hero',
    meta: 'Water Conservation · Daily · Easy · 5 min',
    rewards: '+25 XP · +10 EcoPoints',
    description: 'Use a reusable water bottle at a tap or refill station instead of buying single-use plastic.',
    image: null,
  },
];

const LEVEL_TIERS = [
  {level: 1, title: 'Seedling', xp: 0},
  {level: 2, title: 'Sprout', xp: 100},
  {level: 3, title: 'Sapling', xp: 250},
  {level: 4, title: 'Canopy Ranger', xp: 450},
  {level: 5, title: 'Forest Guardian', xp: 700},
];

export function LandingView({isAuthenticated, onNavigate}: LandingViewProps) {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[var(--border-hairline)]">
        <div className="mx-auto grid max-w-7xl items-stretch gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:py-20">
          <div className="flex flex-col justify-center space-y-6 lg:col-span-6">
            <p className="text-xs font-medium tracking-wide text-[var(--accent-primary)]">
              Gamified Sustainability Habits
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Turn daily eco-actions into measurable progress.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
              Complete real-life energy, water, recycling, and low-carbon quests. Submit photo
              evidence for transparent AI-assisted review, build UTC streaks, and level up.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="group eq-interactive-btn inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate('signup')}
                    className="group eq-interactive-btn inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90"
                  >
                    <span>Start Your First Quest</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="eq-interactive-btn inline-flex min-h-[44px] items-center rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-semibold hover:bg-[var(--bg-surface-elevated)]"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] lg:col-span-6 min-h-[300px]">
            <img
              src="/src/assets/images/hero_eco_canopy_1795617618936.jpg"
              alt="Modern architectural eco-pavilion surrounded by temperate forest canopy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4 text-white">
              <div>
                <p className="text-xs text-lime-300">Active Quest Loop</p>
                <p className="mt-1 font-display text-lg font-semibold">
                  13 Starter Quests Across 7 Impact Categories
                </p>
              </div>
              <span className="font-mono-tabular text-sm font-semibold text-lime-300">
                100% Non-Purchase Habits
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How the Quest System Works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl space-y-2">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl text-balance">
            How EcoQuest Verifies Real-World Action
          </h2>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">
            Every quest pairs clear instructions with honest, conservative photo verification.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              step: '01. Choose a Quest',
              icon: Leaf,
              copy: 'Pick from Daily, Weekly, One-time, or Special Event quests matched to your day—no purchases required.',
            },
            {
              step: '02. Capture Evidence',
              icon: Camera,
              copy: 'Take a photo or upload an image only when you choose. Photos stay in private storage and can be deleted anytime.',
            },
            {
              step: '03. Earn XP & Streaks',
              icon: ShieldCheck,
              copy: 'Cloudflare Workers AI evaluates only visible evidence. Ambiguous submissions queue safely for human admin review.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-3"
              >
                <Icon className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold">{item.step}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sample Quests Showcase */}
      <section id="sample-quests" className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl text-balance">
              Starter Sustainability Quests
            </h2>
            <p className="text-sm text-[var(--text-secondary)] sm:text-base">
              Practical everyday actions designed for students, campuses, and households.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(isAuthenticated ? 'quests' : 'signup')}
            className="text-sm font-semibold text-[var(--accent-primary)] hover:underline whitespace-nowrap"
          >
            Explore All 13 Quests →
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {SAMPLE_QUESTS.map((quest, idx) => (
            <article
              key={quest.slug}
              style={{'--eq-delay': `${idx * 90}ms`} as React.CSSProperties}
              className="eq-animate-card flex flex-col overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-lime-500/60"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--bg-surface-elevated)]">
                {quest.image ? (
                  <img
                    src={quest.image}
                    alt={quest.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-950/80 to-lime-950/40 p-6 text-center">
                    <Leaf className="h-8 w-8 text-lime-400" aria-hidden="true" />
                    <span className="font-display text-sm font-medium text-emerald-200">
                      Water Conservation Challenge
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-secondary)]">{quest.meta}</p>
                  <h3 className="font-display text-lg font-semibold">{quest.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {quest.description}
                  </p>
                </div>
                <p className="font-mono-tabular text-xs font-semibold text-[var(--accent-primary)]">
                  {quest.rewards}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* XP & Level Preview */}
      <section id="progression" className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="space-y-4 lg:col-span-5">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent-primary)]">
                <Zap className="h-4 w-4" aria-hidden="true" />
                <span>Dual-Currency Progression</span>
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl text-balance">
                Earn XP to Level Up. Bank EcoPoints for Future Rewards.
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                XP tracks your long-term environmental mastery across levels, while EcoPoints are
                recorded in an immutable ledger for future digital badges and campus rewards.
              </p>
              <div className="flex items-center gap-6 pt-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-amber-700 dark:text-amber-500" aria-hidden="true" />
                  <span>UTC Streaks + 1-Day Grace</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-[var(--accent-emerald)]" aria-hidden="true" />
                  <span>8 Unlockable Milestones</span>
                </span>
              </div>
            </div>

            <div className="space-y-3 lg:col-span-7">
              {LEVEL_TIERS.map((tier, idx) => (
                <div
                  key={tier.level}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-primary)]">
                      LVL {tier.level}
                    </span>
                    <span className="text-sm font-medium">{tier.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block h-1.5 w-28 overflow-hidden rounded-full bg-[var(--bg-surface-elevated)]">
                      <div
                        className="h-full bg-[var(--accent-primary)]"
                        style={{width: `${Math.min(100, (idx + 1) * 20)}%`}}
                      />
                    </div>
                    <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
                      {tier.xp} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Environmental Mission */}
      <section id="mission" className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 sm:p-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8 space-y-3">
            <h2 className="font-display text-2xl font-bold tracking-tight">Our Environmental Mission</h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
              Sustainable change starts with small, repeatable daily choices—turning off idle lights,
              carrying a reusable bottle, sorting household waste cleanly, and choosing low-carbon
              commutes. EcoQuest is built around privacy-first habits without requiring purchases,
              tracking locations, or collecting personal identity photos.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--accent-emerald)] shrink-0" aria-hidden="true" />
              <span>Private evidence storage with instant delete</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--accent-emerald)] shrink-0" aria-hidden="true" />
              <span>Zero purchase requirements</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--accent-emerald)] shrink-0" aria-hidden="true" />
              <span>Server-verified rewards &amp; transparent AI limits</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
