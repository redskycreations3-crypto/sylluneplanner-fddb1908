delete from public.subjects;
create unique index if not exists subjects_user_name_uniq on public.subjects (user_id, lower(name));
create unique index if not exists chapters_subject_name_uniq on public.chapters (subject_id, lower(name));
update public.profiles set seeded = false;