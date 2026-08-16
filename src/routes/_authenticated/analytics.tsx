import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AppShell } from "@/components/study/app-shell";
import { EmptyState, SectionTitle } from "@/components/study/primitives";
import { useChapters, useProfile, useSessions, useSubjects } from "@/lib/data";
import {
  chapterProgress,
  colorOf,
  dayKey,
  formatDuration,
  secondsByDay,
  sessionSeconds,
  sessionsOn,
  sessionsSince,
  startOfWeek,
  streaks,
  timeBucket,
} from "@/lib/study";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Study analytics — StudyFlow" },
      { name: "description", content: "Charts for study time by subject, activity calendar, time-of-day habits and streak stats." },
      { property: "og:title", content: "Study analytics — StudyFlow" },
      { property: "og:description", content: "Visualise where your study hours actually go." },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = ["Today", "Week", "Month", "All"] as const;
type Range = (typeof RANGES)[number];

function AnalyticsPage() {
  const { data: sessions = [] } = useSessions();
  const { data: subjects = [] } = useSubjects();
  const { data: chapters = [] } = useChapters();
  const { data: profile } = useProfile();
  const [range, setRange] = useState<Range>("Week");

  const today = new Date();
  const scoped =
    range === "Today"
      ? sessionsOn(sessions, today)
      : range === "Week"
        ? sessionsSince(sessions, startOfWeek(today))
        : range === "Month"
          ? sessionsSince(sessions, new Date(today.getFullYear(), today.getMonth(), 1))
          : sessions;

  const total = sessionSeconds(scoped);

  const bySubject = subjects
    .map((subject) => ({
      name: subject.name,
      value: sessionSeconds(scoped.filter((s) => s.subject_id === subject.id)),
      color: colorOf(subject).hex,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const buckets = ["Morning", "Afternoon", "Evening", "Night"].map((label) => ({
    label,
    value: sessionSeconds(scoped.filter((s) => timeBucket(new Date(s.started_at)) === label)),
  }));
  const bucketMax = Math.max(1, ...buckets.map((b) => b.value));

  const focusSeconds = total;
  const breakSeconds = scoped.reduce((sum, s) => sum + (s.break_seconds ?? 0), 0);

  const byDay = secondsByDay(sessions);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const leading = (monthStart.getDay() + 6) % 7;
  const dayMax = Math.max(1, ...[...byDay.values()]);

  const { current, longest, totalDays } = streaks(sessions, profile?.streak_min_minutes ?? 20);
  const durations = scoped.map((s) => s.duration_seconds);
  const longestSession = durations.length ? Math.max(...durations) : 0;
  const avgSession = durations.length ? Math.round(total / durations.length) : 0;
  const syllabus = chapterProgress(chapters);

  return (
    <AppShell title="Analytics">
      <div className="grid gap-4">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "flex-1 rounded-2xl py-2 text-xs font-semibold transition-colors",
                range === r ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="card-soft p-5 text-center">
          <p className="text-xs text-muted-foreground">Total study time</p>
          <p className="num text-3xl font-bold">{formatDuration(total)}</p>
          <p className="text-[11px] text-muted-foreground">{scoped.length} sessions</p>
        </div>

        <section>
          <SectionTitle>Subject breakdown</SectionTitle>
          {bySubject.length === 0 ? (
            <EmptyState title="No study time yet" hint="Run a focus session to fill this in." />
          ) : (
            <div className="card-soft grid gap-3 p-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bySubject} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {bySubject.map((row) => (
                        <Cell key={row.name} fill={row.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatDuration(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2">
                {bySubject.map((row) => (
                  <div key={row.name} className="flex items-center gap-2 text-xs">
                    <span className="h-3 w-3 rounded-full" style={{ background: row.color }} />
                    <span className="flex-1 truncate font-medium">{row.name}</span>
                    <span className="num font-semibold">{formatDuration(row.value)}</span>
                    <span className="w-10 text-right text-muted-foreground">
                      {total ? Math.round((row.value / total) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                  <span
                    key={i}
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
                  </span>
                );
              })}
            </div>
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
              { label: "Focus vs break", value: `${formatDuration(focusSeconds)} / ${formatDuration(breakSeconds)}` },
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
