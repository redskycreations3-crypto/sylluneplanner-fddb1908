ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  goal_minutes integer not null default 240,
  created_at timestamp with time zone not null default now(),
  unique (user_id, day)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_goals TO authenticated;
GRANT ALL ON public.daily_goals TO service_role;

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own daily goals" ON public.daily_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);