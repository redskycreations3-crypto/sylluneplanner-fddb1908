import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/study/app-shell";
import { ProgressBar, SubjectIcon } from "@/components/study/primitives";
import { ChapterRow } from "@/components/study/chapter-row";
import { ConfirmDialog } from "@/components/study/confirm-dialog";
import { SubjectDialog, type SubjectDraft } from "@/components/study/subject-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  useChapters,
  useDeleteChapter,
  useDeleteSubject,
  useReorderChapters,
  useSaveChapter,
  useSaveSubject,
  useSubjects,
} from "@/lib/data";
import {
  CHAPTER_STATUSES,
  PRIORITIES,
  REVISION_STAGES,
  chapterProgress,
  colorOf,
  nextSubjectColor,
  type Chapter,
  type Subject,
} from "@/lib/study";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/syllabus")({
  head: () => ({
    meta: [
      { title: "Syllabus tracker — StudyFlow" },
      {
        name: "description",
        content: "Track every chapter: status, revision stage, priority, target date and notes.",
      },
      { property: "og:title", content: "Syllabus tracker — StudyFlow" },
      {
        property: "og:description",
        content: "Chapter-by-chapter syllabus progress with revision stages and priorities.",
      },
    ],
  }),
  component: SyllabusPage,
});

type Draft = Partial<Chapter> & { id?: string; subject_id?: string };

