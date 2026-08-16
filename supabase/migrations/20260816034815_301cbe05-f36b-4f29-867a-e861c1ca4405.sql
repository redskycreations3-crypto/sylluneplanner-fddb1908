ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS chapters_subject_id_fkey;
ALTER TABLE public.chapters ADD CONSTRAINT chapters_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.study_sessions DROP CONSTRAINT IF EXISTS study_sessions_subject_id_fkey;
ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;

ALTER TABLE public.study_sessions DROP CONSTRAINT IF EXISTS study_sessions_chapter_id_fkey;
ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE SET NULL;

ALTER TABLE public.timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_subject_id_fkey;
ALTER TABLE public.timetable_entries ADD CONSTRAINT timetable_entries_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS public.subjects_user_id_name_key;
DROP INDEX IF EXISTS public.chapters_subject_id_name_key;