import {
  Compass,
  Flame,
  LayoutDashboard,
  Leaf,
  LogOut,
  Settings,
  ShieldCheck,
  ShoppingBag,
  User,
} from 'lucide-react';
import type {ReactNode} from 'react';
import type {UserProfile} from '../shared/types';

export type AppRoute =
  | 'landing'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'quests'
  | 'quest-detail'
  | 'profile'
  | 'shop'
  | 'settings'
  | 'admin';

interface AppShellProps {
  route: AppRoute;
  user: UserProfile | null;
  onNavigate: (route: AppRoute, slug?: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function AppShell({route, user, onNavigate, onLogout, children}: AppShellProps) {
  const isPublic = !user || route === 'landing' || route === 'login' || route === 'signup';

  if (isPublic) {
    return (
      <div className="min-h-screen bg-transparent text-[var(--text-primary)]">
        {/* Strict 3-zone Top Bar Contract */}
        <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2 font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-500"
            >
              <Leaf className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
              <span>EcoQuest</span>
            </button>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
              <a
                href="#how-it-works"
                onClick={(e) => {
                  if (route !== 'landing') {
                    e.preventDefault();
                    onNavigate('landing');
                  }
                }}
                className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
              >
                Hogyan működik
              </a>
              <a
                href="#sample-quests"
                onClick={(e) => {
                  if (route !== 'landing') {
                    e.preventDefault();
                    onNavigate('landing');
                  }
                }}
                className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
              >
                Küldetések
              </a>
              <a
                href="#progression"
                onClick={(e) => {
                  if (route !== 'landing') {
                    e.preventDefault();
                    onNavigate('landing');
                  }
                }}
                className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
              >
                Szintek
              </a>
              <a
                href="#mission"
                onClick={(e) => {
                  if (route !== 'landing') {
                    e.preventDefault();
                    onNavigate('landing');
                  }
                }}
                className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
              >
                Küldetésünk
              </a>
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              {user ? (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="eq-interactive-btn min-h-[40px] rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90 whitespace-nowrap shrink-0"
                >
                  Irányítópult megnyitása
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(route === 'signup' ? 'login' : 'signup')}
                  className="eq-interactive-btn min-h-[40px] rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90 whitespace-nowrap shrink-0"
                >
                  {route === 'signup' ? 'Bejelentkezés' : 'Kezdés'}
                </button>
              )}
            </div>
          </div>
        </header>

        <main key={route} className="eq-animate-view">
          {children}
        </main>
      </div>
    );
  }

  const navItems: Array<{id: AppRoute; label: string; icon: typeof LayoutDashboard}> = [
    {id: 'dashboard', label: 'Irányítópult', icon: LayoutDashboard},
    {id: 'quests', label: 'Küldetések', icon: Compass},
    {id: 'shop', label: 'Bolt', icon: ShoppingBag},
    {id: 'profile', label: 'Profil', icon: User},
    {id: 'settings', label: 'Beállítások', icon: Settings},
  ];

  if (user.role === 'admin') {
    navItems.push({id: 'admin', label: 'Admin sor', icon: ShieldCheck});
  }

  const activeNavId: AppRoute = route === 'quest-detail' ? 'quests' : route;

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)] lg:flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-[var(--border-hairline)]">
          <Leaf className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0"
          >
            EcoQuest
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Elsődleges navigáció">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                data-spotlight
                onClick={() => onNavigate(item.id)}
                className={`group eq-interactive-btn flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--bg-surface-elevated)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)]/60 hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon
                  className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border-hairline)] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-mono-tabular">{user.level}. szint</span>
            <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
              {user.eco_points} pont
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="truncate text-left text-sm font-medium hover:text-[var(--accent-primary)] transition-colors"
            >
              {user.username}
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Kijelentkezés"
              aria-label="Kijelentkezés"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-60 flex flex-col min-h-screen">
        {/* Compact Mobile Top Header (52px) */}
        <header className="sticky top-0 z-30 flex lg:hidden h-13 items-center justify-between gap-4 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/90 backdrop-blur-md px-4">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 font-display text-base font-bold whitespace-nowrap shrink-0"
          >
            <Leaf className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
            <span>EcoQuest</span>
          </button>
          <div className="flex items-center gap-4 text-xs font-mono-tabular">
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-500">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              {user.current_streak}n
            </span>
            <span className="font-semibold text-[var(--accent-primary)]">
              {user.eco_points} pont
            </span>
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                aria-label="Admin sor"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[var(--accent-emerald)]"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
          <div key={route} className="eq-animate-view">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Thumb-Zone Navigation (64px) */}
      <nav
        aria-label="Mobil navigáció"
        className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 h-16 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md lg:hidden"
      >
        {[
          {id: 'dashboard' as AppRoute, label: 'Főoldal', icon: LayoutDashboard},
          {id: 'quests' as AppRoute, label: 'Küldetések', icon: Compass},
          {id: 'shop' as AppRoute, label: 'Bolt', icon: ShoppingBag},
          {id: 'profile' as AppRoute, label: 'Profil', icon: User},
          {id: 'settings' as AppRoute, label: 'Beállítások', icon: Settings},
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeNavId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              data-spotlight
              onClick={() => onNavigate(item.id)}
              className={`eq-interactive-btn flex flex-col items-center justify-center min-h-[44px] ${
                isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform duration-150 ${isActive ? 'scale-105' : ''}`}
                aria-hidden="true"
              />
              <span className="mt-1 text-[10px] font-medium tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
