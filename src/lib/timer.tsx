import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type TimerMode = "stopwatch" | "countdown";

export type TimerState = {
  mode: TimerMode;
  targetSeconds: number;
  accumulated: number;
  runningSince: number | null;
  subjectId: string | null;
  chapterId: string | null;
  startedAt: string | null;
};

const STORAGE_KEY = "studyflow.timer.v1";

const initialState: TimerState = {
  mode: "stopwatch",
  targetSeconds: 25 * 60,
  accumulated: 0,
  runningSince: null,
  subjectId: null,
  chapterId: null,
  startedAt: null,
};

type TimerContextValue = {
  state: TimerState;
  elapsed: number;
  remaining: number;
  isRunning: boolean;
  isActive: boolean;
  finished: boolean;
  configure: (patch: Partial<TimerState>) => void;
  start: (patch?: Partial<TimerState>) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  clear: () => void;
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

  const remaining = state.mode === "countdown" ? Math.max(0, state.targetSeconds - elapsed) : 0;
  const finished = state.mode === "countdown" && state.startedAt !== null && remaining === 0;

  const configure = useCallback((patch: Partial<TimerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const start = useCallback((patch?: Partial<TimerState>) => {
    setState((prev) => ({
      ...prev,
      ...patch,
      accumulated: 0,
      runningSince: Date.now(),
      startedAt: new Date().toISOString(),
    }));
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

  // auto-pause when a countdown completes
  useEffect(() => {
    if (finished && state.runningSince) pause();
  }, [finished, state.runningSince, pause]);

  const value: TimerContextValue = {
    state,
    elapsed,
    remaining,
    isRunning: state.runningSince !== null,
    isActive: state.startedAt !== null,
    finished,
    configure,
    start,
    pause,
    resume,
    reset,
    clear,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside TimerProvider");
  return ctx;
}
