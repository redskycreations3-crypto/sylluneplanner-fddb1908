import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pause, Play, Plus, RotateCcw, SkipForward, Square } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/study/app-shell";
import { SubjectIcon } from "@/components/study/primitives";
import {
  ManualSessionDialog,
  type ManualSessionTarget,
} from "@/components/study/manual-session-dialog";
import { SessionHistory } from "@/components/study/session-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useChapters, useProfile, useSaveChapter, useSaveSession, useSessions, useSubjects } from "@/lib/data";
import {
  autoProgressSettings,
  chapterTotals,
  evaluateChapterProgress,
  progressLabel,
} from "@/lib/auto-progress";
import { useTimer } from "@/lib/timer";
import {
  BUILTIN_PRESETS,
  FOCUS_OPTIONS,
  LONG_BREAK_OPTIONS,
  ROUND_OPTIONS,
  SHORT_BREAK_OPTIONS,
  customPresets,
  phaseLabel,
  pomodoroFromProfile,
  profilePatchFromPomodoro,
  type PomodoroPreset,
} from "@/lib/pomodoro";
import { useSaveProfile } from "@/lib/data";
import { colorOf, formatClock, formatDuration } from "@/lib/study";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({
    meta: [
      { title: "Focus timer — StudyFlow" },
      { name: "description", content: "Run a stopwatch or countdown focus session and log it to a subject and chapter." },
      { property: "og:title", content: "Focus timer — StudyFlow" },
      { property: "og:description", content: "Deep work timer with subject, chapter and session notes." },
    ],
  }),
  component: FocusPage,
});

const PRESETS = [15, 25, 45, 60, 90];

