import type { Profile } from "./study";
import { DEFAULT_POMODORO, type PomodoroConfig, type PomodoroPhase } from "./timer";

export type PomodoroPreset = { id: string; name: string } & PomodoroConfig;

export const BUILTIN_PRESETS: PomodoroPreset[] = [
  { id: "classic", name: "Classic Pomodoro", focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLong: 4 },
  { id: "deep", name: "Deep Work", focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 30, sessionsBeforeLong: 4 },
  { id: "long", name: "Long Study", focusMinutes: 90, shortBreakMinutes: 20, longBreakMinutes: 30, sessionsBeforeLong: 2 },
];

export const FOCUS_OPTIONS = [15, 25, 45, 50, 60, 90];
export const SHORT_BREAK_OPTIONS = [5, 10, 15];
export const LONG_BREAK_OPTIONS = [15, 20, 30];
export const ROUND_OPTIONS = [2, 3, 4, 5];

export function pomodoroFromProfile(profile?: Profile | null): PomodoroConfig {
  if (!profile) return DEFAULT_POMODORO;
  return {
    focusMinutes: profile.pomodoro_focus_minutes ?? DEFAULT_POMODORO.focusMinutes,
    shortBreakMinutes: profile.pomodoro_short_break_minutes ?? DEFAULT_POMODORO.shortBreakMinutes,
    longBreakMinutes: profile.pomodoro_long_break_minutes ?? DEFAULT_POMODORO.longBreakMinutes,
    sessionsBeforeLong: profile.pomodoro_sessions_before_long ?? DEFAULT_POMODORO.sessionsBeforeLong,
  };
}

export function profilePatchFromPomodoro(config: PomodoroConfig) {
  return {
    pomodoro_focus_minutes: config.focusMinutes,
    pomodoro_short_break_minutes: config.shortBreakMinutes,
    pomodoro_long_break_minutes: config.longBreakMinutes,
    pomodoro_sessions_before_long: config.sessionsBeforeLong,
  };
}

export function customPresets(profile?: Profile | null): PomodoroPreset[] {
  const raw = profile?.pomodoro_presets;
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter(
    (item): item is PomodoroPreset =>
      typeof item === "object" && item !== null && "id" in item && "focusMinutes" in item,
  );
}

export function phaseLabel(phase: PomodoroPhase) {
  return phase === "focus" ? "FOCUS" : phase === "short_break" ? "SHORT BREAK" : "LONG BREAK";
}
