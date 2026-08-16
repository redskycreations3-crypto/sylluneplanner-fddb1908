import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/study/app-shell";
import { EmptyState, SubjectIcon } from "@/components/study/primitives";
import {
  ManualSessionDialog,
  type ManualSessionTarget,
} from "@/components/study/manual-session-dialog";
import { ConfirmDialog } from "@/components/study/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChapters, useDeleteSession, useSessions, useSubjects } from "@/lib/data";
import { colorOf, dayKey, formatDuration, sessionSourceLabel, type StudySession } from "@/lib/study";
import { cn } from "@/lib/utils";

const SOURCES = [
  { key: "all", label: "All" },
  { key: "timer", label: "Timer" },
  { key: "pomodoro", label: "Pomodoro" },
  { key: "manual", label: "Manual" },
] as const;

type SourceKey = (typeof SOURCES)[number]["key"];

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({
    meta: [
      { title: "Study sessions log — StudyFlow" },
      { name: "description", content: "Review, edit and delete every logged study session with duration, subject and notes." },
      { property: "og:title", content: "Study sessions log — StudyFlow" },
      { property: "og:description", content: "Your full history of focus sessions." },
    ],
  }),
  component: SessionsPage,
});

function SessionsPage() {
  const { data: sessions = [] } = useSessions();
  const { data: subjects = [] } = useSubjects();
  const { data: chapters = [] } = useChapters();
  const deleteSession = useDeleteSession();
  const [manual, setManual] = useState<ManualSessionTarget>(null);
  const [source, setSource] = useState<SourceKey>("all");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<StudySession | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter((s) => (source === "all" ? true : sessionSourceLabel(s).toLowerCase() === source))
      .filter((s) => (subjectId ? s.subject_id === subjectId : true))
      .filter((s) => {
        if (!q) return true;
        const subject = subjects.find((sub) => sub.id === s.subject_id);
        const chapter = chapters.find((c) => c.id === s.chapter_id);
        const text = [
          subject?.name,
          chapter?.name,
          s.note,
          sessionSourceLabel(s),
          new Date(s.started_at).toLocaleDateString(),
        ]
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      })
      .slice()
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }, [sessions, source, subjectId, query, subjects, chapters]);

  const groups = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    for (const s of filteredRows) {
      const key = dayKey(new Date(s.started_at));
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()]
      .map(([key, list]) => ({
        key,
        date: new Date(key + "T00:00:00"),
        sessions: list.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
        totalSeconds: list.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredRows]);

  const selectedGroup = groups.find((g) => g.key === selectedDay);
  const totalSeconds = filteredRows.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);

  const renderSessionCard = (session: StudySession) => {
    const subject = subjects.find((s) => s.id === session.subject_id) ?? null;
    const chapter = chapters.find((c) => c.id === session.chapter_id) ?? null;
    const start = new Date(session.started_at);
    const end = new Date(session.ended_at);
    return (
      <div key={session.id} className="card-soft grid gap-2 p-4">
        <div className="flex items-center gap-3">
          <SubjectIcon subject={subject} size="sm" />
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-bold"
              style={subject ? { color: colorOf(subject).hex } : undefined}
            >
              {subject?.name ?? "General study"}
              {chapter ? ` · ${chapter.name}` : ""}
            </p>
            <p className="num text-[11px] text-muted-foreground">
              {start.toLocaleDateString()} · {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {" – "}
              {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {" · "}
              {sessionSourceLabel(session)}
            </p>
          </div>
          <span className="num text-sm font-bold">{formatDuration(session.duration_seconds)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Session actions"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuItem onClick={() => setManual(session)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setPendingDelete(session)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <button
          className="text-left text-xs text-muted-foreground"
          onClick={() => setManual(session)}
        >
          {session.note || "Add a description"}
        </button>
      </div>
    );
  };

  return (
    <AppShell title="Sessions">
      <div className="grid gap-3">
        <Button className="rounded-2xl" onClick={() => setManual("new")}>
          <Plus className="mr-1 h-4 w-4" /> Add study time
        </Button>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject, chapter, notes..."
            className="h-11 rounded-2xl border-none bg-muted pl-9 pr-9 text-sm"
            aria-label="Search sessions"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted-foreground/10"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {SOURCES.map((item) => (
            <button
              key={item.key}
              onClick={() => setSource(item.key)}
              className={cn(
                "min-h-9 rounded-2xl px-3 py-2 text-xs font-semibold",
                source === item.key ? "bg-primary-soft text-primary" : "bg-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {subjects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSubjectId(null)}
              className={cn(
                "min-h-9 rounded-2xl px-3 py-2 text-xs font-semibold",
                subjectId === null ? "bg-primary-soft text-primary" : "bg-muted",
              )}
            >
              All subjects
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubjectId((prev) => (prev === s.id ? null : s.id))}
                className={cn(
                  "min-h-9 rounded-2xl px-3 py-2 text-xs font-semibold",
                  subjectId === s.id ? "bg-primary-soft" : "bg-muted",
                )}
                style={subjectId === s.id ? { color: colorOf(s).hex } : undefined}
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : null}

        {selectedDay && selectedGroup ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDay(null)}
              className="flex items-center gap-1 rounded-2xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"
              aria-label="Back to date groups"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <span className="text-sm font-semibold">
              {selectedGroup.date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        ) : null}

        <p className="num text-xs text-muted-foreground">
          {selectedGroup
            ? `${selectedGroup.sessions.length} session${selectedGroup.sessions.length === 1 ? "" : "s"} · ${formatDuration(selectedGroup.totalSeconds)}`
            : `${filteredRows.length} sessions · ${formatDuration(totalSeconds)} total`}
        </p>

        {selectedGroup ? (
          selectedGroup.sessions.length === 0 ? (
            <EmptyState
              title="No sessions this day"
              hint="Try adjusting the filters or search terms."
            />
          ) : (
            selectedGroup.sessions.map(renderSessionCard)
          )
        ) : groups.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            hint="Finish a focus session, or add study time you did away from the app."
          />
        ) : (
          groups.map((group) => (
            <button
              key={group.key}
              onClick={() => setSelectedDay(group.key)}
              className="card-soft flex items-center gap-4 p-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                <span className="num text-xs font-bold">{group.date.getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {group.date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="num text-xs text-muted-foreground">
                  {group.sessions.length} session{group.sessions.length === 1 ? "" : "s"} · {formatDuration(group.totalSeconds)} total
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          ))
        )}
      </div>
      <ManualSessionDialog target={manual} onClose={() => setManual(null)} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this study session?"
        description={
          pendingDelete
            ? `This removes ${formatDuration(pendingDelete.duration_seconds)} from your totals, score and stats.`
            : ""
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (!target) return;
          await deleteSession.mutateAsync(target.id);
          toast.success("Session deleted");
        }}
      />
    </AppShell>
  );
}
