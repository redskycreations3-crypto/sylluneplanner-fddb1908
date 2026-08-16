import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/study/app-shell";
import { EmptyState, SubjectIcon } from "@/components/study/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChapters, useDeleteSession, useSaveSession, useSessions, useSubjects } from "@/lib/data";
import { formatDuration } from "@/lib/study";

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
  const saveSession = useSaveSession();
  const deleteSession = useDeleteSession();
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState("");

  return (
    <AppShell title="Sessions">
      <div className="grid gap-3">
        {sessions.length === 0 ? (
          <EmptyState title="No sessions yet" hint="Finish a focus session to see it here." />
        ) : (
          sessions.map((session) => {
            const subject = subjects.find((s) => s.id === session.subject_id) ?? null;
            const chapter = chapters.find((c) => c.id === session.chapter_id) ?? null;
            const start = new Date(session.started_at);
            const end = new Date(session.ended_at);
            return (
              <div key={session.id} className="card-soft grid gap-2 p-4">
                <div className="flex items-center gap-3">
                  <SubjectIcon subject={subject} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {subject?.name ?? "General study"}
                      {chapter ? ` · ${chapter.name}` : ""}
                    </p>
                    <p className="num text-[11px] text-muted-foreground">
                      {start.toLocaleDateString()} · {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="num text-sm font-bold">{formatDuration(session.duration_seconds)}</span>
                  <button
                    onClick={async () => {
                      await deleteSession.mutateAsync(session.id);
                      toast.success("Session deleted");
                    }}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-muted text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {editing === session.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Note"
                      className="rounded-2xl"
                    />
                    <Button
                      className="rounded-2xl"
                      onClick={async () => {
                        await saveSession.mutateAsync({ id: session.id, note: note.trim() || null });
                        setEditing(null);
                        toast.success("Saved");
                      }}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <button
                    className="text-left text-xs text-muted-foreground"
                    onClick={() => {
                      setEditing(session.id);
                      setNote(session.note ?? "");
                    }}
                  >
                    {session.note || "Add a note"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
