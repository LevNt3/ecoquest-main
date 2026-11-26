import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Info,
  Loader2,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {AppRoute} from '../components/AppShell';
import {StatusIndicator} from '../components/StatusBadge';
import {
  apiFetch,
  compressImageToDataUrl,
  formatCategoryLabel,
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
  const [statusBanner, setStatusBanner] = useState<{
    tone: 'approved' | 'needs_review' | 'rejected';
    text: string;
  } | null>(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (stageTimerRef.current) {
        clearTimeout(stageTimerRef.current);
      }
    };
  }, []);

  const loadQuest = useCallback(async () => {
    try {
      const res = await apiFetch<{quest: QuestItem; submissions: QuestSubmission[]}>(
        `/api/quests/${encodeURIComponent(slug)}`,
      );
      setQuest(res.quest);
      setSubmissions(res.submissions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A küldetés nem található');
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
      setActionError(err instanceof Error ? err.message : 'Nem sikerült elindítani a küldetést');
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
      setActionError(err instanceof Error ? err.message : 'Nem sikerült feldolgozni a képet');
    }
  }

  async function handleSubmitEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!quest || !previewDataUrl) return;
    setActionError(null);
    setStatusBanner(null);
    setUploadStage('Fotó feltöltése privát tárhelyre...');

    if (stageTimerRef.current) {
      clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
    }

    try {
      stageTimerRef.current = setTimeout(() => {
        setUploadStage('Látható bizonyíték elemzése Cloudflare Workers AI-val...');
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

      onUserSync(res.user, res.levelProgress);
      setPreviewDataUrl(null);
      setUserNote('');

      if (res.reward.submissionStatus === 'approved') {
        const achText =
          res.reward.newAchievements.length > 0
            ? ` Feloldott eredmények: ${res.reward.newAchievements.join(', ')}.`
            : '';
        setStatusBanner({
          tone: 'approved',
          text: `Igazolva! Szereztél +${res.reward.xpAwarded} XP-t és +${res.reward.pointsAwarded} EcoPoints pontot.${achText}`,
        });
      } else if (res.reward.submissionStatus === 'needs_review') {
        setStatusBanner({
          tone: 'needs_review',
          text: 'Beküldve! A fotód időbélyeggel mentésre került és manuális adminisztrátori felülvizsgálatra vár. Jóváhagyás után az XP-d, az EcoPoints pontjaid és a napi sorozatod automatikusan frissül.',
        });
      } else if (res.reward.submissionStatus === 'rejected') {
        setStatusBanner({
          tone: 'rejected',
          text: 'Az ellenőrzés nem ment át. Nézd meg az alábbi teljesítési feltételeket és korlátokat, majd tölts fel egy tisztább fotót.',
        });
      }

      await loadQuest();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Az ellenőrzési kérés sikertelen volt');
    } finally {
      if (stageTimerRef.current) {
        clearTimeout(stageTimerRef.current);
        stageTimerRef.current = null;
      }
      setUploadStage(null);
    }
  }

  async function handleDeleteEvidence(submissionId: string) {
    setActionError(null);
    setDeletingPhoto(true);
    try {
      await apiFetch(`/api/submissions/${encodeURIComponent(submissionId)}/evidence`, {
        method: 'DELETE',
      });
      setConfirmDeletePhoto(false);
      await loadQuest();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Nem sikerült törölni a bizonyítékfotót');
    } finally {
      setDeletingPhoto(false);
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
          <span>Vissza a küldetésekhez</span>
        </button>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-400">
          {error || 'A küldetés nem található'}
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
        <span>Vissza a küldetésfelfedezőhöz</span>
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
                {formatCategoryLabel(quest.category)} · {formatQuestTypeLabel(quest.quest_type)} ·{' '}
                {formatDifficultyLabel(quest.difficulty)} · {quest.estimated_minutes} perc
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
                <p className="text-xs text-[var(--text-secondary)]">XP jutalom</p>
                <p className="font-mono-tabular font-semibold text-[var(--accent-primary)]">
                  +{quest.xp_reward} XP
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">EcoPoints</p>
                <p className="font-mono-tabular font-semibold text-[var(--accent-emerald)]">
                  +{quest.eco_points_reward} pont
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Ellenőrzés</p>
                <p className="font-medium">Fotóbizonyíték</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-base font-semibold">Útmutató</h2>
              <div className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
                {quest.instructions}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-base font-semibold">Miért számít ez?</h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {quest.environmental_impact}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 space-y-1.5">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Teljesítési feltételek
              </p>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {quest.verification_criteria}
              </p>
            </div>
          </div>
        </div>

        {/* Action & Evidence Verification Column */}
        <div className="space-y-6 lg:col-span-5">
          {statusBanner && (
            <div
              key={`${statusBanner.tone}-${statusBanner.text}`}
              role="status"
              className={`eq-animate-banner rounded-2xl border p-4 text-sm flex items-start gap-3 ${
                statusBanner.tone === 'approved'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                  : statusBanner.tone === 'needs_review'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300'
              }`}
            >
              {statusBanner.tone === 'approved' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              ) : statusBanner.tone === 'needs_review' ? (
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-rose-700 dark:text-rose-400" aria-hidden="true" />
              )}
              <span>{statusBanner.text}</span>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="eq-animate-banner rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-400 flex items-start gap-3"
            >
              <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Bizonyíték feltöltése</h2>
              {quest.user_status === 'available' && (
                <button
                  type="button"
                  onClick={handleStartQuest}
                  disabled={starting}
                  className="eq-interactive-btn inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-1.5 text-xs font-semibold hover:bg-[var(--bg-surface-elevated)]"
                >
                  {starting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                  )}
                  <span>Küldetés indítása</span>
                </button>
              )}
            </div>

            {isBlockedForPeriod ? (
              <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 space-y-2">
                <p className="text-sm font-semibold">
                  {latest?.status === 'approved'
                    ? 'Küldetés teljesítve erre az időszakra'
                    : 'Beküldés rögzítve, felülvizsgálatra vár'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {latest?.status === 'approved'
                    ? `Igazolva a(z) ${quest.period_key} időszakban. Térj vissza a következő ciklusban!`
                    : 'A fotóbizonyítékod az adminisztrátori felülvizsgálati sorba került. Jóváhagyáskor az XP-d, az EcoPoints egyenleged és a napi sorozatod frissülni fog.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitEvidence} className="space-y-4">
                {/* Explicit User-Triggered Camera Picker */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={(e) => void handleFileSelected(e.target.files?.[0])}
                  className="sr-only"
                />

                {previewDataUrl ? (
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                      <img
                        src={previewDataUrl}
                        alt="Kiválasztott bizonyíték előnézete"
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDataUrl(null)}
                      className="text-xs font-medium text-rose-700 dark:text-rose-400 hover:underline"
                    >
                      Kiválasztott fotó eltávolítása
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="eq-interactive-btn flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 text-xs font-medium hover:border-lime-500/50 hover:bg-[var(--bg-surface-elevated)]/40"
                  >
                    <Camera className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
                    <span>Kamera használata</span>
                  </button>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="quest-note" className="block text-xs font-medium text-[var(--text-secondary)]">
                    Opcionális megjegyzés
                  </label>
                  <textarea
                    id="quest-note"
                    rows={2}
                    maxLength={400}
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Írd le röviden, mi látható a fotón (pl. különválogatott palackok és papír)..."
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                  />
                </div>

                <div className="flex items-start gap-2 rounded-xl bg-[var(--bg-canvas)] p-3 text-xs text-[var(--text-secondary)]">
                  <Info className="h-4 w-4 shrink-0 text-[var(--accent-primary)] mt-0.5" aria-hidden="true" />
                  <span>
                    A feltöltött fotók privát tárhelyen maradnak, és kizárólag a küldetés feltételeinek
                    ellenőrzéséhez kerülnek a Cloudflare Workers AI rendszeréhez. Ne szerepeljenek rajta
                    arcok vagy bizalmas dokumentumok.
                  </span>
                </div>

                {uploadStage && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-lime-500/30 bg-lime-500/10 px-4 py-3 text-xs font-medium text-lime-800 dark:text-lime-300">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                    <span>{uploadStage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!previewDataUrl || Boolean(uploadStage)}
                  className="eq-interactive-btn flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90 disabled:opacity-50"
                >
                  <span>Beküldés ellenőrzésre</span>
                </button>
              </form>
            )}
          </div>

          {/* Latest Submission Verification Details */}
          {latest && (
            <div
              key={latest.id + latest.status}
              className="eq-animate-card rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-semibold">Beküldés eredménye</h3>
                <StatusIndicator status={latest.status} />
              </div>

              {latest.has_evidence && (
                <div className="space-y-2">
                  <img
                    src={`/api/submissions/${latest.id}/evidence`}
                    alt="Feltöltött bizonyíték"
                    className="max-h-48 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] object-contain"
                  />
                  {confirmDeletePhoto ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                      <span className="text-xs font-medium text-rose-800 dark:text-rose-300 mr-auto">
                        Véglegesen törlöd ezt a fotót? Az ellenőrzési naplód megmarad.
                      </span>
                      <button
                        type="button"
                        disabled={deletingPhoto}
                        onClick={() => void handleDeleteEvidence(latest.id)}
                        className="min-h-[34px] rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        {deletingPhoto ? 'Törlés...' : 'Fotó törlése'}
                      </button>
                      <button
                        type="button"
                        disabled={deletingPhoto}
                        onClick={() => setConfirmDeletePhoto(false)}
                        className="min-h-[34px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Mégse
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePhoto(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Bizonyítékfotó törlése</span>
                    </button>
                  )}
                </div>
              )}

              {!latest.has_evidence && latest.evidence_deleted_at && (
                <p className="text-xs text-[var(--text-secondary)]">
                  A bizonyítékfotót a felhasználó törölte. Az ellenőrzési bejegyzés megmaradt.
                </p>
              )}

              {latest.review_note && (
                <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-xs space-y-1">
                  <p className="font-semibold">Adminisztrátori megjegyzés</p>
                  <p className="text-[var(--text-secondary)]">{latest.review_note}</p>
                </div>
              )}

              {latest.ai_result && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span>AI-értékelés összefoglalója</span>
                    <span className="font-mono-tabular">
                      Megbízhatóság: {Math.round(latest.ai_result.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{latest.ai_result.summary}</p>

                  {latest.ai_result.evidence_found.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-semibold text-[var(--text-secondary)]">Látható bizonyítékok</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[var(--text-secondary)]">
                        {latest.ai_result.evidence_found.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latest.ai_result.limitations.length > 0 && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                      <p className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ellenőrzési korlátok</span>
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
