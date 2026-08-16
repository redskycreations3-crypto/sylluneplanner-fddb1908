import { IconPicker } from "@/components/study/primitives";
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
import { SUBJECT_COLORS, type Subject } from "@/lib/study";
import { cn } from "@/lib/utils";

export type SubjectDraft = Partial<Subject> & { id?: string };

export function SubjectDialog({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: SubjectDraft | null;
  onChange: (draft: SubjectDraft) => void;
  onClose: () => void;
  onSave: (draft: SubjectDraft) => void;
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>{draft?.id ? "Edit subject" : "New subject"}</DialogTitle>
        </DialogHeader>
        {draft ? (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Subject name</Label>
              <Input
                autoFocus
                value={draft.name ?? ""}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
                placeholder="e.g. Physics"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Icon (optional)</Label>
              <IconPicker value={draft.icon ?? "book"} onChange={(icon) => onChange({ ...draft, icon })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Color (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SUBJECT_COLORS).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange({ ...draft, color: key })}
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
                  onChange={(e) => onChange({ ...draft, daily_goal_minutes: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Weekly goal (min)</Label>
                <Input
                  type="number"
                  value={draft.weekly_goal_minutes ?? 300}
                  onChange={(e) => onChange({ ...draft, weekly_goal_minutes: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            className="w-full rounded-2xl"
            disabled={!draft?.name?.trim()}
            onClick={() => draft && onSave(draft)}
          >
            {draft?.id ? "Save subject" : "Create Subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}