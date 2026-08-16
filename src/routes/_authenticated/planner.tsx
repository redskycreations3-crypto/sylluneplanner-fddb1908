import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/study/app-shell";
import { EmptyState, SubjectIcon } from "@/components/study/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteTimetableEntry, useSaveTimetableEntry, useSubjects, useTimetable } from "@/lib/data";
import { DAYS, colorOf, formatTime, type TimetableEntry } from "@/lib/study";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Weekly study planner — StudyFlow" },
      { name: "description", content: "Plan your week with a study timetable: subjects, topics, times and reminders." },
      { property: "og:title", content: "Weekly study planner — StudyFlow" },
      { property: "og:description", content: "Build a repeatable weekly study timetable." },
    ],
  }),
  component: PlannerPage,
});

type Draft = {
  id?: string;
  title: string;
  subject_id: string | null;
  start_time: string;
  end_time: string;
  note: string;
  reminder: boolean;
  days: number[];
};

const emptyDraft = (day: number): Draft => ({
  title: "",
  subject_id: null,
  start_time: "18:00",
  end_time: "19:00",
  note: "",
  reminder: false,
  days: [day],
});

function PlannerPage() {
  const { data: entries = [] } = useTimetable();
  const { data: subjects = [] } = useSubjects();
  const saveEntry = useSaveTimetableEntry();
  const deleteEntry = useDeleteTimetableEntry();

  const todayDay = new Date().getDay();
  const [view, setView] = useState<"day" | "week">("day");
  const [activeDay, setActiveDay] = useState(todayDay);
  const [draft, setDraft] = useState<Draft | null>(null);

  function openEdit(entry: TimetableEntry) {
    setDraft({
      id: entry.id,
      title: entry.title,
      subject_id: entry.subject_id,
      start_time: entry.start_time.slice(0, 5),
      end_time: entry.end_time.slice(0, 5),
      note: entry.note ?? "",
      reminder: entry.reminder,
      days: [entry.day_of_week],
    });
  }

  async function save() {
    if (!draft) return;
    const { id, days, ...rest } = draft;
    await saveEntry.mutateAsync({
      ...(id ? { id, day_of_week: days[0] ?? activeDay } : { days }),
      ...rest,
      title: rest.title.trim() || subjects.find((s) => s.id === rest.subject_id)?.name || "Study block",
      note: rest.note.trim() || null,
    });
    setDraft(null);
    toast.success("Timetable updated");
  }

  function renderEntry(entry: TimetableEntry) {
    const subject = subjects.find((s) => s.id === entry.subject_id) ?? null;
    return (
      <div key={entry.id} className="card-soft flex items-center gap-3 p-3">
        <SubjectIcon subject={subject} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{entry.title}</p>
          <p className="num text-[11px] text-muted-foreground">
            {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
            {entry.note ? ` · ${entry.note}` : ""}
          </p>
        </div>
        <span className="h-8 w-1 rounded-full" style={{ background: colorOf(subject).hex }} />
        <button onClick={() => openEdit(entry)} className="grid h-8 w-8 place-items-center rounded-xl bg-muted">
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={async () => {
            await deleteEntry.mutateAsync(entry.id);
            toast.success("Removed");
          }}
          className="grid h-8 w-8 place-items-center rounded-xl bg-muted text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const dayEntries = entries.filter((e) => e.day_of_week === activeDay);

  return (
    <AppShell title="Planner">
      <div className="grid gap-4">
        <div className="flex gap-2">
          {(["day", "week"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={cn(
                "flex-1 rounded-2xl py-2 text-xs font-semibold capitalize",
                view === mode ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {mode} view
            </button>
          ))}
        </div>

        {view === "day" ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  onClick={() => setActiveDay(day.value)}
                  className={cn(
                    "shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold",
                    activeDay === day.value ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              {dayEntries.length === 0 ? (
                <EmptyState title="Nothing planned" hint="Add a study block for this day." />
              ) : (
                dayEntries.map(renderEntry)
              )}
            </div>
          </>
        ) : (
          <div className="grid gap-4">
            {DAYS.map((day) => {
              const list = entries.filter((e) => e.day_of_week === day.value);
              return (
                <section key={day.value}>
                  <p className="mb-2 text-sm font-bold">{day.long}</p>
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No sessions</p>
                  ) : (
                    <div className="grid gap-2">{list.map(renderEntry)}</div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <Button className="rounded-2xl" onClick={() => setDraft(emptyDraft(activeDay))}>
          <Plus className="mr-2 h-4 w-4" /> Add study block
        </Button>
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit block" : "New study block"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>Title</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Chapter or topic"
                  className="rounded-2xl"
                />
              </div>
              <div className="grid gap-1">
                <Label>Subject</Label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      onClick={() =>
                        setDraft({ ...draft, subject_id: draft.subject_id === s.id ? null : s.id })
                      }
                      className={cn(
                        "rounded-2xl px-3 py-2 text-xs font-semibold",
                        draft.subject_id === s.id ? "bg-primary-soft text-primary" : "bg-muted",
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label>Start</Label>
                  <Input
                    type="time"
                    value={draft.start_time}
                    onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>
                <div className="grid gap-1">
                  <Label>End</Label>
                  <Input
                    type="time"
                    value={draft.end_time}
                    onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label>{draft.id ? "Day" : "Repeat on"}</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          days: draft.id
                            ? [day.value]
                            : draft.days.includes(day.value)
                              ? draft.days.filter((d) => d !== day.value)
                              : [...draft.days, day.value],
                        })
                      }
                      className={cn(
                        "rounded-2xl px-3 py-2 text-xs font-semibold",
                        draft.days.includes(day.value) ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Note</Label>
                <Input
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Reminder</Label>
                <Switch
                  checked={draft.reminder}
                  onCheckedChange={(reminder) => setDraft({ ...draft, reminder })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button className="rounded-2xl" onClick={save} disabled={saveEntry.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
