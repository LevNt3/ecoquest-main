import {CheckCircle2, Loader2, Pencil, Plus, ShieldCheck, XCircle} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
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

  // Edit quest form state
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [editQuest, setEditQuest] = useState<{
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
  } | null>(null);

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
      setError(err instanceof Error ? err.message : 'Adminisztrátori hozzáférés sikertelen');
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
        ? 'Adminisztrátor által manuálisan jóváhagyva.'
        : 'A bizonyíték nem felel meg a küldetés feltételeinek.');

    setBusyId(submissionId);
    setError(null);
    try {
      await apiFetch(`/api/admin/submissions/${encodeURIComponent(submissionId)}/review`, {
        method: 'POST',
        body: JSON.stringify({decision, reason}),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A felülvizsgálati művelet sikertelen');
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
      setError(err instanceof Error ? err.message : 'Nem sikerült frissíteni a küldetés állapotát');
    } finally {
      setBusyId(null);
    }
  }

  function startEditingQuest(quest: QuestItem) {
    if (editingQuestId === quest.id) {
      setEditingQuestId(null);
      setEditQuest(null);
      return;
    }
    setEditingQuestId(quest.id);
    setEditQuest({
      title: quest.title,
      description: quest.description,
      instructions: quest.instructions,
      environmental_impact: quest.environmental_impact,
      category: quest.category,
      difficulty: quest.difficulty,
      quest_type: quest.quest_type,
      estimated_minutes: quest.estimated_minutes,
      xp_reward: quest.xp_reward,
      eco_points_reward: quest.eco_points_reward,
      verification_criteria: quest.verification_criteria,
    });
  }

  async function handleSaveQuestEdit(e: React.FormEvent, questId: string) {
    e.preventDefault();
    if (!editQuest) return;
    setBusyId(`edit:${questId}`);
    setError(null);
    try {
      await apiFetch(`/api/admin/quests/${encodeURIComponent(questId)}`, {
        method: 'PATCH',
        body: JSON.stringify(editQuest),
      });
      setEditingQuestId(null);
      setEditQuest(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nem sikerült menteni a küldetés módosításait');
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
      setError(err instanceof Error ? err.message : 'Nem sikerült létrehozni a küldetést');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-[var(--accent-emerald)]" aria-hidden="true" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Adminisztrátori konzol</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Szerepkör-ellenőrzött moderációs sor és küldetéskatalógus-kezelés.
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
            Felülvizsgálati sor
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
            Küldetéskezelő ({quests.length})
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-400"
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
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
            >
              Felülvizsgálatra vár
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
              Összes beküldés
            </button>
          </div>

          {loading ? (
            <div className="h-48 rounded-2xl bg-[var(--bg-surface)] animate-pulse" />
          ) : submissions.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-10 text-center text-sm text-[var(--text-secondary)]">
              Nincs beküldés ebben a szűrőben.
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
                        {sub.username} · Időszak: {sub.period_key}
                      </p>
                      <h2 className="font-display text-base font-semibold">{sub.quest_title}</h2>
                    </div>
                    <StatusIndicator status={sub.status} />
                  </div>

                  {sub.has_evidence ? (
                    <img
                      src={`/api/submissions/${sub.id}/evidence`}
                      alt="Felülvizsgálatra beküldött bizonyíték"
                      className="max-h-56 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] object-contain"
                    />
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)]">A bizonyítékfotó törölve lett.</p>
                  )}

                  {sub.user_note && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Felhasználói megjegyzés: &bdquo;{sub.user_note}&rdquo;
                    </p>
                  )}

                  {sub.ai_result && (
                    <div className="rounded-xl bg-[var(--bg-canvas)] p-3 text-xs space-y-1">
                      <p className="font-semibold">
                        AI megjegyzés ({Math.round(sub.ai_result.confidence * 100)}%)
                      </p>
                      <p className="text-[var(--text-secondary)]">{sub.ai_result.summary}</p>
                    </div>
                  )}

                  {sub.status !== 'approved' && (
                    <div className="space-y-2 border-t border-[var(--border-hairline)] pt-3">
                      <div className="space-y-1">
                        <label
                          htmlFor={`review-reason-${sub.id}`}
                          className="block text-[11px] font-medium text-[var(--text-secondary)]"
                        >
                          Értékelési indoklás (opcionális)
                        </label>
                        <input
                          id={`review-reason-${sub.id}`}
                          type="text"
                          value={reviewReasons[sub.id] || ''}
                          onChange={(e) =>
                            setReviewReasons((prev) => ({...prev, [sub.id]: e.target.value}))
                          }
                          placeholder="Opcionális indoklás..."
                          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-xs focus-visible:ring-2 focus-visible:ring-lime-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === sub.id}
                          onClick={() => void handleReview(sub.id, 'approved')}
                          className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Jóváhagyás</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === sub.id}
                          onClick={() => void handleReview(sub.id, 'rejected')}
                          className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Elutasítás</span>
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
              className="eq-interactive-btn inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{showCreate ? 'Mégse' : 'Új küldetés'}</span>
            </button>
          </div>

          {showCreate && (
            <form
              onSubmit={handleCreateQuest}
              className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <label htmlFor="create-quest-slug" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Küldetés slug (technikai azonosító)
                </label>
                <input
                  id="create-quest-slug"
                  required
                  placeholder="pl. hideg-vizes-mosas"
                  value={newQuest.slug}
                  onChange={(e) => setNewQuest({...newQuest, slug: e.target.value})}
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="create-quest-title" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Küldetés címe
                </label>
                <input
                  id="create-quest-title"
                  required
                  placeholder="Küldetés címe"
                  value={newQuest.title}
                  onChange={(e) => setNewQuest({...newQuest, title: e.target.value})}
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="create-quest-category" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Kategória
                </label>
                <select
                  id="create-quest-category"
                  value={newQuest.category}
                  onChange={(e) =>
                    setNewQuest({...newQuest, category: e.target.value as (typeof QUEST_CATEGORIES)[number]})
                  }
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  {QUEST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {formatCategoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label htmlFor="create-quest-type" className="block text-xs font-medium text-[var(--text-secondary)]">
                    Gyakoriság
                  </label>
                  <select
                    id="create-quest-type"
                    value={newQuest.quest_type}
                    onChange={(e) => setNewQuest({...newQuest, quest_type: e.target.value})}
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                  >
                    {QUEST_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {formatQuestTypeLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="create-quest-difficulty" className="block text-xs font-medium text-[var(--text-secondary)]">
                    Nehézség
                  </label>
                  <select
                    id="create-quest-difficulty"
                    value={newQuest.difficulty}
                    onChange={(e) => setNewQuest({...newQuest, difficulty: e.target.value})}
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                  >
                    {QUEST_DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {formatDifficultyLabel(d)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="create-quest-xp" className="block text-xs font-medium text-[var(--text-secondary)]">
                  XP jutalom
                </label>
                <input
                  id="create-quest-xp"
                  type="number"
                  min={5}
                  placeholder="XP jutalom"
                  value={newQuest.xp_reward}
                  onChange={(e) => setNewQuest({...newQuest, xp_reward: Number(e.target.value)})}
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="create-quest-points" className="block text-xs font-medium text-[var(--text-secondary)]">
                  EcoPoints jutalom
                </label>
                <input
                  id="create-quest-points"
                  type="number"
                  min={0}
                  placeholder="EcoPoints jutalom"
                  value={newQuest.eco_points_reward}
                  onChange={(e) =>
                    setNewQuest({...newQuest, eco_points_reward: Number(e.target.value)})
                  }
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="create-quest-description" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Rövid leírás
                </label>
                <textarea
                  id="create-quest-description"
                  required
                  placeholder="Rövid leírás..."
                  value={newQuest.description}
                  onChange={(e) => setNewQuest({...newQuest, description: e.target.value})}
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="create-quest-instructions" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Lépésről lépésre útmutató
                </label>
                <textarea
                  id="create-quest-instructions"
                  required
                  placeholder="Lépésről lépésre útmutató..."
                  value={newQuest.instructions}
                  onChange={(e) => setNewQuest({...newQuest, instructions: e.target.value})}
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="create-quest-impact" className="block text-xs font-medium text-[var(--text-secondary)]">
                  Környezeti hatás
                </label>
                <textarea
                  id="create-quest-impact"
                  required
                  placeholder="Környezeti hatás magyarázata..."
                  value={newQuest.environmental_impact}
                  onChange={(e) => setNewQuest({...newQuest, environmental_impact: e.target.value})}
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="create-quest-criteria" className="block text-xs font-medium text-[var(--text-secondary)]">
                  AI-ellenőrzési feltételek
                </label>
                <textarea
                  id="create-quest-criteria"
                  required
                  placeholder="AI-ellenőrzési feltételek..."
                  value={newQuest.verification_criteria}
                  onChange={(e) => setNewQuest({...newQuest, verification_criteria: e.target.value})}
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>
              <button
                type="submit"
                disabled={busyId === 'create'}
                className="sm:col-span-2 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-primary-fg)]"
              >
                {busyId === 'create' && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Küldetés közzététele</span>
              </button>
            </form>
          )}

          <div className="divide-y divide-[var(--border-hairline)] rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            {quests.map((q) => (
              <div key={q.id} className="p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-display text-sm font-semibold">{q.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {formatCategoryLabel(q.category)} · {formatQuestTypeLabel(q.quest_type)} · +{q.xp_reward} XP · +
                      {q.eco_points_reward} pont · {q.estimated_minutes} perc
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditingQuest(q)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] hover:border-lime-500/40"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{editingQuestId === q.id ? 'Bezárás' : 'Szerkesztés'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === q.id}
                      onClick={() => void handleToggleQuestActive(q)}
                      className={`min-h-[36px] rounded-lg border px-3 py-1 text-xs font-semibold ${
                        q.is_active
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {q.is_active ? 'Aktív' : 'Inaktív'}
                    </button>
                  </div>
                </div>

                {editingQuestId === q.id && editQuest && (
                  <form
                    onSubmit={(e) => void handleSaveQuestEdit(e, q.id)}
                    className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 grid gap-3 sm:grid-cols-2"
                  >
                    <div className="space-y-1">
                      <label htmlFor={`edit-${q.id}-title`} className="block text-xs font-medium text-[var(--text-secondary)]">
                        Küldetés címe
                      </label>
                      <input
                        id={`edit-${q.id}-title`}
                        required
                        placeholder="Küldetés címe"
                        value={editQuest.title}
                        onChange={(e) => setEditQuest({...editQuest, title: e.target.value})}
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor={`edit-${q.id}-category`} className="block text-xs font-medium text-[var(--text-secondary)]">
                        Kategória
                      </label>
                      <select
                        id={`edit-${q.id}-category`}
                        value={editQuest.category}
                        onChange={(e) =>
                          setEditQuest({
                            ...editQuest,
                            category: e.target.value as (typeof QUEST_CATEGORIES)[number],
                          })
                        }
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                      >
                        {QUEST_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {formatCategoryLabel(c)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label htmlFor={`edit-${q.id}-type`} className="block text-xs font-medium text-[var(--text-secondary)]">
                          Gyakoriság
                        </label>
                        <select
                          id={`edit-${q.id}-type`}
                          value={editQuest.quest_type}
                          onChange={(e) => setEditQuest({...editQuest, quest_type: e.target.value})}
                          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                        >
                          {QUEST_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {formatQuestTypeLabel(t)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`edit-${q.id}-difficulty`} className="block text-xs font-medium text-[var(--text-secondary)]">
                          Nehézség
                        </label>
                        <select
                          id={`edit-${q.id}-difficulty`}
                          value={editQuest.difficulty}
                          onChange={(e) => setEditQuest({...editQuest, difficulty: e.target.value})}
                          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                        >
                          {QUEST_DIFFICULTIES.map((d) => (
                            <option key={d} value={d}>
                              {formatDifficultyLabel(d)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label htmlFor={`edit-${q.id}-minutes`} className="block text-xs font-medium text-[var(--text-secondary)]">
                          Perc
                        </label>
                        <input
                          id={`edit-${q.id}-minutes`}
                          type="number"
                          min={1}
                          max={480}
                          placeholder="Perc"
                          value={editQuest.estimated_minutes}
                          onChange={(e) =>
                            setEditQuest({...editQuest, estimated_minutes: Number(e.target.value)})
                          }
                          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`edit-${q.id}-xp`} className="block text-xs font-medium text-[var(--text-secondary)]">
                          XP
                        </label>
                        <input
                          id={`edit-${q.id}-xp`}
                          type="number"
                          min={5}
                          max={1000}
                          placeholder="XP"
                          value={editQuest.xp_reward}
                          onChange={(e) =>
                            setEditQuest({...editQuest, xp_reward: Number(e.target.value)})
                          }
                          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`edit-${q.id}-points`} className="block text-xs font-medium text-[var(--text-secondary)]">
                          EcoPoints
                        </label>
                        <input
                          id={`edit-${q.id}-points`}
                          type="number"
                          min={0}
                          max={1000}
                          placeholder="EcoPoints"
                          value={editQuest.eco_points_reward}
                          onChange={(e) =>
                            setEditQuest({...editQuest, eco_points_reward: Number(e.target.value)})
                          }
                          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label htmlFor={`edit-${q.id}-description`} className="block text-xs font-medium text-[var(--text-secondary)]">
                        Rövid leírás
                      </label>
                      <textarea
                        id={`edit-${q.id}-description`}
                        required
                        rows={2}
                        placeholder="Rövid leírás..."
                        value={editQuest.description}
                        onChange={(e) => setEditQuest({...editQuest, description: e.target.value})}
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label htmlFor={`edit-${q.id}-instructions`} className="block text-xs font-medium text-[var(--text-secondary)]">
                        Lépésről lépésre útmutató
                      </label>
                      <textarea
                        id={`edit-${q.id}-instructions`}
                        required
                        rows={3}
                        placeholder="Lépésről lépésre útmutató..."
                        value={editQuest.instructions}
                        onChange={(e) => setEditQuest({...editQuest, instructions: e.target.value})}
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label htmlFor={`edit-${q.id}-impact`} className="block text-xs font-medium text-[var(--text-secondary)]">
                        Környezeti hatás
                      </label>
                      <textarea
                        id={`edit-${q.id}-impact`}
                        required
                        rows={2}
                        placeholder="Környezeti hatás magyarázata..."
                        value={editQuest.environmental_impact}
                        onChange={(e) =>
                          setEditQuest({...editQuest, environmental_impact: e.target.value})
                        }
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label htmlFor={`edit-${q.id}-criteria`} className="block text-xs font-medium text-[var(--text-secondary)]">
                        AI-ellenőrzési feltételek
                      </label>
                      <textarea
                        id={`edit-${q.id}-criteria`}
                        required
                        rows={2}
                        placeholder="AI-ellenőrzési feltételek..."
                        value={editQuest.verification_criteria}
                        onChange={(e) =>
                          setEditQuest({...editQuest, verification_criteria: e.target.value})
                        }
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestId(null);
                          setEditQuest(null);
                        }}
                        className="min-h-[38px] rounded-xl border border-[var(--border-hairline)] px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)]"
                      >
                        Mégse
                      </button>
                      <button
                        type="submit"
                        disabled={busyId === `edit:${q.id}`}
                        className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--accent-primary-fg)] disabled:opacity-50"
                      >
                        {busyId === `edit:${q.id}` && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>Módosítások mentése</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
