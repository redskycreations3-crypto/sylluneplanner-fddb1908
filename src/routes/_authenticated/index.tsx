import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Flame, Settings, Play } from "lucide-react";
import { AppShell } from "@/components/study/app-shell";
import { EmptyState, ProgressRing, SectionTitle, SubjectIcon } from "@/components/study/primitives";
import { useChapters, useProfile, useSessions, useSubjects } from "@/lib/data";
import { useTimer } from "@/lib/timer";
import {
  chapterProgress,
  colorOf,
  formatDuration,
  motivationalMessage,
  sessionSeconds,
  sessionsOn,
  sessionsSince,
  startOfWeek,
  streaks,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "StudyFlow — Today's study dashboard" },
      {
        name: "description",
        content: "See your streak, today's study time, syllabus progress and start a focus session.",
      },
      { property: "og:title", content: "StudyFlow — Today's study dashboard" },
      {
        property: "og:description",
        content: "Streaks, goals, syllabus progress and a focus timer for students.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: subjects = [] } = useSubjects();
  const { data: chapters = [] } = useChapters();
  const { data: sessions = [] } = useSessions();
  const timer = useTimer();

  const today = new Date();
  const todaySeconds = sessionSeconds(sessionsOn(sessions, today));
  const weekSeconds = sessionSeconds(sessionsSince(sessions, startOfWeek(today)));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthSeconds = sessionSeconds(sessionsSince(sessions, monthStart));

  const dailyGoal = (profile?.daily_goal_minutes ?? 240) * 60;
  const goalPercent = dailyGoal ? Math.min(100, Math.round((todaySeconds / dailyGoal) * 100)) : 0;
  const { current, totalDays } = streaks(sessions, profile?.streak_min_minutes ?? 20);
  const syllabus = chapterProgress(chapters);

  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function quickStart(subjectId: string) {
    timer.start({ subjectId, chapterId: null, mode: profile?.default_timer_mode === "countdown" ? "countdown" : "stopwatch" });
    navigate({ to: "/focus" });
  }

  return (
    <AppShell
      header={
        <header className="mb-5 flex items-center gap-3">
          <Link to="/settings" className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-2xl">
            {profile?.avatar_emoji ?? "🦊"}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold">
              Hi, {profile?.display_name ?? "Student"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{dateLabel}</p>
          </div>
          <Link to="/planner" className="grid h-10 w-10 place-items-center rounded-2xl bg-muted">
            <Bell className="h-4 w-4" />
          </Link>
          <Link to="/settings" className="grid h-10 w-10 place-items-center rounded-2xl bg-muted">
            <Settings className="h-4 w-4" />
          </Link>
        </header>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="card-soft p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-medium">Streak</span>
            </div>
            <p className="num mt-2 text-3xl font-bold">{current}</p>
            <p className="text-xs text-muted-foreground">{totalDays} study days total</p>
          </div>
          <div className="card-soft flex items-center gap-3 p-4">
            <ProgressRing percent={goalPercent} size={68} stroke={7}>
              <span className="num text-sm font-bold">{goalPercent}%</span>
            </ProgressRing>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Today</p>
              <p className="num truncate text-lg font-bold">{formatDuration(todaySeconds)}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                of {formatDuration(dailyGoal)}
              </p>
            </div>
          </div>
        </div>

        <div className="card-soft flex items-center gap-4 p-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-3xl">
            {goalPercent >= 100 ? "🎉" : goalPercent > 0 ? "🦊" : "😴"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">Study Buddy</p>
            <p className="text-xs text-muted-foreground">
              {motivationalMessage(goalPercent, current)}
            </p>
          </div>
        </div>

        <Link to="/syllabus" className="card-soft flex items-center gap-4 p-4">
          <ProgressRing percent={syllabus.percent} size={72} stroke={8}>
            <span className="num text-sm font-bold">{syllabus.percent}%</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-sm font-bold">Syllabus progress</p>
            <p className="num text-xs text-muted-foreground">
              {syllabus.completed} / {syllabus.total} chapters completed
            </p>
          </div>
        </Link>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today", value: todaySeconds },
            { label: "This week", value: weekSeconds },
            { label: "This month", value: monthSeconds },
          ].map((item) => (
            <div key={item.label} className="card-soft p-3 text-center">
              <p className="num text-base font-bold">{formatDuration(item.value)}</p>
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        <Link
          to="/focus"
          className="flex items-center justify-center gap-2 rounded-3xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg"
        >
          <Play className="h-5 w-5" /> START STUDY
        </Link>

        <section>
          <SectionTitle
            action={
              <Link to="/subjects" className="text-xs font-semibold text-primary">
                Manage
              </Link>
            }
          >
            Quick start
          </SectionTitle>
          {subjects.length === 0 ? (
            <EmptyState title="No subjects yet" hint="Add subjects to start tracking." />
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => quickStart(subject.id)}
                  className="card-soft flex shrink-0 items-center gap-2 px-3 py-2"
                >
                  <SubjectIcon subject={subject} size="sm" />
                  <span className="text-xs font-semibold" style={{ color: colorOf(subject).hex }}>
                    {subject.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}