CREATE TABLE public.planner_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.timetable_entries(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  unique (entry_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_completions TO authenticated;
GRANT ALL ON public.planner_completions TO service_role;
ALTER TABLE public.planner_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own planner completions" ON public.planner_completions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);