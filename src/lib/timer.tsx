import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type TimerMode = "stopwatch" | "countdown" | "pomodoro";

export type PomodoroPhase = "focus" | "short_break" | "long_break";

export type PomodoroConfig = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLong: number;
};

export type TimerState = {
  mode: TimerMode;
  targetSeconds: number;
  accumulated: number;
  runningSince: number | null;
  subjectId: string | null;
  chapterId: string | null;
  startedAt: string | null;
  pomodoro: PomodoroConfig;
  phase: PomodoroPhase;
  round: number;
  /** Focus seconds already banked from completed pomodoro focus phases. */
  focusBank: number;
};

const STORAGE_KEY = "studyflow.timer.v1";

export const DEFAULT_POMODORO: PomodoroConfig = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLong: 4,
};

const initialState: TimerState = {
  mode: "stopwatch",
  targetSeconds: 25 * 60,
  accumulated: 0,
  runningSince: null,
  subjectId: null,
  chapterId: null,
  startedAt: null,
  pomodoro: DEFAULT_POMODORO,
  phase: "focus",
  round: 1,
  focusBank: 0,
};

function phaseSeconds(config: PomodoroConfig, phase: PomodoroPhase) {
  const minutes =
    phase === "focus"
      ? config.focusMinutes
      : phase === "short_break"
        ? config.shortBreakMinutes
        : config.longBreakMinutes;
  return Math.max(1, Math.round(minutes * 60));
}

type TimerContextValue = {
  state: TimerState;
  elapsed: number;
  remaining: number;
  isRunning: boolean;
  isActive: boolean;
  finished: boolean;
  /** Focus-only seconds — break time never counts as study time. */
  focusSeconds: number;
  configure: (patch: Partial<TimerState>) => void;
  start: (patch?: Partial<TimerState>) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  clear: () => void;
  skipPhase: () => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>(initialState);
  const [now, setNow] = useState(() => Date.now());
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as TimerState) });
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  // Backgrounded tabs and locked screens throttle timers; re-read the wall
  // clock the moment we're visible again so elapsed time stays accurate.
  useEffect(() => {
    const resync = () => setNow(Date.now());
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);
    window.addEventListener("pageshow", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
      window.removeEventListener("pageshow", resync);
    };
  }, []);

  const elapsed = useMemo(() => {
    const live = state.runningSince ? (now - state.runningSince) / 1000 : 0;
    return Math.floor(state.accumulated + live);
  }, [state, now]);

  const isTimed = state.mode === "countdown" || state.mode === "pomodoro";
  const remaining = isTimed ? Math.max(0, state.targetSeconds - elapsed) : 0;
  const finished = isTimed && state.startedAt !== null && remaining === 0;

  const focusSeconds =
    state.mode === "pomodoro"
      ? state.focusBank + (state.phase === "focus" ? elapsed : 0)
      : elapsed;

  const configure = useCallback((patch: Partial<TimerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const start = useCallback((patch?: Partial<TimerState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      return {
        ...next,
        accumulated: 0,
        runningSince: Date.now(),
        startedAt: new Date().toISOString(),
        ...(next.mode === "pomodoro"
          ? {
              phase: "focus" as PomodoroPhase,
              round: 1,
              focusBank: 0,
              targetSeconds: phaseSeconds(next.pomodoro, "focus"),
            }
          : {}),
      };
    });
  }, []);

  /** Moves to the next pomodoro phase, banking focus time as study time. */
  const advancePhase = useCallback((completedSeconds: number) => {
    setState((prev) => {
      if (prev.mode !== "pomodoro") return prev;
      const wasFocus = prev.phase === "focus";
      const nextPhase: PomodoroPhase = wasFocus
        ? prev.round % Math.max(1, prev.pomodoro.sessionsBeforeLong) === 0
          ? "long_break"
          : "short_break"
        : "focus";
      return {
        ...prev,
        phase: nextPhase,
        round: wasFocus ? prev.round : prev.round + 1,
        focusBank: wasFocus ? prev.focusBank + Math.max(0, completedSeconds) : prev.focusBank,
        targetSeconds: phaseSeconds(prev.pomodoro, nextPhase),
        accumulated: 0,
        runningSince: Date.now(),
      };
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) =>
      prev.runningSince
        ? {
            ...prev,
            accumulated: prev.accumulated + (Date.now() - prev.runningSince) / 1000,
            runningSince: null,
          }
        : prev,
    );
  }, []);

  const resume = useCallback(() => {
    setState((prev) => (prev.runningSince ? prev : { ...prev, runningSince: Date.now() }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({ ...prev, accumulated: 0, runningSince: null, startedAt: null }));
  }, []);

  const clear = useCallback(() => {
    setState((prev) => ({
      ...initialState,
      mode: prev.mode,
      targetSeconds: prev.targetSeconds,
      subjectId: prev.subjectId,
      chapterId: prev.chapterId,
    }));
  }, []);

  // Countdown finishes → pause. Pomodoro finishes a phase → roll into the next.
  useEffect(() => {
    if (!finished || !state.runningSince) return;
    if (state.mode === "pomodoro") advancePhase(state.targetSeconds);
    else pause();
  }, [finished, state.runningSince, state.mode, state.targetSeconds, pause, advancePhase]);

  const value: TimerContextValue = {
    state,
    elapsed,
    remaining,
    isRunning: state.runningSince !== null,
    isActive: state.startedAt !== null,
    finished,
    focusSeconds,
    configure,
    start,
    pause,
    resume,
    reset,
    clear,
    skipPhase: () => advancePhase(elapsed),
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside TimerProvider");
  return ctx;
}
