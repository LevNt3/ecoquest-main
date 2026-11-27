import {ArrowRight, Camera, Leaf, Search} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import type {AppRoute} from '../components/AppShell';
import {StatusIndicator} from '../components/StatusBadge';
import {
  apiFetch,
  formatCategoryLabel,
  formatDifficultyLabel,
  formatQuestTypeLabel,
} from '../lib/api';
import {
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_TYPES,
  type QuestItem,
} from '../shared/types';

interface QuestExplorerViewProps {
  onNavigate: (route: AppRoute, slug?: string) => void;
}

export function QuestExplorerView({onNavigate}: QuestExplorerViewProps) {
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [questType, setQuestType] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<string>('all');

  useEffect(() => {
    let active = true;
    apiFetch<{quests: QuestItem[]}>('/api/quests')
      .then((res) => {
        if (!active) return;
        setQuests(res.quests);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Nem sikerült betölteni a küldetéseket');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredQuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quests.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (questType !== 'all' && item.quest_type !== questType) return false;
      if (difficulty !== 'all' && item.difficulty !== difficulty) return false;
      if (q && !item.title.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [quests, category, questType, difficulty, search]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Küldetésfelfedező
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Szűrj napi, heti, egyszeri és különleges küldetésekre 7 fenntarthatósági kategóriában.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-12">
          <div className="relative sm:col-span-6">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Keresés (pl. kulacs, digitális, ingázás)..."
              aria-label="Küldetések keresése"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] pl-10 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Szűrés kategória szerint"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <option value="all">Minden kategória</option>
              {QUEST_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {formatCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              aria-label="Szűrés nehézség szerint"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <option value="all">Minden nehézség</option>
              {QUEST_DIFFICULTIES.map((diff) => (
                <option key={diff} value={diff}>
                  {formatDifficultyLabel(diff)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quest Type Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[var(--bg-canvas)] p-1">
          {[
            {id: 'all', label: 'Összes küldetés'},
            ...QUEST_TYPES.map((t) => ({id: t, label: formatQuestTypeLabel(t)})),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setQuestType(tab.id)}
              className={`eq-interactive-btn min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                questType === tab.id
                  ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-[var(--bg-surface)] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </div>
      ) : filteredQuests.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-10 text-center space-y-3">
          <Leaf className="mx-auto h-7 w-7 text-[var(--text-secondary)]" aria-hidden="true" />
          <p className="font-display text-base font-semibold">Nincs a szűrőknek megfelelő küldetés</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategory('all');
              setQuestType('all');
              setDifficulty('all');
            }}
            className="min-h-[40px] rounded-xl border border-[var(--border-hairline)] px-4 py-2 text-xs font-semibold hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            Szűrők visszaállítása
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuests.map((quest, idx) => (
            <button
              key={quest.id}
              type="button"
              data-spotlight
              style={{'--eq-delay': `${Math.min(idx, 8) * 85}ms`} as React.CSSProperties}
              onClick={() => onNavigate('quest-detail', quest.slug)}
              className="eq-animate-card group flex flex-col justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 text-left transition-[transform,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-lime-500/60 hover:bg-[var(--bg-surface-elevated)]/45 active:scale-95"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--text-secondary)] truncate">
                    {formatCategoryLabel(quest.category)}
                  </span>
                  <StatusIndicator status={quest.user_status || 'available'} />
                </div>

                <div>
                  <h2 className="font-display text-lg font-semibold group-hover:text-[var(--accent-primary)] transition-colors">
                    {quest.title}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {formatQuestTypeLabel(quest.quest_type)} · {formatDifficultyLabel(quest.difficulty)} ·{' '}
                    {quest.estimated_minutes} perc
                  </p>
                </div>

                <p className="text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-2">
                  {quest.description}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[var(--border-hairline)] pt-3.5 text-xs">
                <span className="font-mono-tabular font-semibold text-[var(--accent-primary)]">
                  +{quest.xp_reward} XP · +{quest.eco_points_reward} pont
                </span>
                <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Fotó</span>
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-1 group-hover:text-[var(--accent-primary)]"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
