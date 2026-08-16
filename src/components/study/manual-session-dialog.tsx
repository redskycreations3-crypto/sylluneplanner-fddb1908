import { useEffect, useState } from "react";
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
import { useChapters, useSaveSession, useSubjects } from "@/lib/data";
import { dayKey, type StudySession } from "@/lib/study";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ManualSessionTarget = StudySession | "new" | null;

function toTimeInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "+ Add study time" — log a session you studied away from the timer. */
export function ManualSessionDialog({
  target,
  onClose,
}: {
  target: ManualSessionTarget;
  onClose: () => void;
}) {
  const { data: subjects = [] } = useSubjects();
  const { data: chapters = [] } = useChapters();
  const saveSession = useSaveSession();
  const existing = target && target !== "new" ? target : null;

  const [date, setDate] = useState(dayKey(new Date()));
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!target) return;
    if (existing) {
      setDate(dayKey(new Date(existing.started_at)));
      setSubjectId(existing.subject_id);
      setChapterId(existing.chapter_id);
      setHours(String(Math.floor(existing.duration_seconds / 3600)));
      setMinutes(String(Math.round((existing.duration_seconds % 3600) / 60)));
      setStart(toTimeInput(existing.started_at));
      setEnd(toTimeInput(existing.ended_at));
      setNote(existing.note ?? "");
    } else {
      setDate(dayKey(new Date()));
      setSubjectId(null);
      setChapterId(null);
      setHours("1");
      setMinutes("0");
      setStart("");
      setEnd("");
      setNote("");
    }
  }, [target, existing]);

  const subjectChapters = chapters.filter((c) => c.subject_id === subjectId);

  // Start + end wins; otherwise fall back to the typed duration.
  const fromRange =
    start && end
      ? (() => {
          const s = new Date(`${date}T${start}`);
          const e = new Date(`${date}T${end}`);
          let diff = (e.getTime() - s.getTime()) / 1000;
          if (diff < 0) diff += 86400; // crossed midnight
          return Math.round(diff);
        })()
      : null;
  const seconds = fromRange ?? (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60;

  async function save() {
    if (seconds <= 0) {
      toast.error("Enter how long you studied");
      return;
    }
    const startedAt = start
      ? new Date(`${date}T${start}`)
      : new Date(`${date}T12:00`);
    const endedAt = new Date(startedAt.getTime() + seconds * 1000);
    await saveSession.mutateAsync({
      ...(existing ? { id: existing.id } : {}),
      subject_id: subjectId,
      chapter_id: chapterId,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: seconds,
      session_type: "manual",
      source: "manual",
      note: note.trim() || null,
    });
    toast.success(existing ? "Session updated" : "Study time added");
    onClose();
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit session" : "Add study time"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-2xl" />
          </div>

          <div className="grid gap-1.5">
            <Label>Subject</Label>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSubjectId(s.id);
                    setChapterId(null);
                  }}
                  className={cn(
                    "rounded-2xl px-3 py-2 text-xs font-semibold",
                    subjectId === s.id ? "bg-primary-soft text-primary" : "bg-muted",
                  )}
                >
                  {s.name}
                </button>
              ))}
              {subjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add a subject first.</p>
              ) : null}
            </div>
          </div>

          {subjectChapters.length > 0 ? (
            <div className="grid gap-1.5">
              <Label>Chapter / unit / lesson</Label>
              <div className="flex flex-wrap gap-2">
                {subjectChapters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChapterId(chapterId === c.id ? null : c.id)}
                    className={cn(
                      "rounded-2xl px-3 py-2 text-xs font-semibold",
                      chapterId === c.id ? "bg-primary-soft text-primary" : "bg-muted",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Hours</Label>
              <Input
                type="number"
                min={0}
                value={hours}
                disabled={fromRange !== null}
                onChange={(e) => setHours(e.target.value)}
                className="num rounded-2xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Minutes</Label>
              <Input
                type="number"
                min={0}
                max={59}
                value={minutes}
                disabled={fromRange !== null}
                onChange={(e) => setMinutes(e.target.value)}
                className="num rounded-2xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Start (optional)</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-2xl" />
            </div>
            <div className="grid gap-1.5">
              <Label>End (optional)</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-2xl" />
            </div>
          </div>

          {fromRange !== null ? (
            <p className="text-[11px] text-muted-foreground">
              Duration calculated from start and end times.
            </p>
          ) : null}

          <div className="grid gap-1.5">
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="rounded-2xl" />
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full rounded-2xl" onClick={save} disabled={saveSession.isPending}>
            {existing ? "Save session" : "Add study time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
