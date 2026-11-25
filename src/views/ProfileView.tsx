import {Award, CheckCircle2, Flame, Loader2, Trash2, Trophy} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import type {AppRoute} from '../components/AppShell';
import {StatusIndicator} from '../components/StatusBadge';
import {apiFetch} from '../lib/api';
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

const AVATAR_PRESETS = [
  '/src/assets/images/badge_forest_guardian_1795617620663.jpg',
  '/src/assets/images/quest_digital_notes_1795617620749.jpg',
  '/src/assets/images/quest_sustainable_commute_1795617621118.jpg',
];

export function ProfileView({onNavigate, onUserSync}: ProfileViewProps) {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await apiFetch<ProfileResponse>('/api/profile');
      setData(res);
      setUsername(res.user.username);
      setAvatarUrl(res.user.avatar_url || AVATAR_PRESETS[0]);
      onUserSync(res.user, res.levelProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
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
        body: JSON.stringify({username: username.trim(), avatar_url: avatarUrl}),
      });
      if (data) {
        onUserSync(res.user, data.levelProgress);
      }
      setMessage('Profile updated.');
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvidence(submissionId: string) {
    try {
      await apiFetch(`/api/submissions/${encodeURIComponent(submissionId)}/evidence`, {
        method: 'DELETE',
      });
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete evidence');
    }
  }

  if (loading) {
    return <div className="h-96 rounded-2xl bg-[var(--bg-surface)] animate-pulse" />;
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-400">
        {error || 'Unable to load profile.'}
      </div>
    );
  }

  const {user, levelProgress, completedCount, submissions, transactions, achievements} = data;

  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar_url || AVATAR_PRESETS[0]}
              alt={`${user.username} avatar`}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-2xl border border-[var(--border-hairline)] object-cover"
            />
            <div>
              <h1 className="font-display text-2xl font-bold">{user.username}</h1>
              <p className="text-xs text-[var(--text-secondary)]">
                {user.email} · Role: {user.role}
              </p>
              <p className="mt-1 font-mono-tabular text-xs font-semibold text-[var(--accent-primary)]">
                Level {levelProgress.level} · {user.xp} XP · {user.eco_points} EcoPoints
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="font-mono-tabular text-xl font-bold">{completedCount}</p>
              <p className="text-xs text-[var(--text-secondary)]">Completed</p>
            </div>
            <div className="text-center">
              <p className="inline-flex items-center gap-1 font-mono-tabular text-xl font-bold text-amber-500">
                <Flame className="h-4 w-4" aria-hidden="true" />
                {user.current_streak}d
              </p>
              <p className="text-xs text-[var(--text-secondary)]">Current Streak</p>
            </div>
            <div className="text-center">
              <p className="font-mono-tabular text-xl font-bold">{user.longest_streak}d</p>
              <p className="text-xs text-[var(--text-secondary)]">Best Streak</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Edit Profile */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4 lg:col-span-5"
        >
          <h2 className="font-display text-lg font-semibold">Edit Profile</h2>

          {message && <p className="text-xs text-emerald-400">{message}</p>}
          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="space-y-1.5">
            <label htmlFor="profile-username" className="block text-xs font-medium text-[var(--text-secondary)]">
              Username
            </label>
            <input
              id="profile-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Select Avatar</p>
            <div className="flex items-center gap-3">
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAvatarUrl(preset)}
                  className={`overflow-hidden rounded-xl border-2 transition-all ${
                    avatarUrl === preset ? 'border-lime-500 scale-105' : 'border-transparent opacity-70'
                  }`}
                >
                  <img
                    src={preset}
                    alt={`Avatar preset ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Save Changes</span>
          </button>
        </form>

        {/* Achievements */}
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Achievements</h2>
            <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
              {achievements.filter((a) => a.unlocked).length} / {achievements.length} Unlocked
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`rounded-xl border p-3.5 space-y-1 ${
                  ach.unlocked
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] opacity-65'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    {ach.unlocked ? (
                      <Trophy className="h-4 w-4 text-lime-400" aria-hidden="true" />
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
          <h2 className="font-display text-lg font-semibold">Quest Submission History</h2>
          {submissions.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              No quest submissions yet.{' '}
              <button
                type="button"
                onClick={() => onNavigate('quests')}
                className="font-semibold text-[var(--accent-primary)] hover:underline"
              >
                Explore quests
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
                      {sub.quest_title || 'Quest'}
                    </button>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Period {sub.period_key} · {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusIndicator status={sub.status} />
                    {sub.has_evidence && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteEvidence(sub.id)}
                        title="Delete stored evidence photo"
                        aria-label="Delete stored evidence photo"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4 lg:col-span-5">
          <h2 className="font-display text-lg font-semibold">Reward Ledger</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Verified quest rewards and achievement bonuses will appear here.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
                    <span className="truncate">{tx.description}</span>
                  </div>
                  <span className="font-mono-tabular font-semibold text-[var(--accent-primary)] whitespace-nowrap shrink-0">
                    +{tx.xp_delta} XP{tx.points_delta > 0 ? ` · +${tx.points_delta} pts` : ''}
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
