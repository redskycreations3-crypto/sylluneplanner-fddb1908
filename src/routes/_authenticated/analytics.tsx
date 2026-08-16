import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Download, X } from "lucide-react";
import { AppShell } from "@/components/study/app-shell";
import { EmptyState, ProgressBar, SectionTitle } from "@/components/study/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChapters, useProfile, useSessions, useSubjects, useTimetable } from "@/lib/data";
import { downloadStudyReport } from "@/lib/report";
import { toast } from "sonner";
import {
  DAYS,
  chapterProgress,
  colorOf,
  dayKey,
  formatDuration,
  secondsByDay,
  sessionSeconds,
  sessionSourceLabel,
  startOfWeek,
  streaks,
  timeBucket,
  type StudySession,
} from "@/lib/study";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Study analytics — StudyFlow" },
      {
        name: "description",
        content:
          "Filter study time by date range, subject and day of week, drill into charts and export a PDF report.",
      },
      { property: "og:title", content: "Study analytics — StudyFlow" },
      { property: "og:description", content: "Visualise where your study hours actually go." },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = ["Today", "Week", "Month", "All", "Custom"] as const;
type Range = (typeof RANGES)[number];

function rangeBounds(range: Range, from: string, to: string) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  switch (range) {
    case "Today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "Week":
      return { start: startOfWeek(now), end: endOfDay(now) };
    case "Month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case "Custom":
      return {
        start: from ? startOfDay(new Date(from)) : new Date(0),
        end: to ? endOfDay(new Date(to)) : endOfDay(now),
      };
    default:
      return { start: new Date(0), end: endOfDay(now) };
  }
}

