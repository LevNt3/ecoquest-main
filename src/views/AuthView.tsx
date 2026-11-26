import {zodResolver} from '@hookform/resolvers/zod';
import {Loader2} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import type {AppRoute} from '../components/AppShell';
import {apiFetch} from '../lib/api';
import {AuthLoginSchema, AuthSignupSchema, type LevelProgress, type UserProfile} from '../shared/types';

interface AuthViewProps {
  mode: 'login' | 'signup';
  onSuccess: (user: UserProfile, levelProgress: LevelProgress) => void;
  onNavigate: (route: AppRoute) => void;
}

type LoginValues = z.infer<typeof AuthLoginSchema>;
type SignupValues = z.infer<typeof AuthSignupSchema>;

export function AuthView({mode, onSuccess, onNavigate}: AuthViewProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(AuthLoginSchema),
    defaultValues: {email: '', password: ''},
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(AuthSignupSchema),
    defaultValues: {email: '', username: '', password: ''},
  });

  async function handleLogin(values: LoginValues) {
    setServerError(null);
    try {
      const res = await apiFetch<{user: UserProfile; levelProgress: LevelProgress}>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      onSuccess(res.user, res.levelProgress);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Unable to sign in');
    }
  }

  async function handleSignup(values: SignupValues) {
    setServerError(null);
    try {
      const res = await apiFetch<{user: UserProfile; levelProgress: LevelProgress}>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      onSuccess(res.user, res.levelProgress);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Unable to create account');
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {mode === 'login' ? 'Sign in to EcoQuest' : 'Create your EcoQuest account'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {mode === 'login'
              ? 'Continue your daily sustainability streak and quests.'
              : 'Start earning XP and EcoPoints for verified eco-habits.'}
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-400"
          >
            {serverError}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-medium text-[var(--text-secondary)]">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                {...loginForm.register('email')}
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                placeholder="alex@university.edu"
              />
              {loginForm.formState.errors.email && (
                <p className="text-xs text-rose-700 dark:text-rose-400">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                {...loginForm.register('password')}
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                placeholder="••••••••"
              />
              {loginForm.formState.errors.password && (
                <p className="text-xs text-rose-700 dark:text-rose-400">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loginForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Sign In</span>
            </button>
          </form>
        ) : (
          <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="signup-username" className="block text-xs font-medium text-[var(--text-secondary)]">
                Username
              </label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                {...signupForm.register('username')}
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                placeholder="eco_explorer"
              />
              {signupForm.formState.errors.username && (
                <p className="text-xs text-rose-700 dark:text-rose-400">{signupForm.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="block text-xs font-medium text-[var(--text-secondary)]">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                {...signupForm.register('email')}
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                placeholder="alex@university.edu"
              />
              {signupForm.formState.errors.email && (
                <p className="text-xs text-rose-700 dark:text-rose-400">{signupForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-password" className="block text-xs font-medium text-[var(--text-secondary)]">
                Password (min 8 characters)
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                {...signupForm.register('password')}
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-lime-500"
                placeholder="••••••••"
              />
              {signupForm.formState.errors.password && (
                <p className="text-xs text-rose-700 dark:text-rose-400">{signupForm.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={signupForm.formState.isSubmitting}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-primary-fg)] hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {signupForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Create Account</span>
            </button>
          </form>
        )}

        <div className="border-t border-[var(--border-hairline)] pt-4 text-center text-sm text-[var(--text-secondary)]">
          {mode === 'login' ? (
            <>
              New to EcoQuest?{' '}
              <button
                type="button"
                onClick={() => onNavigate('signup')}
                className="font-semibold text-[var(--accent-primary)] hover:underline"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="font-semibold text-[var(--accent-primary)] hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
