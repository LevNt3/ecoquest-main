import {useCallback, useEffect, useState} from 'react';
import {AppShell, type AppRoute} from './components/AppShell';
import {apiFetch} from './lib/api';
import type {LevelProgress, UserProfile} from './shared/types';
import {AdminView} from './views/AdminView';
import {AuthView} from './views/AuthView';
import {DashboardView} from './views/DashboardView';
import {LandingView} from './views/LandingView';
import {ProfileView} from './views/ProfileView';
import {QuestDetailView} from './views/QuestDetailView';
import {QuestExplorerView} from './views/QuestExplorerView';
import {SettingsView} from './views/SettingsView';
import {ShopView} from './views/ShopView';

const PUBLIC_ROUTES: AppRoute[] = ['landing', 'login', 'signup'];
const VALID_ROUTES: AppRoute[] = [
  'landing',
  'login',
  'signup',
  'dashboard',
  'quests',
  'quest-detail',
  'profile',
  'shop',
  'settings',
  'admin',
];

function parseHashRoute(): {route: AppRoute; slug: string} {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  if (!raw) return {route: 'landing', slug: ''};

  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'quests' && parts[1]) {
    return {route: 'quest-detail', slug: decodeURIComponent(parts[1])};
  }
  const candidate = parts[0] as AppRoute;
  if (VALID_ROUTES.includes(candidate) && candidate !== 'quest-detail') {
    return {route: candidate, slug: ''};
  }
  return {route: 'landing', slug: ''};
}

function formatHashRoute(route: AppRoute, slug?: string): string {
  if (route === 'landing') return '#/';
  if (route === 'quest-detail' && slug) {
    return `#/quests/${encodeURIComponent(slug)}`;
  }
  return `#/${route}`;
}

export default function App() {
  const initialHash = parseHashRoute();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [, setLevelProgress] = useState<LevelProgress | null>(null);
  const [booting, setBooting] = useState(true);
  const [route, setRoute] = useState<AppRoute>(initialHash.route);
  const [questSlug, setQuestSlug] = useState<string>(initialHash.slug);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const syncUrlHash = useCallback((nextRoute: AppRoute, nextSlug?: string) => {
    const targetHash = formatHashRoute(nextRoute, nextSlug);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    apiFetch<{user: UserProfile | null; levelProgress: LevelProgress | null}>('/api/auth/me')
      .then((res) => {
        const current = parseHashRoute();
        if (res.user) {
          setUser(res.user);
          setLevelProgress(res.levelProgress);
          setTheme(res.user.theme_preference || 'dark');
          if (PUBLIC_ROUTES.includes(current.route)) {
            setRoute('dashboard');
            syncUrlHash('dashboard');
          } else if (current.route === 'admin' && res.user.role !== 'admin') {
            setRoute('dashboard');
            syncUrlHash('dashboard');
          } else {
            setRoute(current.route);
            setQuestSlug(current.slug);
          }
        } else if (!PUBLIC_ROUTES.includes(current.route)) {
          setRoute('login');
          syncUrlHash('login');
        }
      })
      .catch(() => null)
      .finally(() => setBooting(false));
  }, [syncUrlHash]);

  useEffect(() => {
    function handleHashChange() {
      if (booting) return;
      const parsed = parseHashRoute();
      if (!user && !PUBLIC_ROUTES.includes(parsed.route)) {
        setRoute('login');
        syncUrlHash('login');
        return;
      }
      if (parsed.route === 'admin' && user?.role !== 'admin') {
        setRoute('dashboard');
        syncUrlHash('dashboard');
        return;
      }
      setQuestSlug(parsed.slug);
      setRoute(parsed.route);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [booting, user, syncUrlHash]);

  const handleNavigate = useCallback(
    (nextRoute: AppRoute, slug?: string) => {
      if (!user && !PUBLIC_ROUTES.includes(nextRoute)) {
        setRoute('login');
        syncUrlHash('login');
        return;
      }
      if (nextRoute === 'admin' && user?.role !== 'admin') {
        setRoute('dashboard');
        syncUrlHash('dashboard');
        return;
      }
      const nextSlug = slug ?? questSlug;
      if (slug) {
        setQuestSlug(slug);
      }
      setRoute(nextRoute);
      syncUrlHash(nextRoute, nextSlug);
      window.scrollTo({top: 0, behavior: 'smooth'});
    },
    [user, questSlug, syncUrlHash],
  );

  const handleUserSync = useCallback((nextUser: UserProfile, nextProgress: LevelProgress) => {
    setUser(nextUser);
    setLevelProgress(nextProgress);
  }, []);

  const handleAuthSuccess = useCallback(
    (nextUser: UserProfile, nextProgress: LevelProgress) => {
      setUser(nextUser);
      setLevelProgress(nextProgress);
      setTheme(nextUser.theme_preference || 'dark');
      setRoute('dashboard');
      syncUrlHash('dashboard');
    },
    [syncUrlHash],
  );

  const handleLogout = useCallback(async () => {
    await apiFetch('/api/auth/logout', {method: 'POST'}).catch(() => null);
    setUser(null);
    setLevelProgress(null);
    setRoute('landing');
    syncUrlHash('landing');
  }, [syncUrlHash]);

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-secondary)] text-sm">
        Loading EcoQuest...
      </div>
    );
  }

  return (
    <AppShell route={route} user={user} onNavigate={handleNavigate} onLogout={handleLogout}>
      {route === 'landing' && (
        <LandingView isAuthenticated={Boolean(user)} onNavigate={handleNavigate} />
      )}
      {(route === 'login' || route === 'signup') && (
        <AuthView mode={route} onSuccess={handleAuthSuccess} onNavigate={handleNavigate} />
      )}
      {user && route === 'dashboard' && (
        <DashboardView onNavigate={handleNavigate} onUserSync={handleUserSync} />
      )}
      {user && route === 'quests' && <QuestExplorerView onNavigate={handleNavigate} />}
      {user && route === 'quest-detail' && questSlug && (
        <QuestDetailView slug={questSlug} onNavigate={handleNavigate} onUserSync={handleUserSync} />
      )}
      {user && route === 'profile' && (
        <ProfileView onNavigate={handleNavigate} onUserSync={handleUserSync} />
      )}
      {user && route === 'shop' && <ShopView user={user} />}
      {user && route === 'settings' && (
        <SettingsView
          user={user}
          theme={theme}
          onThemeChange={setTheme}
          onUserUpdate={setUser}
          onLogout={handleLogout}
        />
      )}
      {user && route === 'admin' && user.role === 'admin' && <AdminView />}
    </AppShell>
  );
}
