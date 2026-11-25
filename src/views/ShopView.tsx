import {Award, Coffee, Info, Palette, Sparkles, Ticket} from 'lucide-react';
import {useState} from 'react';
import type {UserProfile} from '../shared/types';

interface ShopViewProps {
  user: UserProfile;
}

interface PlaceholderReward {
  id: string;
  title: string;
  category: string;
  cost: number;
  description: string;
  icon: typeof Award;
}

const PLACEHOLDER_REWARDS: PlaceholderReward[] = [
  {
    id: 'badge-canopy',
    title: 'Canopy Guardian Crest',
    category: 'Digital Badge',
    cost: 120,
    description: 'Showcase a brushed titanium emerald leaf crest beside your profile username.',
    icon: Award,
  },
  {
    id: 'theme-bioluminescent',
    title: 'Bioluminescent Moss Theme',
    category: 'Profile Theme',
    cost: 200,
    description: 'Custom profile banner accent and twilight moss surface highlight palette.',
    icon: Palette,
  },
  {
    id: 'coupon-campus-cafe',
    title: 'Campus Reusable Cup Discount',
    category: 'Future Partner Coupon',
    cost: 350,
    description: 'Planned partner perk: 15% off drinks when bringing a reusable tumbler.',
    icon: Coffee,
  },
  {
    id: 'coupon-transit',
    title: 'Local Bike Share Day Pass',
    category: 'Future Partner Coupon',
    cost: 500,
    description: 'Planned student mobility reward for verified Sustainable Commute streaks.',
    icon: Ticket,
  },
];

export function ShopView({user}: ShopViewProps) {
  const [selectedReward, setSelectedReward] = useState<PlaceholderReward | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Reward Shop Preview
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Preview upcoming digital badges, profile themes, and partner perks.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-5 py-3">
          <p className="text-xs text-[var(--text-secondary)]">Your EcoPoints</p>
          <p className="font-mono-tabular text-xl font-bold text-[var(--accent-primary)]">
            {user.eco_points} pts
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
        <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
        <span>
          Reward redemption is a placeholder preview for this MVP. Your EcoPoints balance is tracked
          securely in the server ledger, and no payments or real-world fulfillment are processed.
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {PLACEHOLDER_REWARDS.map((item) => {
          const Icon = item.icon;
          const canAfford = user.eco_points >= item.cost;
          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">{item.category}</span>
                  <span className="inline-flex items-center gap-1 font-mono-tabular text-xs font-semibold text-[var(--accent-primary)]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.cost} pts
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Icon className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
                  <h2 className="font-display text-lg font-semibold">{item.title}</h2>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReward(item)}
                className="min-h-[42px] w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-2 text-xs font-semibold hover:bg-[var(--bg-surface-elevated)] transition-colors"
              >
                {canAfford ? 'Preview Reward (Coming Soon)' : `Need ${item.cost - user.eco_points} more pts`}
              </button>
            </div>
          );
        })}
      </div>

      {selectedReward && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">{selectedReward.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{selectedReward.description}</p>
            <p className="text-xs text-amber-400">
              Placeholder Item ({selectedReward.cost} EcoPoints): Redemption will unlock in a future
              release once campus partner codes are connected.
            </p>
            <button
              type="button"
              onClick={() => setSelectedReward(null)}
              className="w-full min-h-[42px] rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-primary-fg)]"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
