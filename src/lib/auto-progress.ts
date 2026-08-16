import type { Chapter, Profile, StudySession } from "./study";

export type AutoProgressRule = "minutes" | "sessions" | "manual";

export type AutoProgressSettings = {
  enabled: boolean;
  rule: AutoProgressRule;
  minutes: number;
  sessions: number;
  startInProgress: boolean;
};

export const DEFAULT_AUTO_PROGRESS: AutoProgressSettings = {
  enabled: true,
  rule: "minutes",
  minutes: 120,
  sessions: 3,
  startInProgress: true,
};

export function autoProgressSettings(profile: Profile | null | undefined): AutoProgressSettings {
  if (!profile) return DEFAULT_AUTO_PROGRESS;
  return {
    enabled: profile.auto_progress_enabled ?? true,
    rule: (profile.auto_progress_rule as AutoProgressRule) ?? "minutes",
    minutes: profile.auto_complete_minutes ?? 120,
    sessions: profile.auto_complete_sessions ?? 3,
    startInProgress: profile.auto_start_in_progress ?? true,
  };
}

export type ChapterTotals = { minutes: number; sessions: number };

export function chapterTotals(sessions: StudySession[], chapterId: string): ChapterTotals {
  const rows = sessions.filter((s) => s.chapter_id === chapterId);
  return {
    minutes: Math.round(rows.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / 60),
    sessions: rows.length,
  };
}

export type AutoProgressOutcome =
  | { change: "none" }
  | { change: "studying"; status: "studying"; message: string };

/**
 * Study time never completes a chapter — completion is the user's own progress
 * percentage. The only automatic move is "not started" → "studying".
 */
export function evaluateChapterProgress(
  chapter: Chapter,
  _totals: ChapterTotals,
  settings: AutoProgressSettings,
): AutoProgressOutcome {
  if (!settings.enabled || chapter.status === "completed") return { change: "none" };

  if (settings.startInProgress && chapter.status === "not_started") {
    return {
      change: "studying",
      status: "studying",
      message: `${chapter.name} moved to Studying.`,
    };
  }

  return { change: "none" };
}

export function progressLabel(settings: AutoProgressSettings, totals: ChapterTotals) {
  if (!settings.enabled || settings.rule === "manual") return null;
  return settings.rule === "sessions"
    ? `${Math.min(totals.sessions, settings.sessions)}/${settings.sessions} sessions`
    : `${Math.min(totals.minutes, settings.minutes)}/${settings.minutes} min`;
}