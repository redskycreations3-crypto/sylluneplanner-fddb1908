import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/study/app-shell";
import { EmptyState, IconPicker, ProgressRing, SubjectIcon } from "@/components/study/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteSubject, useSaveSubject, useSessions, useSubjects } from "@/lib/data";
import {
  SUBJECT_COLORS,
  colorOf,
  formatDuration,
  sessionSeconds,
  sessionsOn,
  type Subject,
} from "@/lib/study";
import { cn } from "@/lib/utils";

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

type Draft = Partial<Subject> & { id?: string };

function SubjectsPage() {
  const { data: subjects = [] } = useSubjects();
  const { data: sessions = [] } = useSessions();
  const save = useSaveSubject();
  const remove = useDeleteSubject();
  const [draft, setDraft] = useState<Draft | null>(null);

  const today = new Date();

  return (
    <AppShell
      header={
        <header className="mb-5 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Subjects</h1>
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() =>
              setDraft({ name: "", icon: "book", color: "lavender", daily_goal_minutes: 60, weekly_goal_minutes: 300 })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </header>
      }
    >
      {subjects.length === 0 ? (
        <EmptyState title="No subjects yet" hint="Tap Add to create your first subject." />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {subjects.map((subject) => {
            const all = sessions.filter((s) => s.subject_id === subject.id);
            const total = sessionSeconds(all);
            const todayTotal = sessionSeconds(sessionsOn(all, today));
            const goal = (subject.daily_goal_minutes || 60) * 60;
            const percent = Math.min(100, Math.round((todayTotal / goal) * 100));
            return (
              <div key={subject.id} className="card-soft grid gap-3 p-4">
                <div className="flex items-center gap-2">
                  <SubjectIcon subject={subject} size="sm" />
                  <p className="min-w-0 truncate text-sm font-bold">{subject.name}</p>
                </div>
                <div className="flex justify-center">
                  <ProgressRing percent={percent} size={86} stroke={8} color={colorOf(subject).hex}>
                    <span className="num text-xs font-bold">{formatDuration(total)}</span>
                  </ProgressRing>
                </div>
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

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit subject" : "New subject"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Physics"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Icon</Label>
                <IconPicker value={draft.icon ?? "book"} onChange={(icon) => setDraft({ ...draft, icon })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SUBJECT_COLORS).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDraft({ ...draft, color: key })}
                      className={cn(
                        "h-8 w-8 rounded-full border-2",
                        draft.color === key ? "border-foreground" : "border-transparent",
                      )}
                      style={{ backgroundColor: value.hex }}
                      aria-label={key}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Daily goal (min)</Label>
                  <Input
                    type="number"
                    value={draft.daily_goal_minutes ?? 60}
                    onChange={(e) => setDraft({ ...draft, daily_goal_minutes: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Weekly goal (min)</Label>
                  <Input
                    type="number"
                    value={draft.weekly_goal_minutes ?? 300}
                    onChange={(e) => setDraft({ ...draft, weekly_goal_minutes: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            {draft?.id ? (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  remove.mutate(draft.id!);
                  setDraft(null);
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <Button
              onClick={() => {
                if (!draft) return;
                save.mutate({
                  id: draft.id,
                  name: draft.name?.trim() || "New subject",
                  icon: draft.icon,
                  color: draft.color,
                  daily_goal_minutes: draft.daily_goal_minutes,
                  weekly_goal_minutes: draft.weekly_goal_minutes,
                });
                setDraft(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}