ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_progress_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_progress_rule text NOT NULL DEFAULT 'minutes',
  ADD COLUMN IF NOT EXISTS auto_complete_minutes integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS auto_complete_sessions integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS auto_start_in_progress boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_auto_progress_rule_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_auto_progress_rule_check
  CHECK (auto_progress_rule IN ('minutes', 'sessions', 'manual'));