function AnalyticsPage() {
  const { data: sessions = [] } = useSessions();
  const { data: subjects = [] } = useSubjects();
  const { data: chapters = [] } = useChapters();
  const { data: timetable = [] } = useTimetable();
  const { data: profile } = useProfile();

  const [range, setRange] = useState<Range>("Week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [weekday, setWeekday] = useState<number | null>(null);

  const today = new Date();
  const { start, end } = rangeBounds(range, from, to);

  const inRange = useMemo(
    () =>
      sessions.filter((s) => {
        const d = new Date(s.started_at);
        return d >= start && d <= end;
      }),
    [sessions, start, end],
  );

  const scoped = useMemo(
    () =>
      inRange.filter(
        (s) =>
          (!subjectId || s.subject_id === subjectId) &&
          (weekday === null || new Date(s.started_at).getDay() === weekday),
      ),
    [inRange, subjectId, weekday],
  );

  const total = sessionSeconds(scoped);
  const activeSubject = subjects.find((s) => s.id === subjectId) ?? null;

  const bySubject = subjects
    .map((subject) => ({
      id: subject.id,
      name: subject.name,
      value: sessionSeconds(
        inRange.filter(
          (s) =>
            s.subject_id === subject.id &&
            (weekday === null || new Date(s.started_at).getDay() === weekday),
        ),
      ),
      color: colorOf(subject).hex,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  // Where the time came from: timer, pomodoro or manually logged.
  const bySource = (["Timer", "Pomodoro", "Manual"] as const).map((label) => ({
    label,
    value: sessionSeconds(scoped.filter((s) => sessionSourceLabel(s) === label)),
  }));

  const byWeekday = DAYS.map((day) => ({
    day: day.value,
    label: day.label,
    value: sessionSeconds(
      inRange.filter(
        (s) =>
          new Date(s.started_at).getDay() === day.value &&
          (!subjectId || s.subject_id === subjectId),
      ),
    ),
  }));

  const buckets = ["Morning", "Afternoon", "Evening", "Night"].map((label) => ({
    label,
    value: sessionSeconds(scoped.filter((s) => timeBucket(new Date(s.started_at)) === label)),
  }));
  const bucketMax = Math.max(1, ...buckets.map((b) => b.value));

  const scopedForCalendar: StudySession[] = subjectId
    ? sessions.filter((s) => s.subject_id === subjectId)
    : sessions;
  const byDay = secondsByDay(scopedForCalendar);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const leading = (monthStart.getDay() + 6) % 7;
  const dayMax = Math.max(1, ...[...byDay.values()]);

  const { current, longest, totalDays } = streaks(sessions, profile?.streak_min_minutes ?? 20);
  const durations = scoped.map((s) => s.duration_seconds);
  const longestSession = durations.length ? Math.max(...durations) : 0;
  const avgSession = durations.length ? Math.round(total / durations.length) : 0;
  const scopedChapters = subjectId ? chapters.filter((c) => c.subject_id === subjectId) : chapters;
  const syllabus = chapterProgress(scopedChapters);
  const breakSeconds = scoped.reduce((sum, s) => sum + (s.break_seconds ?? 0), 0);

  const filtersActive = subjectId !== null || weekday !== null;

  return (
    <AppShell
      header={
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={async () => {
              try {
                const result = await downloadStudyReport({
                  profile: profile ?? null,
                  subjects,
                  chapters,
                  sessions,
                  timetable,
                });
                toast.success(
                  result.method === "shared"
                    ? "Choose where to save your tracker PDF"
                    : "Tracker record PDF saved",
                );
              } catch {
                toast.error("Could not save the PDF on this device");
              }
            }}
          >
            <Download className="mr-1 h-4 w-4" /> PDF
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-5 gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-2xl py-2 text-[11px] font-semibold transition-colors",
                range === r ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {r}
            </button>
          ))}
        </div>

        {range === "Custom" ? (
          <div className="card-soft grid grid-cols-2 gap-3 p-3">
            <label className="grid gap-1 text-[11px] text-muted-foreground">
              From
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="grid gap-1 text-[11px] text-muted-foreground">
              To
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        ) : null}

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => setSubjectId(null)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
              subjectId === null ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            All subjects
          </button>
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => setSubjectId(subject.id === subjectId ? null : subject.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                subjectId === subject.id ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {subject.name}
            </button>
          ))}
        </div>

        {filtersActive ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Drill-down:</span>
            {activeSubject ? (
              <button
                onClick={() => setSubjectId(null)}
                className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary"
              >
                {activeSubject.name} <X className="h-3 w-3" />
              </button>
            ) : null}
            {weekday !== null ? (
              <button
                onClick={() => setWeekday(null)}
                className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary"
              >
                {DAYS.find((d) => d.value === weekday)?.long} <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="card-soft p-5 text-center">
          <p className="text-xs text-muted-foreground">
            Total study time{activeSubject ? ` · ${activeSubject.name}` : ""}
          </p>
          <p className="num text-3xl font-bold">{formatDuration(total)}</p>
          <p className="text-[11px] text-muted-foreground">{scoped.length} sessions</p>
        </div>

        <section>
          <SectionTitle>By source</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            {bySource.map((row) => (
              <div key={row.label} className="card-soft min-w-0 p-3 text-center">
                <p className="num truncate text-base font-bold">{formatDuration(row.value)}</p>
                <p className="text-[11px] text-muted-foreground">{row.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Subject breakdown</SectionTitle>
          {bySubject.length === 0 ? (
            <EmptyState title="No study time yet" hint="Run a focus session to fill this in." />
          ) : (
            <div className="card-soft grid gap-3 p-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bySubject}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      onClick={(entry: { id?: string }) =>
                        setSubjectId((prev) => (prev === entry.id ? null : (entry.id ?? null)))
                      }
                    >
                      {bySubject.map((row) => (
                        <Cell
                          key={row.id}
                          fill={row.color}
                          stroke="none"
                          opacity={subjectId && subjectId !== row.id ? 0.35 : 1}
                          className="cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatDuration(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2">
                {bySubject.map((row) => {
                  const rangeTotal = bySubject.reduce((sum, r) => sum + r.value, 0);
                  return (
                    <button
                      key={row.id}
                      onClick={() => setSubjectId((prev) => (prev === row.id ? null : row.id))}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-2 py-1 text-left text-xs transition-colors",
                        subjectId === row.id ? "bg-primary-soft" : "hover:bg-muted",
                      )}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ background: row.color }} />
                      <span className="flex-1 truncate font-medium">{row.name}</span>
                      <span className="num font-semibold">{formatDuration(row.value)}</span>
                      <span className="w-10 text-right text-muted-foreground">
                        {rangeTotal ? Math.round((row.value / rangeTotal) * 100) : 0}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section>
          <SectionTitle>By day of week</SectionTitle>
          <div className="card-soft p-4">
          <div className="card-soft p-4">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byWeekday} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    formatter={(value: number) => formatDuration(value)}
                  />
                  <Bar
                    dataKey="value"
                    radius={[8, 8, 8, 8]}
                    onClick={(entry: { day?: number }) =>
                      setWeekday((prev) => (prev === entry.day ? null : (entry.day ?? null)))
                    }
                  >
                    {byWeekday.map((row) => (
                      <Cell
                        key={row.day}
                        fill="var(--color-primary)"
                        opacity={weekday === null || weekday === row.day ? 1 : 0.3}
                        className="cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-center text-[11px] text-muted-foreground">
              Tap a bar to drill into that day
            </p>
          </div>
        </section>

        <section>
          <SectionTitle>Chapter progress</SectionTitle>
          <div className="card-soft grid gap-3 p-4">
            {(subjectId ? subjects.filter((s) => s.id === subjectId) : subjects).map((subject) => {
              const progress = chapterProgress(chapters.filter((c) => c.subject_id === subject.id));
              return (
                <div key={subject.id} className="grid gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate font-medium">{subject.name}</span>
                    <span className="num text-muted-foreground">
                      {progress.completed}/{progress.total} · {progress.percent}%
                    </span>
                  </div>
                  <ProgressBar percent={progress.percent} color={colorOf(subject).hex} />
                </div>
              );
            })}
            {subjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add a subject to track chapters.</p>
            ) : null}
          </div>
        </section>

        <section>
          <SectionTitle>Activity this month</SectionTitle>
          <div className="card-soft p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: leading }).map((_, i) => (
                <span key={`pad-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
                const secs = byDay.get(dayKey(date)) ?? 0;
                const intensity = secs === 0 ? 0 : Math.min(1, 0.25 + (secs / dayMax) * 0.75);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setRange("Custom");
                      setFrom(dayKey(date));
                      setTo(dayKey(date));
                      setWeekday(null);
                    }}
                    title={`${date.toLocaleDateString()} · ${formatDuration(secs)}`}
                    className="grid aspect-square place-items-center rounded-lg text-[10px] font-medium"
                    style={{
                      background:
                        intensity === 0
                          ? "var(--color-muted)"
                          : `color-mix(in oklab, var(--color-primary) ${Math.round(intensity * 100)}%, var(--color-card))`,
                      color: intensity > 0.6 ? "white" : undefined,
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Tap a day to filter everything to that date
            </p>
          </div>
        </section>

        <section>
          <SectionTitle>Time of day</SectionTitle>
          <div className="card-soft grid gap-3 p-4">
            {buckets.map((bucket) => (
              <div key={bucket.label} className="grid gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{bucket.label}</span>
                  <span className="num text-muted-foreground">{formatDuration(bucket.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(bucket.value / bucketMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle
            action={
              <Link to="/sessions" className="text-xs font-semibold text-primary">
                Session log
              </Link>
            }
          >
            Stats
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Sessions", value: String(scoped.length) },
              { label: "Longest session", value: formatDuration(longestSession) },
              { label: "Average session", value: formatDuration(avgSession) },
              {
                label: "Focus vs break",
                value: `${formatDuration(total)} / ${formatDuration(breakSeconds)}`,
              },
              { label: "Current streak", value: `${current} days` },
              { label: "Longest streak", value: `${longest} days` },
              { label: "Study days", value: String(totalDays) },
              { label: "Chapters done", value: `${syllabus.completed}/${syllabus.total}` },
            ].map((stat) => (
              <div key={stat.label} className="card-soft p-3">
                <p className="num text-base font-bold">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
