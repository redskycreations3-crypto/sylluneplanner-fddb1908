drop index if exists public.subjects_user_name_uniq;
drop index if exists public.chapters_subject_name_uniq;
create unique index if not exists subjects_user_name_uniq on public.subjects (user_id, name);
create unique index if not exists chapters_subject_name_uniq on public.chapters (subject_id, name);