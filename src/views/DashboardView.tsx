import {ArrowRight, Award, Camera, CheckCircle2, Flame, Sparkles, Trophy} from 'lucide-react';
import {useEffect, useState} from 'react';
import type {AppRoute} from '../components/AppShell';
import {StatusIndicator} from '../components/StatusBadge';
import {apiFetch} from '../lib/api';
import type {
  AchievementItem,
  LevelProgress,
  QuestItem,
  QuestSubmission,
  UserProfile,
} from '../shared/types';

interface DashboardResponse {
  user: UserProfile;
  levelProgress: LevelProgress;
  todayUtc: string;
  dailyQuests: QuestItem[];
  weeklyActivity: Array<{date: string; label: string; completed: number}>;
  completedCount: number;
  achievements: AchievementItem[];
  recentSubmissions: QuestSubmission[];
}

interface DashboardViewProps {
  onNavigate: (route: AppRoute, slug?: string) => void;
  onUserSync: (user: UserProfile, levelProgress: LevelProgress) => void;
}

export function DashboardView({onNavigate, onUserSync}: DashboardViewProps) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<DashboardResponse>('/api/dashboard')
      .then((res) => {
        if (!active) return;
        setData(res);
        onUserSync(res.user, res.levelProgress);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onUserSync]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-2xl bg-[var(--bg-surface)]" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-2xl bg-[var(--bg-surface)]" />
          <div className="h-28 rounded-2xl bg-[var(--bg-surface)]" />
          <div className="h-28 rounded-2xl bg-[var(--bg-surface)]" />
        </div>
        <div className="h-64 rounded-2xl bg-[var(--bg-surface)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-400">
        {error || 'Could not load dashboard data.'}
      </div>
    );
  }

  const {user, levelProgress, dailyQuests, weeklyActivity, completedCount, achievements} = data;
  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const quickActionQuest =
    dailyQuests.find((q) => q.user_status !== 'completed') || dailyQuests[0];

  return (
    <div className="space-y-8">
      {/* Header + Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">UTC Day {data.todayUtc}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user.username}
          </h1>
        </div>
        {quickActionQuest && (
          <button
            type="button"
            onClick={() => onNavigate('quest-detail', quickActionQuest.slug)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            <span>Submit a Quest</span>
          </button>
        )}
      </div>

      {/* Primary KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Level Progression</span>
            <span className="font-mono-tabular font-semibold text-[var(--accent-primary)]">
              Level {levelProgress.level}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono-tabular text-2xl font-bold">{user.xp} XP</span>
            <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
              {levelProgress.xpIntoLevel} / {levelProgress.xpNeededForNext} to Lvl{' '}
              {levelProgress.level + 1}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-elevated)]">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-300"
              style={{width: `${levelProgress.progressPercent}%`}}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>EcoPoints Balance</span>
            <Sparkles className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          </div>
          <p className="font-mono-tabular text-2xl font-bold">{user.eco_points}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {completedCount} verified quest{completedCount === 1 ? '' : 's'} completed
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Daily Streak</span>
            <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="font-mono-tabular text-2xl font-bold">
            {user.current_streak} day{user.current_streak === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Best {user.longest_streak}d · Resets UTC midnight (1-day grace)
          </p>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Today's Quests */}
        <section className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Today&apos;s Daily Quests</h2>
            <button
              type="button"
              onClick={() => onNavigate('quests')}
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
            >
              Browse All Quests →
            </button>
          </div>

          <div className="divide-y divide-[var(--border-hairline)] rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            {dailyQuests.map((quest) => (
              <button
                key={quest.id}
                type="button"
                onClick={() => onNavigate('quest-detail', quest.slug)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--bg-surface-elevated)]/60 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-xs text-[var(--text-secondary)]">
                    {quest.category} · {quest.estimated_minutes} min
                  </p>
                  <p className="truncate font-display text-sm font-semibold">{quest.title}</p>
                  <p className="font-mono-tabular text-xs text-[var(--accent-primary)]">
                    +{quest.xp_reward} XP · +{quest.eco_points_reward} pts
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusIndicator status={quest.user_status || 'available'} />
                  <ArrowRight className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Weekly Activity + Recent Achievements */}
        <div className="space-y-6 lg:col-span-5">
          <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Weekly UTC Progress</h2>
              <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
                Last 7 Days
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weeklyActivity.map((day) => {
                const active = day.completed > 0;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-2">
                    <div
                      className={`flex h-10 w-full items-center justify-center rounded-xl border text-xs font-mono-tabular font-semibold ${
                        active
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {active ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : '0'}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)]">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Recent Achievements</h2>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
              >
                View All ({unlockedAchievements.length}/{achievements.length})
              </button>
            </div>

            {unlockedAchievements.length === 0 ? (
              <div className="flex items-center gap-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4">
                <img
                  src="/src/assets/images/badge_forest_guardian_1795617620663.jpg"
                  alt="Forest Guardian achievement emblem"
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-xl object-cover shrink-0"
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Unlock Your First Badge</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Complete any daily quest to earn First Sprout (+25 bonus XP).
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {unlockedAchievements.slice(0, 3).map((ach) => (
                  <div
                    key={ach.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Trophy className="h-4 w-4 text-lime-400 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{ach.title}</p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">
                          {ach.description}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-primary)] shrink-0">
                      +{ach.xp_bonus} XP
                    </span>
                  </div>
                ))}
              </div>
            )}

            {unlockedAchievements.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Award className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                <span>Next milestone unlocks automatically upon quest approval.</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
