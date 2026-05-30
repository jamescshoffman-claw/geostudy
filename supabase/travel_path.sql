-- Run this once in the Supabase dashboard → SQL Editor → New query → Run.
-- Backs the "completed" checkmarks on the Travel Path levels list. Each user has
-- at most one row per challenge (best step count), guarded by row-level security
-- so they can only see and modify their own rows.

create table if not exists public.travel_path_completions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  challenge_key text not null,
  best_steps    integer not null,
  completed_at  timestamptz not null default now(),
  unique (user_id, challenge_key)
);

alter table public.travel_path_completions enable row level security;

create policy "Users can read their own completions"
  on public.travel_path_completions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own completions"
  on public.travel_path_completions for insert
  with check (auth.uid() = user_id);

-- The app upserts to keep the best (fewest) step count, so an update policy is
-- required in addition to insert.
create policy "Users can update their own completions"
  on public.travel_path_completions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists travel_path_completions_user_idx
  on public.travel_path_completions (user_id);
