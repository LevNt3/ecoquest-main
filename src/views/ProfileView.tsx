import {Award, CheckCircle2, Flame, Loader2, Lock, Trash2, Trophy} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import type {AppRoute} from '../components/AppShell';
import {StatusIndicator} from '../components/StatusBadge';
import {apiFetch} from '../lib/api';
import {getLevelTier, LEVEL_TIERS} from '../lib/levels';
import {xpRequiredForLevel, xpToNextLevel} from '../shared/levels';
import type {
  AchievementItem,
  LevelProgress,
  QuestSubmission,
  RewardTransaction,
  UserProfile,
} from '../shared/types';

interface ProfileResponse {
  user: UserProfile;
  levelProgress: LevelProgress;
  completedCount: number;
  submissions: QuestSubmission[];
  transactions: RewardTransaction[];
  achievements: AchievementItem[];
}

interface ProfileViewProps {
  onNavigate: (route: AppRoute, slug?: string) => void;
  onUserSync: (user: UserProfile, levelProgress: LevelProgress) => void;
}

export function ProfileView({onNavigate, onUserSync}: ProfileViewProps) {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await apiFetch<ProfileResponse>('/api/profile');
      setData(res);
      setUsername(res.user.username);
      onUserSync(res.user, res.levelProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nem sikerült betölteni a profilt');
    } finally {
      setLoading(false);
    }
  }, [onUserSync]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch<{user: UserProfile}>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({username: username.trim()}),
      });
      if (data) {
        onUserSync(res.user, data.levelProgress);
      }
      setMessage('Profil frissítve.');
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nem sikerült frissíteni a profilt');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvidence(submissionId: string) {
    setDeletingId(submissionId);
    setError(null);
    try {
      await apiFetch(`/api/submissions/${encodeURIComponent(submissionId)}/evidence`, {
        method: 'DELETE',
      });
      setConfirmDeleteId(null);
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nem sikerült törölni a bizonyítékot');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div className="h-96 rounded-2xl bg-[var(--bg-surface)] animate-pulse" />;
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-400">
        {error || 'A profil nem tölthető be.'}
      </div>
    );
  }

  const {user, levelProgress, completedCount, submissions, transactions, achievements} = data;
  const currentTier = getLevelTier(levelProgress.level);

  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface-elevated)] font-display text-2xl font-bold text-[var(--accent-primary)]"
            >
              {(user.username.slice(0, 1) || 'E').toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{user.username}</h1>
              <p className="text-xs text-[var(--text-secondary)]">
                {user.email} · Szerepkör: {user.role === 'admin' ? 'Adminisztrátor' : 'Felhasználó'}
              </p>
              <p className="mt-1 font-mono-tabular text-xs font-semibold text-[var(--accent-primary)]">
                {levelProgress.level}. szint{currentTier ? ` · ${currentTier.name}` : ''} · {user.xp} XP · {user.eco_points} EcoPoints
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p key={`comp-${completedCount}`} className="eq-animate-kpi font-mono-tabular text-xl font-bold">
                {completedCount}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">Teljesítve</p>
            </div>
            <div className="text-center">
              <p
                key={`p-stk-${user.current_streak}`}
                className="eq-animate-kpi inline-flex items-center gap-1 font-mono-tabular text-xl font-bold text-amber-700 dark:text-amber-500"
              >
                <Flame className="h-4 w-4" aria-hidden="true" />
                {user.current_streak}n
              </p>
              <p className="text-xs text-[var(--text-secondary)]">Jelenlegi sorozat</p>
            </div>
            <div className="text-center">
              <p className="font-mono-tabular text-xl font-bold">{user.longest_streak}n</p>
              <p className="text-xs text-[var(--text-secondary)]">Legjobb sorozat</p>
            </div>
          </div>
        </div>
      </div>

      {/* Level ladder */}
      <section
        aria-labelledby="levels-heading"
        className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="levels-heading" className="font-display text-lg font-semibold">
              Szintlépcső
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Haladj a csírától a természetőrig — minden szint új környezetvédelmi rangot nyit meg.
            </p>
          </div>
          <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-primary)]">
            {Math.min(levelProgress.level, LEVEL_TIERS.length)} / {LEVEL_TIERS.length} feloldva
          </span>
        </div>

        <ol
          aria-label="Szintek és a következő szinthez szükséges XP"
          className="eq-scroll-x flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        >
          {LEVEL_TIERS.map((tier) => {
            const Icon = tier.icon;
            const unlocked = tier.level <= levelProgress.level;
            const isCurrent = tier.level === levelProgress.level;
            const isMaxTier = tier.level === LEVEL_TIERS.length;
            const xpForNext = xpToNextLevel(tier.level);
            const remainingXp = Math.max(0, xpRequiredForLevel(tier.level + 1) - user.xp);

            return (
              <li key={tier.level} className="w-40 shrink-0 snap-start">
                <div
                  className={`flex h-full flex-col gap-3 rounded-2xl border p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 ${
                    isCurrent
                      ? 'border-lime-500/60 bg-lime-500/10'
                      : unlocked
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-[11px] font-semibold text-[var(--text-secondary)]">
                      {tier.level}. szint
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary-fg)]">
                        Jelenlegi
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                      unlocked
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-[var(--accent-emerald)]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {unlocked ? (
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Lock className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p
                      className={`font-display text-sm font-semibold ${
                        unlocked ? '' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {!unlocked && <span className="sr-only">Zárolt szint: </span>}
                      {tier.name}
                    </p>
                    <p className="font-mono-tabular text-[11px] leading-snug text-[var(--text-secondary)]">
                      {isMaxTier
                        ? 'Legmagasabb szint'
                        : `${xpForNext} XP a ${tier.level + 1}. szintig`}
                    </p>
                    {isCurrent && !isMaxTier && (
                      <p className="font-mono-tabular text-[11px] font-semibold text-[var(--accent-primary)]">
                        Még {remainingXp} XP
                      </p>
                    )}
                  </div>

                  {isCurrent && !isMaxTier && (
                    <div className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface-elevated)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)]"
                        style={{width: `${Math.max(0, Math.min(100, levelProgress.progressPercent))}%`}}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="text-[11px] text-[var(--text-secondary)]">
          A zárolt szintek ikonjai lakatot mutatnak, amíg el nem éred a szükséges XP-t.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Edit Profile */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4 lg:col-span-5"
        >
          <h2 className="font-display text-lg font-semibold">Profil szerkesztése</h2>

          {message && <p className="text-xs text-emerald-700 dark:text-emerald-400">{message}</p>}
          {error && <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p>}

          <div className="space-y-1.5">
            <label htmlFor="profile-username" className="block text-xs font-medium text-[var(--text-secondary)]">
              Felhasználónév
            </label>
            <input
              id="profile-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="eq-interactive-btn inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Változtatások mentése</span>
          </button>
        </form>

        {/* Achievements */}
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Eredmények</h2>
            <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
              {achievements.filter((a) => a.unlocked).length} / {achievements.length} feloldva
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {achievements.map((ach, idx) => (
              <div
                key={ach.id}
                style={{'--eq-delay': `${Math.min(idx, 7) * 85}ms`} as React.CSSProperties}
                className={`eq-animate-card rounded-xl border p-3.5 space-y-1 transition-[transform,border-color] duration-200 hover:-translate-y-1 ${
                  ach.unlocked
                    ? 'border-emerald-500/40 bg-emerald-500/10 hover:border-lime-500/60'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] opacity-65 hover:border-lime-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    {ach.unlocked ? (
                      <Trophy className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
                    ) : (
                      <Award className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
                    )}
                    {ach.title}
                  </span>
                  <span className="font-mono-tabular text-xs text-[var(--accent-primary)]">
                    +{ach.xp_bonus} XP
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{ach.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Submission History & Reward Ledger */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4 lg:col-span-7">
          <h2 className="font-display text-lg font-semibold">Küldetések beküldési előzményei</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Még nincsenek beküldött küldetéseid.{' '}
              <button
                type="button"
                onClick={() => onNavigate('quests')}
                className="font-semibold text-[var(--accent-primary)] hover:underline"
              >
                Küldetések böngészése
              </button>
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {submissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => sub.quest_slug && onNavigate('quest-detail', sub.quest_slug)}
                      className="truncate font-medium text-sm hover:text-[var(--accent-primary)]"
                    >
                      {sub.quest_title || 'Küldetés'}
                    </button>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Időszak: {sub.period_key} · {new Date(sub.created_at).toLocaleDateString('hu-HU')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusIndicator status={sub.status} />
                    {sub.has_evidence &&
                      (confirmDeleteId === sub.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deletingId === sub.id}
                            onClick={() => void handleDeleteEvidence(sub.id)}
                            className="min-h-[34px] rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                          >
                            {deletingId === sub.id ? 'Törlés...' : 'Törlés megerősítése'}
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === sub.id}
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[34px] rounded-lg border border-[var(--border-hairline)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                          >
                            Mégse
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(sub.id)}
                          title="Tárolt bizonyítékfotó törlése"
                          aria-label="Tárolt bizonyítékfotó törlése"
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4 lg:col-span-5">
          <h2 className="font-display text-lg font-semibold">Jutalom főkönyv</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Az igazolt küldetések jutalmai és az eredménybónuszok itt fognak megjelenni.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-emerald)] shrink-0" aria-hidden="true" />
                    <span className="truncate">{tx.description}</span>
                  </div>
                  <span className="font-mono-tabular font-semibold text-[var(--accent-primary)] whitespace-nowrap shrink-0">
                    +{tx.xp_delta} XP{tx.points_delta > 0 ? ` · +${tx.points_delta} pont` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
