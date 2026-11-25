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

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [, setLevelProgress] = useState<LevelProgress | null>(null);
  const [booting, setBooting] = useState(true);
  const [route, setRoute] = useState<AppRoute>('landing');
  const [questSlug, setQuestSlug] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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
        if (res.user) {
          setUser(res.user);
          setLevelProgress(res.levelProgress);
          setTheme(res.user.theme_preference || 'dark');
          setRoute('dashboard');
        }
      })
      .catch(() => null)
      .finally(() => setBooting(false));
  }, []);

  const handleNavigate = useCallback(
    (nextRoute: AppRoute, slug?: string) => {
      if (!user && !['landing', 'login', 'signup'].includes(nextRoute)) {
        setRoute('login');
        return;
      }
      if (nextRoute === 'admin' && user?.role !== 'admin') {
        setRoute('dashboard');
        return;
      }
      if (slug) {
        setQuestSlug(slug);
      }
      setRoute(nextRoute);
      window.scrollTo({top: 0, behavior: 'smooth'});
    },
    [user],
  );

  const handleUserSync = useCallback((nextUser: UserProfile, nextProgress: LevelProgress) => {
    setUser(nextUser);
    setLevelProgress(nextProgress);
  }, []);

  const handleAuthSuccess = useCallback((nextUser: UserProfile, nextProgress: LevelProgress) => {
    setUser(nextUser);
    setLevelProgress(nextProgress);
    setTheme(nextUser.theme_preference || 'dark');
    setRoute('dashboard');
  }, []);

  const handleLogout = useCallback(async () => {
    await apiFetch('/api/auth/logout', {method: 'POST'}).catch(() => null);
    setUser(null);
    setLevelProgress(null);
    setRoute('landing');
  }, []);

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
