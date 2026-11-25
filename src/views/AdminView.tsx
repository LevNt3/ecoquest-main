import {CheckCircle2, Loader2, Plus, ShieldCheck, XCircle} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {StatusIndicator} from '../components/StatusBadge';
import {apiFetch, formatDifficultyLabel, formatQuestTypeLabel} from '../lib/api';
import {
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_TYPES,
  type QuestCategory,
  type QuestItem,
  type QuestSubmission,
} from '../shared/types';

export function AdminView() {
  const [tab, setTab] = useState<'queue' | 'quests'>('queue');
  const [statusFilter, setStatusFilter] = useState<'needs_review' | 'all'>('needs_review');
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create quest form state
  const [showCreate, setShowCreate] = useState(false);
  const [newQuest, setNewQuest] = useState<{
    slug: string;
    title: string;
    description: string;
    instructions: string;
    environmental_impact: string;
    category: QuestCategory;
    difficulty: string;
    quest_type: string;
    estimated_minutes: number;
    xp_reward: number;
    eco_points_reward: number;
    verification_criteria: string;
  }>({
    slug: '',
    title: '',
    description: '',
    instructions: '',
    environmental_impact: '',
    category: QUEST_CATEGORIES[0],
    difficulty: 'easy',
    quest_type: 'daily',
    estimated_minutes: 10,
    xp_reward: 30,
    eco_points_reward: 15,
    verification_criteria: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, questsRes] = await Promise.all([
        apiFetch<{submissions: QuestSubmission[]}>(
          `/api/admin/submissions?status=${statusFilter}`,
        ),
        apiFetch<{quests: QuestItem[]}>('/api/admin/quests'),
      ]);
      setSubmissions(subsRes.submissions);
      setQuests(questsRes.quests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin access failed');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleReview(submissionId: string, decision: 'approved' | 'rejected') {
    const reason =
      reviewReasons[submissionId]?.trim() ||
      (decision === 'approved'
        ? 'Verified manually by admin reviewer.'
        : 'Evidence does not meet quest criteria.');

    setBusyId(submissionId);
    setError(null);
    try {
      await apiFetch(`/api/admin/submissions/${encodeURIComponent(submissionId)}/review`, {
        method: 'POST',
        body: JSON.stringify({decision, reason}),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleQuestActive(quest: QuestItem) {
    setBusyId(quest.id);
    try {
      await apiFetch(`/api/admin/quests/${encodeURIComponent(quest.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({is_active: !quest.is_active}),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update quest status');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateQuest(e: React.FormEvent) {
    e.preventDefault();
    setBusyId('create');
    setError(null);
    try {
      await apiFetch('/api/admin/quests', {
        method: 'POST',
        body: JSON.stringify({
          ...newQuest,
          verification_type: 'photo',
          is_active: true,
        }),
      });
      setShowCreate(false);
      setNewQuest({
        slug: '',
        title: '',
        description: '',
        instructions: '',
        environmental_impact: '',
        category: QUEST_CATEGORIES[0],
        difficulty: 'easy',
        quest_type: 'daily',
        estimated_minutes: 10,
        xp_reward: 30,
        eco_points_reward: 15,
        verification_criteria: '',
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create quest');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-emerald-500" aria-hidden="true" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Role-verified moderation queue and quest catalog management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-[var(--bg-surface)] p-1 border border-[var(--border-hairline)]">
          <button
            type="button"
            onClick={() => setTab('queue')}
            className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'queue'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Review Queue
          </button>
          <button
            type="button"
            onClick={() => setTab('quests')}
            className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'quests'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Quest Manager ({quests.length})
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400"
        >
          {error}
        </div>
      )}

      {tab === 'queue' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('needs_review')}
              className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium border ${
                statusFilter === 'needs_review'
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
            >
              Needs Review
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium border ${
                statusFilter === 'all'
                  ? 'border-lime-500/40 bg-lime-500/15 text-[var(--accent-primary)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
            >
              All Submissions
            </button>
          </div>

          {loading ? (
            <div className="h-48 rounded-2xl bg-[var(--bg-surface)] animate-pulse" />
          ) : submissions.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-10 text-center text-sm text-[var(--text-secondary)]">
              No submissions in this queue filter.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {sub.username} · Period {sub.period_key}
                      </p>
                      <h2 className="font-display text-base font-semibold">{sub.quest_title}</h2>
                    </div>
                    <StatusIndicator status={sub.status} />
                  </div>

                  {sub.has_evidence ? (
                    <img
                      src={`/api/submissions/${sub.id}/evidence`}
                      alt="Submitted evidence for review"
                      className="max-h-56 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] object-contain"
                    />
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)]">Evidence photo deleted.</p>
                  )}

                  {sub.user_note && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      User note: &ldquo;{sub.user_note}&rdquo;
                    </p>
                  )}

                  {sub.ai_result && (
                    <div className="rounded-xl bg-[var(--bg-canvas)] p-3 text-xs space-y-1">
                      <p className="font-semibold">AI Note ({Math.round(sub.ai_result.confidence * 100)}%)</p>
                      <p className="text-[var(--text-secondary)]">{sub.ai_result.summary}</p>
                    </div>
                  )}

                  {sub.status !== 'approved' && (
                    <div className="space-y-2 border-t border-[var(--border-hairline)] pt-3">
                      <input
                        type="text"
                        value={reviewReasons[sub.id] || ''}
                        onChange={(e) =>
                          setReviewReasons((prev) => ({...prev, [sub.id]: e.target.value}))
                        }
                        placeholder="Optional review reason..."
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === sub.id}
                          onClick={() => void handleReview(sub.id, 'approved')}
                          className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === sub.id}
                          onClick={() => void handleReview(sub.id, 'rejected')}
                          className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{showCreate ? 'Cancel' : 'Create Quest'}</span>
            </button>
          </div>

          {showCreate && (
            <form
              onSubmit={handleCreateQuest}
              className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 grid gap-4 sm:grid-cols-2"
            >
              <input
                required
                placeholder="Slug (e.g. cold-water-wash)"
                value={newQuest.slug}
                onChange={(e) => setNewQuest({...newQuest, slug: e.target.value})}
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Quest Title"
                value={newQuest.title}
                onChange={(e) => setNewQuest({...newQuest, title: e.target.value})}
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <select
                value={newQuest.category}
                onChange={(e) =>
                  setNewQuest({...newQuest, category: e.target.value as (typeof QUEST_CATEGORIES)[number]})
                }
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              >
                {QUEST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newQuest.quest_type}
                  onChange={(e) => setNewQuest({...newQuest, quest_type: e.target.value})}
                  className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
                >
                  {QUEST_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {formatQuestTypeLabel(t)}
                    </option>
                  ))}
                </select>
                <select
                  value={newQuest.difficulty}
                  onChange={(e) => setNewQuest({...newQuest, difficulty: e.target.value})}
                  className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
                >
                  {QUEST_DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {formatDifficultyLabel(d)}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                min={5}
                placeholder="XP Reward"
                value={newQuest.xp_reward}
                onChange={(e) => setNewQuest({...newQuest, xp_reward: Number(e.target.value)})}
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                placeholder="EcoPoints Reward"
                value={newQuest.eco_points_reward}
                onChange={(e) =>
                  setNewQuest({...newQuest, eco_points_reward: Number(e.target.value)})
                }
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <textarea
                required
                placeholder="Short description..."
                value={newQuest.description}
                onChange={(e) => setNewQuest({...newQuest, description: e.target.value})}
                className="sm:col-span-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <textarea
                required
                placeholder="Step-by-step instructions..."
                value={newQuest.instructions}
                onChange={(e) => setNewQuest({...newQuest, instructions: e.target.value})}
                className="sm:col-span-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <textarea
                required
                placeholder="Environmental impact explanation..."
                value={newQuest.environmental_impact}
                onChange={(e) => setNewQuest({...newQuest, environmental_impact: e.target.value})}
                className="sm:col-span-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <textarea
                required
                placeholder="AI Verification Criteria..."
                value={newQuest.verification_criteria}
                onChange={(e) => setNewQuest({...newQuest, verification_criteria: e.target.value})}
                className="sm:col-span-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busyId === 'create'}
                className="sm:col-span-2 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-primary-fg)]"
              >
                {busyId === 'create' && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Publish Quest</span>
              </button>
            </form>
          )}

          <div className="divide-y divide-[var(--border-hairline)] rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            {quests.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="space-y-0.5">
                  <p className="font-display text-sm font-semibold">{q.title}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {q.category} · {formatQuestTypeLabel(q.quest_type)} · +{q.xp_reward} XP · +
                    {q.eco_points_reward} pts
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === q.id}
                  onClick={() => void handleToggleQuestActive(q)}
                  className={`min-h-[36px] rounded-lg border px-3 py-1 text-xs font-semibold ${
                    q.is_active
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                  }`}
                >
                  {q.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
