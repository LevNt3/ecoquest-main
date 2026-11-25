-- EcoQuest Supabase PostgreSQL Schema, RLS Policies, Storage & Atomic Reward RPC
-- Designed for the team's external Next.js + Supabase repository

create extension if not exists "pgcrypto";

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  eco_points integer not null default 0 check (eco_points >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_quest_date date,
  theme_preference text not null default 'dark' check (theme_preference in ('dark', 'light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Quests
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null,
  instructions text not null,
  environmental_impact text not null,
  category text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard', 'epic')),
  quest_type text not null check (quest_type in ('daily', 'weekly', 'one_time', 'special')),
  estimated_minutes integer not null check (estimated_minutes > 0),
  xp_reward integer not null check (xp_reward > 0),
  eco_points_reward integer not null check (eco_points_reward >= 0),
  verification_type text not null default 'photo' check (verification_type in ('photo')),
  verification_criteria text not null,
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. User Quests (prevents duplicate active/completed runs in same period)
create table if not exists public.user_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  period_key text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, quest_id, period_key)
);

-- 4. Quest Submissions
create table if not exists public.quest_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  user_quest_id uuid references public.user_quests(id) on delete set null,
  period_key text not null,
  evidence_path text,
  evidence_deleted_at timestamptz,
  user_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_review')),
  ai_confidence numeric(4,3),
  ai_result jsonb,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_submissions_status_created on public.quest_submissions (status, created_at desc);
create index if not exists idx_submissions_user_created on public.quest_submissions (user_id, created_at desc);

-- 5. Immutable Reward Transactions
create table if not exists public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid references public.quest_submissions(id) on delete set null,
  tx_type text not null check (tx_type in ('quest_reward', 'achievement_bonus', 'admin_adjustment')),
  xp_delta integer not null,
  points_delta integer not null,
  description text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_unique_reward_per_submission
  on public.reward_transactions (submission_id, tx_type)
  where submission_id is not null and tx_type = 'quest_reward';

-- 6. Achievements & Unlocks
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  description text not null,
  rule_type text not null check (rule_type in ('quests_completed', 'streak_days', 'total_xp', 'category_count')),
  rule_threshold integer not null,
  xp_bonus integer not null default 0
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.quests enable row level security;
alter table public.user_quests enable row level security;
alter table public.quest_submissions enable row level security;
alter table public.reward_transactions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

-- Helper function to check admin role safely
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- RLS Policies
create policy "Users view own profile or admin views all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users update own safe profile fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Anyone views active quests; admins view all"
  on public.quests for select
  using (is_active = true or public.is_admin());

create policy "Admins manage quests"
  on public.quests for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users manage own quest progress"
  on public.user_quests for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users insert own quest start"
  on public.user_quests for insert
  with check (auth.uid() = user_id);

create policy "Users view own submissions; admins view all"
  on public.quest_submissions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users insert own submissions as pending"
  on public.quest_submissions for insert
  with check (auth.uid() = user_id and status = 'pending');

create policy "Users view own reward transactions"
  on public.reward_transactions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Public reads achievements"
  on public.achievements for select
  using (true);

create policy "Users view own unlocked achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id or public.is_admin());

-- Prevent client tampering with privileged profile columns
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_setting('role') not in ('service_role', 'postgres') then
    new.role := old.role;
    new.xp := old.xp;
    new.level := old.level;
    new.eco_points := old.eco_points;
    new.current_streak := old.current_streak;
    new.longest_streak := old.longest_streak;
    new.last_quest_date := old.last_quest_date;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_columns on public.profiles;
create trigger trg_protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Private evidence storage bucket policies
insert into storage.buckets (id, name, public)
values ('quest-evidence', 'quest-evidence', false)
on conflict (id) do nothing;

create policy "Users upload own private evidence"
  on storage.objects for insert
  with check (bucket_id = 'quest-evidence' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users or admins read private evidence"
  on storage.objects for select
  using (
    bucket_id = 'quest-evidence'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

create policy "Users delete own private evidence"
  on storage.objects for delete
  using (bucket_id = 'quest-evidence' and auth.uid()::text = (storage.foldername(name))[1]);
