ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS pomodoro_focus_minutes integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS pomodoro_short_break_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pomodoro_long_break_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS pomodoro_sessions_before_long integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS pomodoro_presets jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'chapter';

ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'timer';