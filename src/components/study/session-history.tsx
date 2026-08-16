import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/study/confirm-dialog";
import { EmptyState, SubjectIcon } from "@/components/study/primitives";
import {
  ManualSessionDialog,
  type ManualSessionTarget,
} from "@/components/study/manual-session-dialog";
import { useChapters, useDeleteSession, useSessions, useSubjects } from "@/lib/data";
import {
  colorOf,
  dayKey,
  formatDuration,
  sessionSourceLabel,
  type StudySession,
} from "@/lib/study";

/**
 * Every recorded session — timer, pomodoro or manual — as an individual row the
 * user can edit or delete. All totals are derived from these records.
 */
export function SessionHistory({
  title = "Today's sessions",
  todayOnly = true,
  limit,
  emptyHint = "Finish a focus session or add study time and it will show up here.",
}: {
  title?: string;
  todayOnly?: boolean;
  limit?: number;
  emptyHint?: string;
}) {
  const { data: sessions = [] } = useSessions();
  const { data: subjects = [] } = useSubjects();
  const { data: chapters = [] } = useChapters();
  const deleteSession = useDeleteSession();
  const [manual, setManual] = useState<ManualSessionTarget>(null);
  const [pendingDelete, setPendingDelete] = useState<StudySession | null>(null);

  const key = dayKey(new Date());
  let rows = todayOnly ? sessions.filter((s) => dayKey(new Date(s.started_at)) === key) : sessions;
  if (limit) rows = rows.slice(0, limit);

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {rows.length > 0 ? (
          <span className="num text-xs text-muted-foreground">
            {formatDuration(rows.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0))} total
          </span>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No sessions yet" hint={emptyHint} />
      ) : (
        rows.map((session) => {
          const subject = subjects.find((s) => s.id === session.subject_id) ?? null;
          const chapter = chapters.find((c) => c.id === session.chapter_id) ?? null;
          const kind = sessionSourceLabel(session);
          const started = new Date(session.started_at);
          return (
            <div key={session.id} className="card-soft flex items-center gap-3 p-4">
              <SubjectIcon subject={subject} size="sm" />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-bold"
                  style={subject ? { color: colorOf(subject).hex } : undefined}
                >
                  {subject?.name ?? "General study"}
                </p>
                {chapter ? (
                  <p className="truncate text-xs text-muted-foreground">{chapter.name}</p>
                ) : null}
                <p className="num text-[11px] text-muted-foreground">
                  {formatDuration(session.duration_seconds)} • {kind} ·{" "}
                  {started.toLocaleDateString([], { day: "numeric", month: "short" })},{" "}
                  {started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Session actions"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground"
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
                    <Trash2 className="mr-2 h-4 w-4" /> Delete session
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })
      )}

      <ManualSessionDialog target={manual} onClose={() => setManual(null)} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this study session?"
        description={
          pendingDelete
            ? `This will remove ${formatDuration(pendingDelete.duration_seconds)} from your study time, score and stats.`
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
    </section>
  );
}