function FocusPage() {
  const { data: subjects = [] } = useSubjects();
  const { data: chapters = [] } = useChapters();
  const { data: profile } = useProfile();
  const { data: sessions = [] } = useSessions();
  const timer = useTimer();
  const saveSession = useSaveSession();
  const saveChapter = useSaveChapter();
  const saveProfile = useSaveProfile();

  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [custom, setCustom] = useState("");
  const [newChapter, setNewChapter] = useState("");
  const [presetName, setPresetName] = useState("");
  const [completed, setCompleted] = useState<{ seconds: number } | null>(null);
  const [manual, setManual] = useState<ManualSessionTarget>(null);

  const { state, elapsed, remaining, isRunning, isActive, finished, focusSeconds } = timer;
  const subject = subjects.find((s) => s.id === state.subjectId) ?? null;
  const subjectChapters = chapters.filter((c) => c.subject_id === state.subjectId);
  const chapter = chapters.find((c) => c.id === state.chapterId) ?? null;
  const display = state.mode === "stopwatch" ? elapsed : remaining;
  const settings = autoProgressSettings(profile);
  const chapterProgress = chapter ? progressLabel(settings, chapterTotals(sessions, chapter.id)) : null;
  const pomodoro = state.pomodoro;
  const onBreak = state.mode === "pomodoro" && state.phase !== "focus";

  // Keep the timer's pomodoro config in sync with the saved profile settings.
  useEffect(() => {
    if (!profile || isActive) return;
    const fromProfile = pomodoroFromProfile(profile);
    const same =
      fromProfile.focusMinutes === state.pomodoro.focusMinutes &&
      fromProfile.shortBreakMinutes === state.pomodoro.shortBreakMinutes &&
      fromProfile.longBreakMinutes === state.pomodoro.longBreakMinutes &&
      fromProfile.sessionsBeforeLong === state.pomodoro.sessionsBeforeLong;
    if (!same) timer.configure({ pomodoro: fromProfile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isActive]);

  function setPomodoro(patch: Partial<typeof pomodoro>) {
    const next = { ...pomodoro, ...patch };
    timer.configure({ pomodoro: next });
    saveProfile.mutate(profilePatchFromPomodoro(next));
  }

  function applyPreset(preset: PomodoroPreset) {
    setPomodoro({
      focusMinutes: preset.focusMinutes,
      shortBreakMinutes: preset.shortBreakMinutes,
      longBreakMinutes: preset.longBreakMinutes,
      sessionsBeforeLong: preset.sessionsBeforeLong,
    });
    toast.success(`${preset.name} applied`);
  }

  function savePreset() {
    const name = presetName.trim();
    if (!name) return;
    const next = [
      ...customPresets(profile),
      { id: `p-${Date.now()}`, name, ...pomodoro },
    ];
    saveProfile.mutate(
      { pomodoro_presets: next as never },
      { onSuccess: () => toast.success(`Saved "${name}"`) },
    );
    setPresetName("");
  }

  function stop() {
    if (focusSeconds < 5) {
      timer.clear();
      toast("Session too short to save");
      return;
    }
    timer.pause();
    setConfirming(true);
  }

  async function saveAndClose() {
    const seconds = Math.floor(focusSeconds);
    const startedAt = state.startedAt ?? new Date(Date.now() - seconds * 1000).toISOString();
    await saveSession.mutateAsync({
      subject_id: state.subjectId,
      chapter_id: state.chapterId,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      duration_seconds: seconds,
      session_type: state.mode,
      source: "timer",
      note: note.trim() || null,
    });
    setNote("");
    setConfirming(false);
    timer.clear();
    setCompleted({ seconds });

    if (state.chapterId) {
      const target = chapters.find((c) => c.id === state.chapterId);
      if (target) {
        const before = chapterTotals(sessions, target.id);
        const totals = {
          minutes: before.minutes + Math.round(seconds / 60),
          sessions: before.sessions + 1,
        };
        const outcome = evaluateChapterProgress(target, totals, settings);
        if (outcome.change !== "none") {
          await saveChapter.mutateAsync({ id: target.id, status: outcome.status });
          toast(outcome.message);
        }
      }
    }
  }

  return (
    <AppShell title="Focus">
      <div className="grid gap-4">
        <div className="card-soft grid place-items-center gap-3 px-5 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {state.mode === "pomodoro" && isActive
              ? phaseLabel(state.phase)
              : isRunning
                ? "Focusing"
                : isActive
                  ? "Paused"
                  : "Ready"}
          </p>
          <p className="num text-5xl font-bold tabular-nums">{formatClock(display)}</p>
          {state.mode === "pomodoro" && isActive ? (
            <p className="text-xs font-semibold text-muted-foreground">
              Session {Math.min(state.round, pomodoro.sessionsBeforeLong)} / {pomodoro.sessionsBeforeLong}
              {onBreak ? " · break time isn't counted as study time" : ""}
            </p>
          ) : null}
          {subject ? (
            <div className="flex items-center gap-2">
              <SubjectIcon subject={subject} size="sm" />
              <span className="text-sm font-semibold" style={{ color: colorOf(subject).hex }}>
                {subject.name}
                {chapter ? ` · ${chapter.name}` : ""}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Pick a subject below</p>
          )}
          {finished ? <p className="text-xs font-semibold text-primary">Countdown complete 🎉</p> : null}
          {chapter && chapterProgress ? (
            <p className="text-[11px] text-muted-foreground">
              Auto-complete progress · {chapterProgress}
            </p>
          ) : null}

          <div className="mt-2 flex items-center gap-3">
            {!isActive ? (
              <Button
                size="lg"
                className="rounded-2xl px-8"
                onClick={() =>
                  timer.start({
                    subjectId: state.subjectId ?? subjects[0]?.id ?? null,
                    mode: state.mode,
                  })
                }
              >
                <Play className="mr-2 h-4 w-4" /> Start
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => (isRunning ? timer.pause() : timer.resume())}
                >
                  {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="lg" className="rounded-2xl px-6" onClick={stop}>
                  <Square className="mr-2 h-4 w-4" /> Finish
                </Button>
                {state.mode === "pomodoro" ? (
                  <Button size="lg" variant="ghost" className="rounded-2xl" onClick={timer.skipPhase} aria-label="Skip phase">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button size="lg" variant="ghost" className="rounded-2xl" onClick={timer.reset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {!isActive ? (
          <div className="card-soft grid gap-3 p-4">
            <Button
              variant="secondary"
              className="h-12 w-full rounded-2xl text-sm font-semibold"
              onClick={() => setManual("new")}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Study Time
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Studied away from the timer? Log it here — it counts towards today's total and score.
            </p>
            <div className="flex gap-2">
              {(["stopwatch", "countdown", "pomodoro"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => timer.configure({ mode })}
                  className={cn(
                    "flex-1 rounded-2xl py-2 text-xs font-semibold capitalize transition-colors",
                    state.mode === mode ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            {state.mode === "pomodoro" ? (
              <div className="grid gap-3">
                <p className="text-sm font-bold">Pomodoro settings</p>
                <div className="flex flex-wrap gap-2">
                  {[...BUILTIN_PRESETS, ...customPresets(profile)].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className="rounded-2xl bg-muted px-3 py-2 text-xs font-semibold"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <PomodoroRow
                  label="Focus (min)"
                  options={FOCUS_OPTIONS}
                  value={pomodoro.focusMinutes}
                  onChange={(focusMinutes) => setPomodoro({ focusMinutes })}
                />
                <PomodoroRow
                  label="Short break (min)"
                  options={SHORT_BREAK_OPTIONS}
                  value={pomodoro.shortBreakMinutes}
                  onChange={(shortBreakMinutes) => setPomodoro({ shortBreakMinutes })}
                />
                <PomodoroRow
                  label="Long break (min)"
                  options={LONG_BREAK_OPTIONS}
                  value={pomodoro.longBreakMinutes}
                  onChange={(longBreakMinutes) => setPomodoro({ longBreakMinutes })}
                />
                <PomodoroRow
                  label="Sessions before long break"
                  options={ROUND_OPTIONS}
                  value={pomodoro.sessionsBeforeLong}
                  onChange={(sessionsBeforeLong) => setPomodoro({ sessionsBeforeLong })}
                />
                <div className="flex gap-2">
                  <Input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Save as preset (e.g. Exam Preparation)"
                    className="rounded-2xl"
                  />
                  <Button variant="secondary" className="rounded-2xl" onClick={savePreset}>
                    Save
                  </Button>
                </div>
              </div>
            ) : null}
            {state.mode === "countdown" ? (
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((min) => (
                  <button
                    key={min}
                    onClick={() => timer.configure({ targetSeconds: min * 60 })}
                    className={cn(
                      "rounded-2xl px-3 py-2 text-xs font-semibold",
                      state.targetSeconds === min * 60 ? "bg-primary-soft text-primary" : "bg-muted",
                    )}
                  >
                    {min}m
                  </button>
                ))}
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => custom && timer.configure({ targetSeconds: Number(custom) * 60 })}
                  placeholder="Custom"
                  inputMode="numeric"
                  className="w-20 rounded-2xl bg-muted px-3 py-2 text-xs font-semibold outline-none"
                />
              </div>
            ) : null}
            {profile ? (
              <p className="text-[11px] text-muted-foreground">
                Break length {profile.break_minutes}m · default {profile.default_countdown_minutes}m
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="card-soft grid gap-3 p-4">
          <p className="text-sm font-bold">Subject</p>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => timer.configure({ subjectId: s.id, chapterId: null })}
                className={cn(
                  "flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold",
                  state.subjectId === s.id ? "bg-primary-soft text-primary" : "bg-muted",
                )}
              >
                <SubjectIcon subject={s} size="sm" />
                {s.name}
              </button>
            ))}
          </div>
          {state.subjectId && subjectChapters.length > 0 ? (
            <>
              <p className="text-sm font-bold">Chapter</p>
              <div className="flex flex-wrap gap-2">
                {subjectChapters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      timer.configure({ chapterId: state.chapterId === c.id ? null : c.id })
                    }
                    className={cn(
                      "rounded-2xl px-3 py-2 text-xs font-semibold",
                      state.chapterId === c.id ? "bg-primary-soft text-primary" : "bg-muted",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {state.subjectId && subjectChapters.length === 0 ? (
            <div className="flex gap-2">
              <Input
                value={newChapter}
                onChange={(e) => setNewChapter(e.target.value)}
                placeholder="New chapter name"
                className="rounded-2xl"
              />
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={async () => {
                  const name = newChapter.trim();
                  if (!name || !state.subjectId) return;
                  await saveChapter.mutateAsync({ subject_id: state.subjectId, name });
                  setNewChapter("");
                  toast.success("Chapter added");
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add chapter
              </Button>
            </div>
          ) : null}
        </div>

        {completed ? (
          <div className="card-soft grid gap-2 p-4 text-center">
            <p className="text-sm font-bold">Focus session complete!</p>
            <p className="num text-2xl font-bold">{formatDuration(completed.seconds)} studied</p>
            <p className="text-xs text-muted-foreground">
              {subject?.name ?? "General study"}
              {chapter ? ` · ${chapter.name}` : ""}
            </p>
            <Button className="mt-1 rounded-2xl" onClick={() => setCompleted(null)}>
              Done
            </Button>
          </div>
        ) : null}

        {confirming ? (
          <div className="card-soft grid gap-3 p-4">
            <p className="text-sm font-bold">Save this session? · {formatDuration(focusSeconds)}</p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you cover?"
              className="rounded-2xl"
            />
            <div className="flex gap-2">
              <Button className="flex-1 rounded-2xl" onClick={saveAndClose} disabled={saveSession.isPending}>
                Save session
              </Button>
              <Button
                variant="ghost"
                className="rounded-2xl"
                onClick={() => {
                  setConfirming(false);
                  timer.clear();
                }}
              >
                Discard
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-4">
        <SessionHistory />
      </div>
      <ManualSessionDialog target={manual} onClose={() => setManual(null)} />
    </AppShell>
  );
}

function PomodoroRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (value: number) => void;
}) {
  const isCustom = !options.includes(value);
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-2xl px-3 py-2 text-xs font-semibold",
              value === option ? "bg-primary-soft text-primary" : "bg-muted",
            )}
          >
            {option}
          </button>
        ))}
        <input
          inputMode="numeric"
          value={isCustom ? String(value) : ""}
          placeholder="Custom"
          onChange={(e) => {
            const next = Number(e.target.value.replace(/\D/g, ""));
            if (next > 0) onChange(next);
          }}
          className={cn(
            "w-20 rounded-2xl px-3 py-2 text-xs font-semibold outline-none",
            isCustom ? "bg-primary-soft text-primary" : "bg-muted",
          )}
        />
      </div>
    </div>
  );
}
