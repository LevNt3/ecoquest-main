import {BadgePercent, Bus, Info, Sandwich, Sparkles, Trash2, TreePine, UtensilsCrossed} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
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
  icon: typeof TreePine;
}

const PLACEHOLDER_REWARDS: PlaceholderReward[] = [
  {
    id: 'plant-a-tree',
    title: 'Fák ültetése',
    category: 'Környezeti jutalom',
    cost: 250,
    description:
      'Váltsd be az EcoPointjaidat egy valódi faültetési programra: minden beváltás egy őshonos csemete elültetését támogatja.',
    icon: TreePine,
  },
  {
    id: 'canteen-discount',
    title: 'Büfé kedvezmény',
    category: 'Iskolai partnerkedvezmény',
    cost: 300,
    description:
      'Tervezett kedvezmény az iskolai büfében: az EcoPointjaidért 10% árengedményt kapsz egy fenntartható ételre vagy italra.',
    icon: BadgePercent,
  },
  {
    id: 'school-recycling-bins',
    title: 'Több szemetes az iskola területére',
    category: 'Iskolai fejlesztés',
    cost: 400,
    description:
      'Az EcoPointjaidból további szelektív gyűjtőket helyezünk el az iskola udvarán és folyosóin, hogy mindenki könnyebben szelektálhasson.',
    icon: Trash2,
  },
  {
    id: 'free-canteen-item',
    title: 'Ingyenes termék a büféből',
    category: 'Iskolai partnerkedvezmény',
    cost: 200,
    description:
      'Tervezett jutalom: egy ingyenes, fenntartható termék (például gyümölcs vagy újratölthető ital) az iskolai büféből.',
    icon: Sandwich,
  },
  {
    id: 'monthly-transit-pass',
    title: 'Bérlet bejárós diákoknak egy hónapig',
    category: 'Fenntartható mobilitás',
    cost: 500,
    description:
      'Tervezett jutalom: egy hónapos helyi bérlet bejárós diákoknak, hogy az autós ingázás helyett tömegközlekedést válasszanak.',
    icon: Bus,
  },
  {
    id: 'fast-food-coupon',
    title: 'Kupon bármilyen gyorsétterembe',
    category: 'Partnerkupon',
    cost: 350,
    description:
      'Tervezett partnerkupon: kedvezmény bármely részt vevő gyorsétteremben, ha fenntarthatóbb csomagolást választasz.',
    icon: UtensilsCrossed,
  },
];

export function ShopView({user}: ShopViewProps) {
  const [selectedReward, setSelectedReward] = useState<PlaceholderReward | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedReward) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedReward(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [selectedReward]);

  function openRewardModal(item: PlaceholderReward) {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setSelectedReward(item);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Jutalombolt előnézet
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Tekintsd meg a tervezett jutalmakat: támogathatsz faültetést és iskolai fejlesztéseket,
            vagy válthatsz büfé- és éttermi kedvezményeket.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-5 py-3">
          <p className="text-xs text-[var(--text-secondary)]">EcoPoints egyenleged</p>
          <p className="font-mono-tabular text-xl font-bold text-[var(--accent-primary)]">
            {user.eco_points} pont
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        <Info className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" aria-hidden="true" />
        <span>
          A jutalombeváltás ebben az MVP demóban előnézeti funkció. Az EcoPoints egyenleged
          biztonságosan rögzítésre kerül a szerver főkönyvében, valódi beváltás még nem történik.
        </span>
      </div>

      <div className="grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDER_REWARDS.map((item) => {
          const Icon = item.icon;
          const canAfford = user.eco_points >= item.cost;
          return (
            <div
              key={item.id}
              data-spotlight
              style={{'--eq-delay': `${PLACEHOLDER_REWARDS.indexOf(item) * 85}ms`} as React.CSSProperties}
              className="eq-animate-card flex flex-col justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-lime-500/60"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">{item.category}</span>
                  <span className="inline-flex items-center gap-1 font-mono-tabular text-xs font-semibold text-[var(--accent-primary)]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.cost} pont
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Icon className="h-5 w-5 text-[var(--accent-emerald)] shrink-0" aria-hidden="true" />
                  <h2 className="font-display text-lg font-semibold">{item.title}</h2>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>
              </div>

              <button
                type="button"
                onClick={() => openRewardModal(item)}
                className="eq-interactive-btn min-h-[42px] w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-2 text-xs font-semibold hover:border-lime-500/40 hover:bg-[var(--bg-surface-elevated)]"
              >
                {canAfford ? 'Jutalom előnézete (Hamarosan)' : `Még ${item.cost - user.eco_points} pont szükséges`}
              </button>
            </div>
          );
        })}
      </div>

      {selectedReward && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shop-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedReward(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="eq-animate-banner w-full max-w-md rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4">
            <h3 id="shop-modal-title" className="font-display text-lg font-semibold">
              {selectedReward.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">{selectedReward.description}</p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Előnézeti elem ({selectedReward.cost} EcoPoints): A beváltás egy későbbi verzióban nyílik
              meg a jutalmazási partnerek csatlakoztatása után.
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setSelectedReward(null)}
              className="eq-interactive-btn w-full min-h-[42px] rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-primary-fg)]"
            >
              Előnézet bezárása
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
