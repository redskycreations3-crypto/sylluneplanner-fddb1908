import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/study/app-shell";
import { SubjectIcon } from "@/components/study/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChapters, useProfile, useSaveChapter, useSaveSession, useSessions, useSubjects } from "@/lib/data";
import {
  autoProgressSettings,
  chapterTotals,
  evaluateChapterProgress,
  progressLabel,
} from "@/lib/auto-progress";
import { useTimer } from "@/lib/timer";
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

  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [custom, setCustom] = useState("");

  const { state, elapsed, remaining, isRunning, isActive, finished } = timer;
  const subject = subjects.find((s) => s.id === state.subjectId) ?? null;
  const subjectChapters = chapters.filter((c) => c.subject_id === state.subjectId);
  const chapter = chapters.find((c) => c.id === state.chapterId) ?? null;
  const display = state.mode === "countdown" ? remaining : elapsed;
  const settings = autoProgressSettings(profile);
  const chapterProgress = chapter ? progressLabel(settings, chapterTotals(sessions, chapter.id)) : null;

  function stop() {
    if (elapsed < 5) {
      timer.clear();
      toast("Session too short to save");
      return;
    }
    timer.pause();
    setConfirming(true);
  }

  async function saveAndClose() {
    const seconds = Math.floor(elapsed);
    const startedAt = state.startedAt ?? new Date(Date.now() - seconds * 1000).toISOString();
    await saveSession.mutateAsync({
      subject_id: state.subjectId,
      chapter_id: state.chapterId,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      duration_seconds: seconds,
      session_type: state.mode === "countdown" ? "focus" : "stopwatch",
      note: note.trim() || null,
    });
    setNote("");
    setConfirming(false);
    timer.clear();
    toast.success(`Saved ${formatDuration(seconds)}`);

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
          if (outcome.change === "completed") toast.success(outcome.message);
          else toast(outcome.message);
        }
      }
    }
  }

  return (
    <AppShell title="Focus">
      <div className="grid gap-4">
        <div className="card-soft grid place-items-center gap-3 px-5 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {isRunning ? "Focusing" : isActive ? "Paused" : "Ready"}
          </p>
          <p className="num text-5xl font-bold tabular-nums">{formatClock(display)}</p>
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
                <Button size="lg" variant="ghost" className="rounded-2xl" onClick={timer.reset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {!isActive ? (
          <div className="card-soft grid gap-3 p-4">
            <div className="flex gap-2">
              {(["stopwatch", "countdown"] as const).map((mode) => (
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
          {subjectChapters.length > 0 ? (
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
        </div>

        {confirming ? (
          <div className="card-soft grid gap-3 p-4">
            <p className="text-sm font-bold">Save session · {formatDuration(elapsed)}</p>
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
    </AppShell>
  );
}
