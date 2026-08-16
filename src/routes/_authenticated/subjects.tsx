import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/study/app-shell";
import { ProgressRing, SubjectIcon } from "@/components/study/primitives";
import { ConfirmDialog } from "@/components/study/confirm-dialog";
import { SubjectDialog, type SubjectDraft } from "@/components/study/subject-dialog";
import { Button } from "@/components/ui/button";
import { useChapters, useDeleteSubject, useSaveSubject, useSessions, useSubjects } from "@/lib/data";
import {
  colorOf,
  formatDuration,
  nextSubjectColor,
  sessionSeconds,
  sessionsOn,
  type Subject,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects — StudyFlow" },
      { name: "description", content: "Manage your subjects, icons, colors and study goals." },
      { property: "og:title", content: "Subjects — StudyFlow" },
      { property: "og:description", content: "Manage subjects, colors and per-subject study goals." },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { data: subjects = [] } = useSubjects();
  const { data: sessions = [] } = useSessions();
  const { data: chapters = [] } = useChapters();
  const save = useSaveSubject();
  const remove = useDeleteSubject();
  const [draft, setDraft] = useState<SubjectDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);

  const today = new Date();
  const newDraft = (): SubjectDraft => ({
    name: "",
    icon: "book",
    color: nextSubjectColor(subjects),
    daily_goal_minutes: 60,
    weekly_goal_minutes: 300,
  });

  return (
    <AppShell
      header={
        <header className="mb-5 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Subjects</h1>
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() => setDraft(newDraft())}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Subject
          </Button>
        </header>
      }
    >
      {subjects.length === 0 ? (
        <div className="card-soft mt-6 grid place-items-center gap-3 px-6 py-10 text-center">
          <span className="text-4xl">📚</span>
          <p className="font-display text-lg font-bold">Your syllabus is empty.</p>
          <p className="text-sm text-muted-foreground">
            Add your first subject to start tracking your progress.
          </p>
          <Button className="mt-1 rounded-2xl" onClick={() => setDraft(newDraft())}>
            <Plus className="mr-1 h-4 w-4" /> Add Subject
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {subjects.map((subject) => {
            const all = sessions.filter((s) => s.subject_id === subject.id);
            const total = sessionSeconds(all);
            const todayTotal = sessionSeconds(sessionsOn(all, today));
            const goal = (subject.daily_goal_minutes || 60) * 60;
            const percent = Math.min(100, Math.round((todayTotal / goal) * 100));
            const subjectChapters = chapters.filter((c) => c.subject_id === subject.id);
            const done = subjectChapters.filter((c) => c.status === "completed").length;
            return (
              <div key={subject.id} className="card-soft grid gap-3 p-4">
                <div className="flex items-center gap-2">
                  <SubjectIcon subject={subject} size="sm" />
                  <p className="min-w-0 truncate text-sm font-bold">{subject.name}</p>
                  <button
                    className="ml-auto text-muted-foreground"
                    aria-label={`Delete ${subject.name}`}
                    onClick={() => setPendingDelete(subject)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-center">
                  <ProgressRing percent={percent} size={86} stroke={8} color={colorOf(subject).hex}>
                    <span className="num text-xs font-bold">{formatDuration(total)}</span>
                  </ProgressRing>
                </div>
                <p className="num text-center text-[11px] text-muted-foreground">
                  {done} / {subjectChapters.length} chapters
                </p>
                <p className="text-center text-[11px] text-muted-foreground">
                  Today {formatDuration(todayTotal)} / {formatDuration(goal)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/analytics"
                    className="rounded-xl bg-muted py-2 text-center text-[11px] font-semibold"
                  >
                    Stats
                  </Link>
                  <button
                    onClick={() => setDraft(subject)}
                    className="rounded-xl bg-primary-soft py-2 text-[11px] font-semibold text-primary"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubjectDialog
        draft={draft}
        onChange={setDraft}
        onClose={() => setDraft(null)}
        onSave={(next) => {
          save.mutate({
            ...(next.id ? { id: next.id } : {}),
            name: next.name?.trim() || "New subject",
            icon: next.icon ?? "book",
            color: next.color ?? nextSubjectColor(subjects, next.name),
            daily_goal_minutes: next.daily_goal_minutes ?? 60,
            weekly_goal_minutes: next.weekly_goal_minutes ?? 300,
          });
          setDraft(null);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.name ?? "subject"}?`}
        description="This will permanently delete the subject, all its chapters, and related syllabus progress."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </AppShell>
  );
}