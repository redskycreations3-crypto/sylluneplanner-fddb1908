import type { Database } from "@/integrations/supabase/types";
import { dayKey, sessionSeconds, sessionsOn, type StudySession } from "./study";

export type DailyGoal = Database["public"]["Tables"]["daily_goals"]["Row"];

export const DEFAULT_DAILY_GOAL_MINUTES = 240;

/** Score out of 100 = studied ÷ goal, never above 100. Break time is excluded upstream. */
export function scoreFor(seconds: number, goalMinutes: number) {
  const goal = Math.max(1, goalMinutes) * 60;
  return Math.min(100, Math.round((seconds / goal) * 100));
}

/** Historical days keep the goal that was active then; today falls back to the profile. */
export function goalForDay(history: DailyGoal[], key: string, fallback: number) {
  return history.find((row) => row.day === key)?.goal_minutes ?? fallback;
}

export type DayScore = { day: string; seconds: number; goalMinutes: number; score: number };

export function scoreForDate(
  sessions: StudySession[],
  history: DailyGoal[],
  date: Date,
  fallbackGoal: number,
): DayScore {
  const key = dayKey(date);
  const seconds = sessionSeconds(sessionsOn(sessions, date));
  const goalMinutes = goalForDay(history, key, fallbackGoal);
  return { day: key, seconds, goalMinutes, score: scoreFor(seconds, goalMinutes) };
}

/** Newest first, `days` entries ending today. */
export function scoreHistory(
  sessions: StudySession[],
  history: DailyGoal[],
  fallbackGoal: number,
  days: number,
): DayScore[] {
  const out: DayScore[] = [];
  const cursor = new Date();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() - i);
    out.push(scoreForDate(sessions, history, date, fallbackGoal));
  }
  return out;
}

export function averageScore(rows: DayScore[]) {
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length);
}

/** "6h 30m" style goal label from minutes. */
export function goalLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