function SyllabusPage() {
  const { data: subjects = [] } = useSubjects();
  const { data: chapters = [] } = useChapters();
  const save = useSaveChapter();
  const remove = useDeleteChapter();
  const reorder = useReorderChapters();
  const saveSubject = useSaveSubject();
  const removeSubject = useDeleteSubject();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const newSubjectDraft = (): SubjectDraft => ({
    name: "",
    icon: "book",
    color: nextSubjectColor(subjects),
    daily_goal_minutes: 60,
    weekly_goal_minutes: 300,
  });

  const overall = chapterProgress(chapters);

  const filtered = useMemo(
    () =>
      chapters.filter(
        (c) =>
          (status === "all" || c.status === status) &&
          c.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [chapters, status, query],
  );

  function move(list: Chapter[], index: number, delta: number) {
    const next = [...list];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    reorder.mutate(next.map((c, i) => ({ id: c.id, position: i })));
  }

  return (
    <AppShell
      header={
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Syllabus</h1>
            <p className="num text-xs text-muted-foreground">
              {overall.completed} / {overall.total} chapters · {overall.percent}%
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() =>
              subjects.length === 0
                ? setSubjectDraft(newSubjectDraft())
                : setDraft({
                    subject_id: subjects[0]?.id ?? "",
                    status: "not_started",
                    priority: "medium",
                  })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> {subjects.length === 0 ? "Add Subject" : "Chapter"}
          </Button>
        </header>
      }
    >
      <div className="mb-4 grid gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chapters"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ value: "all", label: "All" }, ...CHAPTER_STATUSES].map((option) => (
            <button
              key={option.value}
              onClick={() => setStatus(option.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                status === option.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="card-soft mt-6 grid place-items-center gap-3 px-6 py-10 text-center">
          <span className="text-4xl">🗂️</span>
          <p className="font-display text-lg font-bold">No syllabus added yet</p>
          <p className="text-sm text-muted-foreground">
            Add your subjects and chapters to get started.
          </p>
          <Button className="mt-1 rounded-2xl" onClick={() => setSubjectDraft(newSubjectDraft())}>
            <Plus className="mr-1 h-4 w-4" /> Add Subject
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {subjects.map((subject) => {
            const list = filtered
              .filter((c) => c.subject_id === subject.id)
              .sort((a, b) => a.position - b.position);
            const stats = chapterProgress(chapters.filter((c) => c.subject_id === subject.id));
            const expanded = open === subject.id;
            return (
              <div key={subject.id} className="card-soft overflow-hidden">
                <div className="flex w-full items-center gap-3 p-4 text-left">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => setOpen(expanded ? null : subject.id)}
                  >
                  <SubjectIcon subject={subject} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{subject.name}</p>
                    <p className="num text-[11px] text-muted-foreground">
                      {stats.completed} / {stats.total} chapters · {stats.percent}%
                    </p>
                    <div className="mt-2">
                      <ProgressBar percent={stats.percent} color={colorOf(subject).hex} />
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    className="shrink-0 text-muted-foreground"
                    aria-label={`Delete ${subject.name}`}
                    onClick={() => setSubjectToDelete(subject)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {expanded ? (
                  <div className="grid gap-2 border-t border-border px-4 py-3">
                    {list.length === 0 ? (
                      <div className="grid place-items-center gap-1 py-3 text-center">
                        <span className="text-2xl">📝</span>
                        <p className="text-xs font-semibold">No chapters added yet.</p>
                      </div>
                    ) : (
                      list.map((chapter, index) => (
                        <ChapterRow
                          key={chapter.id}
                          chapter={chapter}
                          color={colorOf(subject).hex}
                          expanded={openChapter === chapter.id}
                          onToggle={() => setOpenChapter(openChapter === chapter.id ? null : chapter.id)}
                          onPatch={(patch) => save.mutate({ id: chapter.id, ...patch })}
                          onEdit={() => setDraft(chapter)}
                          onDelete={() => setChapterToDelete(chapter)}
                          onMove={(delta) => move(list, index, delta)}
                        />
                      ))
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start text-primary"
                      onClick={() =>
                        setDraft({ subject_id: subject.id, status: "not_started", priority: "medium" })
                      }
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add Chapter
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => setSubjectDraft(newSubjectDraft())}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Subject
          </Button>
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit chapter" : "New chapter"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Chapter name"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Subject</Label>
                <Select
                  value={draft.subject_id ?? ""}
                  onValueChange={(value) => setDraft({ ...draft, subject_id: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Pick subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <Select value={draft.status ?? "not_started"} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHAPTER_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Priority</Label>
                  <Select value={draft.priority ?? "medium"} onValueChange={(v) => setDraft({ ...draft, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Revision</Label>
                  <Select
                    value={draft.revision ?? "none"}
                    disabled={draft.status !== "completed"}
                    onValueChange={(v) => setDraft({ ...draft, revision: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REVISION_STAGES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Target date</Label>
                  <Input
                    type="date"
                    value={draft.target_date ?? ""}
                    onChange={(e) => setDraft({ ...draft, target_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label>Progress</Label>
                  <span className="num text-xs font-bold">
                    {draft.status === "completed" ? 100 : (draft.progress ?? 0)}%
                  </span>
                </div>
                <Slider
                  value={[draft.status === "completed" ? 100 : (draft.progress ?? 0)]}
                  min={0}
                  max={100}
                  step={5}
                  className="py-2"
                  onValueChange={(v) => {
                    const next = v[0] ?? 0;
                    setDraft({
                      ...draft,
                      progress: next,
                      status: next === 100 ? "completed" : next > 0 ? "studying" : "not_started",
                      revision: next === 100 ? (draft.revision ?? "none") : "none",
                    });
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Reaching 100% marks the chapter as Completed.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            {draft?.id ? (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  setChapterToDelete(chapters.find((c) => c.id === draft.id) ?? null);
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
                if (!draft?.subject_id) return;
                save.mutate({
                  ...(draft.id ? { id: draft.id } : {}),
                  subject_id: draft.subject_id,
                  name: draft.name?.trim() || "New chapter",
                  status: draft.status ?? "not_started",
                  progress: draft.status === "completed" ? 100 : (draft.progress ?? 0),
                  revision: draft.revision ?? "none",
                  priority: draft.priority ?? "medium",
                  target_date: draft.target_date || null,
                  notes: draft.notes ?? null,
                });
                setDraft(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubjectDialog
        draft={subjectDraft}
        onChange={setSubjectDraft}
        onClose={() => setSubjectDraft(null)}
        onSave={(next) => {
          saveSubject.mutate({
            ...(next.id ? { id: next.id } : {}),
            name: next.name?.trim() || "New subject",
            icon: next.icon ?? "book",
            color: next.color ?? "lavender",
            daily_goal_minutes: next.daily_goal_minutes ?? 60,
            weekly_goal_minutes: next.weekly_goal_minutes ?? 300,
          });
          setSubjectDraft(null);
        }}
      />

      <ConfirmDialog
        open={chapterToDelete !== null}
        title="Delete this chapter?"
        description="This will remove the chapter and its syllabus progress."
        onCancel={() => setChapterToDelete(null)}
        onConfirm={() => {
          if (chapterToDelete) remove.mutate(chapterToDelete.id);
          setChapterToDelete(null);
        }}
      />

      <ConfirmDialog
        open={subjectToDelete !== null}
        title={`Delete ${subjectToDelete?.name ?? "subject"}?`}
        description="This will permanently delete the subject, all its chapters, and related syllabus progress."
        onCancel={() => setSubjectToDelete(null)}
        onConfirm={() => {
          if (subjectToDelete) removeSubject.mutate(subjectToDelete.id);
          setSubjectToDelete(null);
        }}
      />
    </AppShell>
  );
}