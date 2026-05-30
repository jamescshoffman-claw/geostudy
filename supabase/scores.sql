-- Run this once in the Supabase dashboard → SQL Editor → New query → Run.
-- Creates the table that backs the High Scores page, with row-level security
-- so each user can only read and write their own rows.

create table if not exists public.quiz_scores (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  quiz_key        text not null,
  score           integer not null,
  total           integer not null,
  won             boolean not null default false,
  elapsed_seconds integer not null,
  created_at      timestamptz not null default now()
);

alter table public.quiz_scores enable row level security;

create policy "Users can read their own scores"
  on public.quiz_scores for select
  using (auth.uid() = user_id);

create policy "Users can insert their own scores"
  on public.quiz_scores for insert
  with check (auth.uid() = user_id);

create index if not exists quiz_scores_user_quiz_idx
  on public.quiz_scores (user_id, quiz_key);
