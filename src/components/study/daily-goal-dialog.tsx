import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSaveProfile } from "@/lib/data";
import { goalLabel } from "@/lib/score";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUICK = [30, 60, 120, 240, 360, 390, 480];

/** Set today's study goal in hours + minutes. Nothing is hardcoded — the user owns it. */
export function DailyGoalDialog({
  open,
  goalMinutes,
  onClose,
}: {
  open: boolean;
  goalMinutes: number;
  onClose: () => void;
}) {
  const saveProfile = useSaveProfile();
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");

  useEffect(() => {
    if (!open) return;
    setHours(String(Math.floor(goalMinutes / 60)));
    setMinutes(String(goalMinutes % 60));
  }, [open, goalMinutes]);

  const total = Math.max(0, (Number(hours) || 0) * 60 + (Number(minutes) || 0));

  async function save() {
    if (total <= 0) {
      toast.error("Set a goal of at least 1 minute");
      return;
    }
    await saveProfile.mutateAsync({ daily_goal_minutes: total });
    toast.success(`Daily goal set to ${goalLabel(total)}`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Daily study goal</DialogTitle>
          <DialogDescription>
            Today&apos;s score is your study time divided by this goal. Past days keep their own goal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="goal-hours">Hours</Label>
              <Input
                id="goal-hours"
                type="number"
                inputMode="numeric"
                min={0}
                max={24}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="num h-12 rounded-2xl text-base"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-minutes">Minutes</Label>
              <Input
                id="goal-minutes"
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="num h-12 rounded-2xl text-base"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setHours(String(Math.floor(value / 60)));
                  setMinutes(String(value % 60));
                }}
                className={cn(
                  "min-h-10 rounded-2xl px-3 py-2 text-xs font-semibold",
                  total === value ? "bg-primary-soft text-primary" : "bg-muted",
                )}
              >
                {goalLabel(value)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            New goal: <span className="num font-semibold text-foreground">{goalLabel(total)}</span>
          </p>
        </div>
        <DialogFooter>
          <Button className="h-12 w-full rounded-2xl" onClick={save} disabled={saveProfile.isPending}>
            Save goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
