import type { Database } from "@/integrations/supabase/types";

export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type StudySession = Database["public"]["Tables"]["study_sessions"]["Row"];
export type TimetableEntry = Database["public"]["Tables"]["timetable_entries"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const CHAPTER_STATUSES = [
  { value: "not_started", label: "Not started", dot: "bg-rose-400" },
  { value: "studying", label: "Studying", dot: "bg-amber-400" },
  { value: "completed", label: "Completed", dot: "bg-emerald-400" },
] as const;

/** A chapter's own completion %, kept separate from how long it was studied. */
export function chapterPercent(chapter: Pick<Chapter, "status" | "progress">) {
  if (chapter.status === "completed") return 100;
  return Math.max(0, Math.min(100, chapter.progress ?? 0));
}

export function isRevised(chapter: Pick<Chapter, "revision">) {
  return (chapter.revision ?? "none") !== "none";
}

export function statusLabel(status: string) {
  return CHAPTER_STATUSES.find((s) => s.value === status)?.label ?? "Not started";
}

/**
 * Keeps status and progress consistent: 100% always means completed, and a
 * chapter that is not complete can never be marked as revised.
 */
export function normalizeChapter<T extends { status?: string; progress?: number; revision?: string }>(
  input: T,
): T {
  const next = { ...input };
  if (next.progress != null) next.progress = Math.max(0, Math.min(100, Math.round(next.progress)));
  if (next.progress === 100) next.status = "completed";
  if (next.status === "completed") next.progress = 100;
  else if (next.status === "not_started" && next.progress == null) next.progress = 0;
  if (next.status !== "completed") next.revision = "none";
  return next;
}

export const REVISION_STAGES = [
  { value: "none", label: "Not revised" },
  { value: "r1", label: "Revision 1" },
  { value: "r2", label: "Revision 2" },
  { value: "r3", label: "Revision 3" },
  { value: "mastered", label: "Mastered" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export const SUBJECT_COLORS = {
  lavender: { chip: "bg-[oklch(0.93_0.05_295)]", text: "text-[oklch(0.5_0.16_295)]", hex: "#a78bfa" },
  mint: { chip: "bg-[oklch(0.94_0.05_165)]", text: "text-[oklch(0.5_0.12_165)]", hex: "#5eead4" },
  peach: { chip: "bg-[oklch(0.94_0.05_50)]", text: "text-[oklch(0.55_0.14_50)]", hex: "#fdba74" },
  sky: { chip: "bg-[oklch(0.94_0.04_235)]", text: "text-[oklch(0.52_0.13_235)]", hex: "#7dd3fc" },
  rose: { chip: "bg-[oklch(0.94_0.04_10)]", text: "text-[oklch(0.55_0.15_10)]", hex: "#fda4af" },
  lemon: { chip: "bg-[oklch(0.95_0.06_100)]", text: "text-[oklch(0.52_0.12_100)]", hex: "#fde047" },
  lilac: { chip: "bg-[oklch(0.93_0.04_320)]", text: "text-[oklch(0.52_0.14_320)]", hex: "#f0abfc" },
  sage: { chip: "bg-[oklch(0.94_0.04_140)]", text: "text-[oklch(0.5_0.11_140)]", hex: "#86efac" },
} as const;

export type SubjectColor = keyof typeof SUBJECT_COLORS;

export function colorOf(subject?: { color: string } | null) {
  return SUBJECT_COLORS[(subject?.color ?? "lavender") as SubjectColor] ?? SUBJECT_COLORS.lavender;
}

export const SUBJECT_COLOR_ORDER = Object.keys(SUBJECT_COLORS) as SubjectColor[];

/** Common subjects get a sensible default hue; everything else takes the next free color. */
const NAME_COLOR_HINTS: Record<string, SubjectColor> = {
  physics: "lavender",
  chemistry: "sage",
  "inorganic chem": "sage",
  "organic chem": "mint",
  maths: "sky",
  math: "sky",
  mathematics: "sky",
  biology: "peach",
  botany: "mint",
  zoology: "peach",
  "computer science": "sky",
  computer: "sky",
  english: "rose",
  assamese: "lemon",
  hindi: "lilac",
};

/**
 * Picks a distinct color for a new subject so no two subjects share one until
 * the palette runs out. Stored on the subject, never derived per screen.
 */
export function nextSubjectColor(existing: { color: string }[], name?: string): SubjectColor {
  const used = new Set(existing.map((s) => s.color));
  const hint = name ? NAME_COLOR_HINTS[name.trim().toLowerCase()] : undefined;
  if (hint && !used.has(hint)) return hint;
  const free = SUBJECT_COLOR_ORDER.find((key) => !used.has(key));
  return free ?? SUBJECT_COLOR_ORDER[existing.length % SUBJECT_COLOR_ORDER.length]!;
}

/** "Timer" / "Pomodoro" / "Manual" badge for a stored session record. */
export function sessionSourceLabel(session: Pick<StudySession, "source" | "session_type">) {
  if (session.source === "manual" || session.session_type === "manual") return "Manual";
  if (session.session_type === "pomodoro") return "Pomodoro";
  return "Timer";
}

export const SUBJECT_ICONS = [
  "book",
  "atom",
  "flask",
  "sigma",
  "laptop",
  "languages",
  "globe",
  "palette",
  "music",
  "dumbbell",
  "leaf",
  "brain",
] as const;

export const DAYS = [
  { value: 1, label: "Mon", long: "Monday" },
  { value: 2, label: "Tue", long: "Tuesday" },
  { value: 3, label: "Wed", long: "Wednesday" },
  { value: 4, label: "Thu", long: "Thursday" },
  { value: 5, label: "Fri", long: "Friday" },
  { value: 6, label: "Sat", long: "Saturday" },
  { value: 0, label: "Sun", long: "Sunday" },
] as const;

/* ---------- formatting ---------- */

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0 && m === 0) return `${s}s`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function formatTime(value: string) {
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw ?? 0);
  const m = Number(mRaw ?? 0);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export function dayKey(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday first
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ---------- aggregation ---------- */

export function sessionSeconds(sessions: StudySession[]) {
  return sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
}

export function sessionsOn(sessions: StudySession[], date: Date) {
  const key = dayKey(date);
  return sessions.filter((s) => dayKey(new Date(s.started_at)) === key);
}

export function sessionsSince(sessions: StudySession[], from: Date) {
  return sessions.filter((s) => new Date(s.started_at) >= from);
}

export function secondsByDay(sessions: StudySession[]) {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.started_at));
    map.set(key, (map.get(key) ?? 0) + (s.duration_seconds ?? 0));
  }
  return map;
}

export function streaks(sessions: StudySession[], minMinutes: number) {
  const byDay = secondsByDay(sessions);
  const qualifying = new Set(
    [...byDay.entries()].filter(([, sec]) => sec >= minMinutes * 60).map(([k]) => k),
  );
  const totalDays = qualifying.size;

  let current = 0;
  const cursor = new Date();
  if (!qualifying.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (qualifying.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...qualifying].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const parts = key.split("-").map(Number);
    const d = new Date(parts[0]!, (parts[1] ?? 1) - 1, parts[2] ?? 1);
    if (prev && (d.getTime() - prev.getTime()) / 86400000 === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, totalDays };
}

export function chapterProgress(chapters: Chapter[]) {
  const total = chapters.length;
  const completed = chapters.filter((c) => c.status === "completed").length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
}

export function timeBucket(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Night";
}

export function motivationalMessage(percent: number, streak: number) {
  if (percent >= 100) return "Goal smashed. Rest well!";
  if (percent >= 60) return "Almost there — keep going!";
  if (percent > 0) return "Watching you focus...";
  if (streak > 0) return "One chapter at a time.";
  return "First session sets the tone.";
}
