-- Run this once in the Supabase dashboard → SQL Editor, AFTER the Worker API
-- is deployed (`npm run deploy`) — otherwise the live site can't save scores
-- in the gap.
--
-- Removes the browser's ability to insert into quiz_scores directly. Writes
-- now go through worker/index.ts, which validates payloads and uses the
-- secret key (secret-key requests bypass RLS, so no policy is needed for it).
-- The select policy stays: reads also go through the Worker now, but letting
-- users read their own rows is harmless and keeps a fallback.

drop policy if exists "Users can insert their own scores" on public.quiz_scores;
