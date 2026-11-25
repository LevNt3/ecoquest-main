import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Info,
  Loader2,
  Play,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {AppRoute} from '../components/AppShell';
import {StatusIndicator} from '../components/StatusBadge';
import {
  apiFetch,
  compressImageToDataUrl,
  formatDifficultyLabel,
  formatQuestTypeLabel,
} from '../lib/api';
import type {
  LevelProgress,
  QuestItem,
  QuestSubmission,
  UserProfile,
} from '../shared/types';

interface QuestDetailViewProps {
  slug: string;
  onNavigate: (route: AppRoute, slug?: string) => void;
  onUserSync: (user: UserProfile, levelProgress: LevelProgress) => void;
}

export function QuestDetailView({slug, onNavigate, onUserSync}: QuestDetailViewProps) {
  const [quest, setQuest] = useState<QuestItem | null>(null);
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [starting, setStarting] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [userNote, setUserNote] = useState('');
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rewardBanner, setRewardBanner] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadQuest = useCallback(async () => {
    try {
      const res = await apiFetch<{quest: QuestItem; submissions: QuestSubmission[]}>(
        `/api/quests/${encodeURIComponent(slug)}`,
      );
      setQuest(res.quest);
      setSubmissions(res.submissions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quest not found');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadQuest();
  }, [loadQuest]);

  async function handleStartQuest() {
    if (!quest) return;
    setStarting(true);
    setActionError(null);
    try {
      await apiFetch(`/api/quests/${encodeURIComponent(quest.slug)}/start`, {
        method: 'POST',
      });
      await loadQuest();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not start quest');
    } finally {
      setStarting(false);
    }
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setActionError(null);
    try {
      const compressed = await compressImageToDataUrl(file);
      setPreviewDataUrl(compressed);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not process image');
    }
  }

  async function handleSubmitEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!quest || !previewDataUrl) return;
    setActionError(null);
    setRewardBanner(null);
    setUploadStage('Uploading photo to private storage...');

    try {
      const stageTimer = setTimeout(() => {
        setUploadStage('Analyzing visible evidence with OpenRouter vision...');
      }, 600);

      const res = await apiFetch<{
        submission: QuestSubmission;
        reward: {
          submissionStatus: string;
          xpAwarded: number;
          pointsAwarded: number;
          newAchievements: string[];
        };
        user: UserProfile;
        levelProgress: LevelProgress;
      }>('/api/verification', {
        method: 'POST',
        body: JSON.stringify({
          questId: quest.id,
          imageDataUrl: previewDataUrl,
          userNote: userNote.trim() || undefined,
        }),
      });

      clearTimeout(stageTimer);
      onUserSync(res.user, res.levelProgress);
      setPreviewDataUrl(null);
      setUserNote('');

      if (res.reward.submissionStatus === 'approved') {
        const achText =
          res.reward.newAchievements.length > 0
            ? ` Unlocked: ${res.reward.newAchievements.join(', ')}.`
            : '';
        setRewardBanner(
          `Verified! Earned +${res.reward.xpAwarded} XP and +${res.reward.pointsAwarded} EcoPoints.${achText}`,
        );
      }

      await loadQuest();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Verification request failed');
    } finally {
      setUploadStage(null);
    }
  }

  async function handleDeleteEvidence(submissionId: string) {
    setActionError(null);
    try {
      await apiFetch(`/api/submissions/${encodeURIComponent(submissionId)}/evidence`, {
        method: 'DELETE',
      });
      await loadQuest();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete evidence photo');
    }
  }

  if (loading) {
    return <div className="h-96 rounded-2xl bg-[var(--bg-surface)] animate-pulse" />;
  }

  if (error || !quest) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onNavigate('quests')}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Quests</span>
        </button>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-400">
          {error || 'Quest not found'}
        </div>
      </div>
    );
  }

  const latest = submissions[0] || null;
  const isBlockedForPeriod =
    latest?.status === 'approved' ||
    latest?.status === 'pending' ||
    latest?.status === 'needs_review';

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => onNavigate('quests')}
        className="inline-flex min-h-[40px] items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Back to Quest Explorer</span>
      </button>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Quest Information */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-5">
            {quest.image_url && (
              <div className="aspect-[16/9] overflow-hidden rounded-xl bg-[var(--bg-surface-elevated)]">
                <img
                  src={quest.image_url}
                  alt={quest.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-secondary)]">
                {quest.category} · {formatQuestTypeLabel(quest.quest_type)} ·{' '}
                {formatDifficultyLabel(quest.difficulty)} · {quest.estimated_minutes} min
              </p>
              <StatusIndicator status={quest.user_status || 'available'} />
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {quest.title}
              </h1>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                {quest.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 border-y border-[var(--border-hairline)] py-4 text-sm">
              <div>
                <p className="text-xs text-[var(--text-secondary)]">XP Reward</p>
                <p className="font-mono-tabular font-semibold text-[var(--accent-primary)]">
                  +{quest.xp_reward} XP
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">EcoPoints</p>
                <p className="font-mono-tabular font-semibold text-emerald-500">
                  +{quest.eco_points_reward} pts
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Verification</p>
                <p className="font-medium">Photo Evidence</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-base font-semibold">Instructions</h2>
              <div className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
                {quest.instructions}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-base font-semibold">Why It Matters</h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {quest.environmental_impact}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 space-y-1.5">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Verification Criteria
              </p>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {quest.verification_criteria}
              </p>
            </div>
          </div>
        </div>

        {/* Action & Evidence Verification Column */}
        <div className="space-y-6 lg:col-span-5">
          {rewardBanner && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-start gap-3"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
              <span>{rewardBanner}</span>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-400 flex items-start gap-3"
            >
              <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Submit Evidence</h2>
              {quest.user_status === 'available' && (
                <button
                  type="button"
                  onClick={handleStartQuest}
                  disabled={starting}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-1.5 text-xs font-semibold hover:bg-[var(--bg-surface-elevated)] transition-colors"
                >
                  {starting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                  )}
                  <span>Start Quest</span>
                </button>
              )}
            </div>

            {isBlockedForPeriod ? (
              <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 space-y-2">
                <p className="text-sm font-semibold">
                  {latest?.status === 'approved'
                    ? 'Quest Completed for This Period'
                    : 'Submission Awaiting Review'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {latest?.status === 'approved'
                    ? `Verified for period ${quest.period_key}. Come back on the next reset cycle!`
                    : 'Your photo is in the admin moderation queue. Rewards are credited once approved.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitEvidence} className="space-y-4">
                {/* Explicit User-Triggered Camera or File Picker */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={(e) => void handleFileSelected(e.target.files?.[0])}
                  className="sr-only"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => void handleFileSelected(e.target.files?.[0])}
                  className="sr-only"
                />

                {previewDataUrl ? (
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                      <img
                        src={previewDataUrl}
                        alt="Selected quest evidence preview"
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDataUrl(null)}
                      className="text-xs font-medium text-rose-400 hover:underline"
                    >
                      Remove selected photo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 text-xs font-medium hover:border-lime-500/50 transition-colors"
                    >
                      <Camera className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
                      <span>Use Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 text-xs font-medium hover:border-lime-500/50 transition-colors"
                    >
                      <Upload className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                      <span>Choose Image</span>
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="quest-note" className="block text-xs font-medium text-[var(--text-secondary)]">
                    Optional Context Note
                  </label>
                  <textarea
                    id="quest-note"
                    rows={2}
                    maxLength={400}
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Briefly describe what the photo shows (e.g., sorted cans and paper)..."
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
                  />
                </div>

                <div className="flex items-start gap-2 rounded-xl bg-[var(--bg-canvas)] p-3 text-xs text-[var(--text-secondary)]">
                  <Info className="h-4 w-4 shrink-0 text-[var(--accent-primary)] mt-0.5" aria-hidden="true" />
                  <span>
                    Uploaded photos are stored privately and sent to OpenRouter solely to verify this
                    quest&apos;s criteria. Do not include faces or sensitive documents.
                  </span>
                </div>

                {uploadStage && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-lime-500/30 bg-lime-500/10 px-4 py-3 text-xs font-medium text-lime-300">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                    <span>{uploadStage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!previewDataUrl || Boolean(uploadStage)}
                  className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <span>Submit for Verification</span>
                </button>
              </form>
            )}
          </div>

          {/* Latest Submission Verification Details */}
          {latest && (
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-semibold">Submission Result</h3>
                <StatusIndicator status={latest.status} />
              </div>

              {latest.has_evidence && (
                <div className="space-y-2">
                  <img
                    src={`/api/submissions/${latest.id}/evidence`}
                    alt="Uploaded submission evidence"
                    className="max-h-48 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => void handleDeleteEvidence(latest.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Delete Evidence Photo</span>
                  </button>
                </div>
              )}

              {!latest.has_evidence && latest.evidence_deleted_at && (
                <p className="text-xs text-[var(--text-secondary)]">
                  Evidence photo deleted by user. Verification record retained.
                </p>
              )}

              {latest.review_note && (
                <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-xs space-y-1">
                  <p className="font-semibold">Admin Review Note</p>
                  <p className="text-[var(--text-secondary)]">{latest.review_note}</p>
                </div>
              )}

              {latest.ai_result && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span>AI Assessment Summary</span>
                    <span className="font-mono-tabular">
                      Confidence: {Math.round(latest.ai_result.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{latest.ai_result.summary}</p>

                  {latest.ai_result.evidence_found.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-semibold text-[var(--text-secondary)]">Visible Evidence</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[var(--text-secondary)]">
                        {latest.ai_result.evidence_found.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latest.ai_result.limitations.length > 0 && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                      <p className="flex items-center gap-1.5 font-semibold text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Verification Limitations</span>
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[var(--text-secondary)]">
                        {latest.ai_result.limitations.map((lim, idx) => (
                          <li key={idx}>{lim}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
