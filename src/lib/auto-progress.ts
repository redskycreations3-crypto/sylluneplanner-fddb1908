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
  | { change: "in_progress"; status: "in_progress"; message: string }
  | { change: "completed"; status: "completed"; message: string };

/** Decides whether a chapter should move forward after a focus session was logged. */
export function evaluateChapterProgress(
  chapter: Chapter,
  totals: ChapterTotals,
  settings: AutoProgressSettings,
): AutoProgressOutcome {
  if (!settings.enabled || chapter.status === "completed") return { change: "none" };

  const target = settings.rule === "sessions" ? settings.sessions : settings.minutes;
  const value = settings.rule === "sessions" ? totals.sessions : totals.minutes;

  if (settings.rule !== "manual" && target > 0 && value >= target) {
    return {
      change: "completed",
      status: "completed",
      message:
        settings.rule === "sessions"
          ? `${chapter.name} marked complete — ${totals.sessions} focus sessions done.`
          : `${chapter.name} marked complete — ${totals.minutes}m studied.`,
    };
  }

  if (settings.startInProgress && chapter.status === "not_started") {
    return {
      change: "in_progress",
      status: "in_progress",
      message: `${chapter.name} moved to In progress.`,
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