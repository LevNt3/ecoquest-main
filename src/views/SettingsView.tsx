import {Loader2, LogOut, Moon, Shield, Sun, Trash2} from 'lucide-react';
import {useEffect, useState} from 'react';
import {apiFetch} from '../lib/api';
import type {UserProfile} from '../shared/types';

interface SettingsViewProps {
  user: UserProfile;
  theme: 'dark' | 'light';
  onThemeChange: (next: 'dark' | 'light') => void;
  onUserUpdate: (user: UserProfile) => void;
  onLogout: () => void;
}

export function SettingsView({
  user,
  theme,
  onThemeChange,
  onUserUpdate,
  onLogout,
}: SettingsViewProps) {
  const [adminStatus, setAdminStatus] = useState<{
    hasAdmin: boolean;
    passcodeConfigured: boolean;
    canClaimInitialAdmin: boolean;
  } | null>(null);
  const [passcode, setPasscode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{hasAdmin: boolean; passcodeConfigured: boolean; canClaimInitialAdmin: boolean}>(
      '/api/auth/admin-status',
    )
      .then(setAdminStatus)
      .catch(() => null);
  }, [user.role]);

  async function handleThemeSelect(next: 'dark' | 'light') {
    onThemeChange(next);
    try {
      const res = await apiFetch<{user: UserProfile}>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({theme_preference: next}),
      });
      onUserUpdate(res.user);
    } catch {
      setErrorMessage('A téma helyben frissült, de nem sikerült elmenteni a fiókodba.');
    }
  }

  async function handleBulkDeleteEvidence() {
    setDeletingAll(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await apiFetch<{deletedCount: number}>('/api/evidence/bulk', {
        method: 'DELETE',
      });
      setConfirmBulkDelete(false);
      setStatusMessage(
        `${res.deletedCount} tárolt bizonyítékfotó törölve. A megszerzett XP-d és küldetéstörténeted változatlan maradt.`,
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Nem sikerült törölni a bizonyítékokat');
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleClaimAdmin(e: React.FormEvent) {
    e.preventDefault();
    setClaiming(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await apiFetch<{user: UserProfile}>('/api/auth/claim-admin', {
        method: 'POST',
        body: JSON.stringify(passcode.trim() ? {passcode: passcode.trim()} : {}),
      });
      onUserUpdate(res.user);
      setPasscode('');
      setStatusMessage('Adminisztrátori jogosultság aktiválva. Nyisd meg az Admin sort a menüből.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Nem sikerült aktiválni az admin szerepkört');
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Beállítások</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Megjelenés, bizonyítékok adatvédelme és fiókhozzáférés kezelése.
        </p>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300"
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-400"
        >
          {errorMessage}
        </div>
      )}

      {/* Theme Selection */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Téma beállítása</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={theme === 'dark'}
            onClick={() => void handleThemeSelect('dark')}
            className={`eq-interactive-btn flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${
              theme === 'dark'
                ? 'border-lime-500 bg-[var(--bg-surface-elevated)] text-[var(--accent-primary)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
            }`}
          >
            <Moon className="h-4 w-4" aria-hidden="true" />
            <span>Sötét erdő</span>
          </button>
          <button
            type="button"
            aria-pressed={theme === 'light'}
            onClick={() => void handleThemeSelect('light')}
            className={`eq-interactive-btn flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${
              theme === 'light'
                ? 'border-lime-600 bg-[var(--bg-surface-elevated)] text-[var(--accent-primary)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
            }`}
          >
            <Sun className="h-4 w-4" aria-hidden="true" />
            <span>Világos zsálya</span>
          </button>
        </div>
      </section>

      {/* AI Verification & Privacy */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">AI-ellenőrzés és adatvédelem</h2>
        <div className="space-y-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          <p>
            Amikor beküldesz egy küldetésfotót, az EcoQuest privát szervertárhelyen tárolja, és
            kizárólag a küldetés látható feltételeinek ellenőrzésére továbbítja a szerveroldali
            Cloudflare Workers AI látásmodell felé.
          </p>
          <p>
            Soha nem kérünk szelfit, arcfelismerést, igazolványt vagy háttérbeli kamerahozzáférést.
            A tárolt bizonyítékfotókat bármikor törölheted anélkül, hogy elveszítenéd az XP-det vagy
            az EcoPoints pontjaidat.
          </p>
        </div>

        {confirmBulkDelete ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
            <p className="text-xs font-medium text-rose-800 dark:text-rose-300">
              Véglegesen törlöd az összes tárolt bizonyítékfotódat? Az XP-d, az EcoPoints egyenleged
              és a küldetéstörténeted érintetlen marad.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleBulkDeleteEvidence()}
                disabled={deletingAll}
                className="eq-interactive-btn inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deletingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Összes fotó törlésének megerősítése</span>
              </button>
              <button
                type="button"
                disabled={deletingAll}
                onClick={() => setConfirmBulkDelete(false)}
                className="min-h-[40px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Mégse
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmBulkDelete(true)}
            disabled={deletingAll}
            className="eq-interactive-btn inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Összes tárolt bizonyítékfotó törlése</span>
          </button>
        )}
      </section>

      {/* Admin Access Claim / Unlock */}
      {user.role !== 'admin' &&
        adminStatus &&
        (adminStatus.canClaimInitialAdmin || adminStatus.passcodeConfigured) && (
          <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[var(--accent-emerald)]" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold">Admin hozzáférés beállítása</h2>
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Add meg a szerveroldali admin jelszót (`ADMIN_PASSCODE`), hogy adminisztrátori
              jogosultságot kapj a küldetések és a felülvizsgálati sor kezeléséhez.
            </p>
            <form onSubmit={handleClaimAdmin} className="flex flex-wrap items-end gap-3">
              {adminStatus.passcodeConfigured && (
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <label
                    htmlFor="admin-passcode"
                    className="block text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Szerver admin jelszó
                  </label>
                  <input
                    id="admin-passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Add meg az ADMIN_PASSCODE értéket"
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={claiming}
                className="eq-interactive-btn inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]"
              >
                {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Admin szerepkör feloldása</span>
              </button>
            </form>
          </section>
        )}

      {/* Account Sign Out */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Bejelentkezve: {user.email}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Szerepkör: {user.role === 'admin' ? 'Adminisztrátor' : 'Felhasználó'}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="eq-interactive-btn inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-surface-elevated)]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Kijelentkezés</span>
        </button>
      </section>
    </div>
  );
}
