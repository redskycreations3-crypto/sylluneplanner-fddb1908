# StudyFlow — Student Study Tracker

A mobile-first study companion with syllabus tracking, a focus timer, timetable, goals, streaks and analytics. Data lives in a cloud account so it syncs across devices.

## Design

Soft lavender/purple accent on a near-white background, large rounded cards, gentle shadows, pastel per-subject accent colors, clean friendly type, light + dark + system themes. Optimized for one-handed Android use; scales gracefully to tablet/desktop.

## Navigation

Bottom bar: Home, Syllabus, Focus, Analytics, Planner. Subjects and Settings open from Home.

## Screens

**Auth** — email/password sign up + sign in, plus Google sign-in. New accounts are seeded with Physics, Chemistry, Mathematics, Computer Science, English, Assamese and a few starter chapters the user can edit or delete.

**Home** — avatar, date, notifications bell; cards for study days + streak, today's time vs daily goal with %, syllabus progress (chapters completed, % ring), a mascot motivation card whose message changes with progress, and a large START STUDY button with quick subject picker.

**Subjects** — grid of subject cards: icon, name, total time, today's time, goal progress ring, View Stats and Edit. Add/rename/delete, pick icon + accent color, set daily and weekly goals.

**Syllabus** — overall "24 / 79 chapters" header plus per-subject rows with counts and progress bars. Drill into a subject for its chapter list. Chapter fields: name, status (Not started / Studying / Completed), revision stage (Not revised → Revision 1/2/3 → Mastered), priority, target date, notes. Add, edit, delete, reorder, search, and filter by subject/status/priority. All counters recompute automatically.

**Focus** — big minimal timer with subject + chapter selection. Stopwatch or countdown (15/25/45/60/90/custom), start/pause/resume/stop/reset. Timer keeps running accurately across screens and survives reload (start timestamp is persisted). On finish: completion screen to confirm subject, chapter and a note, then the session saves.

**Sessions log** — list of saved sessions with date, start/end, duration, subject, chapter, type, note; editable and deletable. Session time rolls into daily/weekly/monthly, subject and chapter stats.

**Analytics** — Today / Week / Month / All Time tabs: total time, donut chart of subject breakdown, monthly activity calendar with intensity shading, time-of-day bars (morning/afternoon/evening/night), focus vs break split, and stats (total sessions, longest/average session, current + longest streak, chapters completed, total hours).

**Planner** — weekly timetable with Day and Week views. Entries have subject, chapter/topic, start/end time, note, color/icon; add, edit, delete, reorder, set recurring days and reminders.

**Settings** — profile, subjects, study goals (daily/weekly, overall and per subject), timer defaults + Pomodoro break length, minimum minutes that count as a study day, notification toggles, theme, and data management (export JSON, import, reset).

## Notifications

Optional in-app/browser reminders for upcoming timetable sessions, daily goal, revision deadlines and streaks, all individually toggleable and off until permission is granted.

## Technical notes

- Lovable Cloud (Postgres + auth). Tables: `profiles`, `subjects`, `chapters`, `study_sessions`, `timetable_entries`, `goals`, `settings`. Every table is user-scoped with RLS on `auth.uid()` and explicit grants; a trigger seeds starter subjects/chapters on signup.
- All app screens live under the authenticated layout; reads/writes go through server functions with TanStack Query, invalidated after each mutation so progress updates everywhere instantly.
- Streaks, percentages and aggregates are computed from sessions and chapter rows rather than stored counters, so they can never drift.
- Timer state is persisted (start time + mode) so navigation and refresh don't lose the session.
- Charts via Recharts; theming via semantic tokens in `src/styles.css`.
