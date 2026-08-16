import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Circle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { ProgressBar } from "@/components/study/primitives";
import {
  CHAPTER_STATUSES,
  chapterPercent,
  isRevised,
  statusLabel,
  type Chapter,
} from "@/lib/study";
import { cn } from "@/lib/utils";

type Props = {
  chapter: Chapter;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<Chapter>) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (delta: number) => void;
};

/** One syllabus chapter: status, revision, manual progress and a tap-friendly ⋮ menu. */
export function ChapterRow({
  chapter,
  color,
  expanded,
  onToggle,
  onPatch,
  onEdit,
  onDelete,
  onMove,
}: Props) {
  const percent = chapterPercent(chapter);
  const revised = isRevised(chapter);
  const done = chapter.status === "completed";
  const dot = CHAPTER_STATUSES.find((s) => s.value === chapter.status)?.dot;
  const [pending, setPending] = useState<number | null>(null);
  const shown = pending ?? percent;

  return (
    <div className="rounded-2xl bg-muted/50">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dot)} />
        <button className="min-w-0 flex-1 py-1 text-left" onClick={onToggle}>
          <p className="truncate text-sm font-medium">{chapter.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {statusLabel(chapter.status)} · {revised ? "Revised" : "Not revised"}
            {chapter.target_date ? ` · due ${chapter.target_date}` : ""}
          </p>
        </button>
        <span className="num shrink-0 text-[11px] font-semibold text-muted-foreground">
          {percent}%
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${chapter.name}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground active:bg-muted"
          >
            <MoreVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl">
            <DropdownMenuItem className="h-11 text-sm" onSelect={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="h-11 text-sm" onSelect={onToggle}>
              Set progress
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="h-11 text-sm"
              onSelect={() => onPatch({ status: "completed", progress: 100 })}
            >
              Mark as Completed
            </DropdownMenuItem>
            <DropdownMenuItem
              className="h-11 text-sm"
              onSelect={() => onPatch({ status: "studying", progress: percent === 100 ? 50 : percent })}
            >
              Mark as Studying
            </DropdownMenuItem>
            <DropdownMenuItem
              className="h-11 text-sm"
              onSelect={() => onPatch({ status: "not_started", progress: 0, revision: "none" })}
            >
              Mark as Not started
            </DropdownMenuItem>
            {done ? (
              <DropdownMenuItem
                className="h-11 text-sm"
                onSelect={() => onPatch({ revision: revised ? "none" : "r1" })}
              >
                {revised ? "Mark as Not revised" : "Mark as Revised"}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="h-11 text-sm" onSelect={() => onMove(-1)}>
              <ArrowUp className="mr-2 h-4 w-4" /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem className="h-11 text-sm" onSelect={() => onMove(1)}>
              <ArrowDown className="mr-2 h-4 w-4" /> Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="h-11 text-sm text-destructive" onSelect={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded ? (
        <div className="grid gap-3 border-t border-border/60 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">{done ? "Completed" : statusLabel(chapter.status)}</span>
            <span className="num text-xs font-bold" style={{ color }}>
              {shown}%
            </span>
          </div>
          <ProgressBar percent={shown} color={color} />
          <Slider
            value={[shown]}
            min={0}
            max={100}
            step={5}
            aria-label="Chapter progress"
            className="py-2"
            onValueChange={(v) => setPending(v[0] ?? 0)}
            onValueCommit={(v) => {
              const next = v[0] ?? 0;
              setPending(null);
              onPatch({
                progress: next,
                status: next === 100 ? "completed" : next > 0 ? "studying" : "not_started",
              });
            }}
          />
          <div className="flex flex-wrap gap-2">
            {[0, 25, 50, 75, 100].map((step) => (
              <button
                key={step}
                onClick={() =>
                  onPatch({
                    progress: step,
                    status: step === 100 ? "completed" : step > 0 ? "studying" : "not_started",
                  })
                }
                className={cn(
                  "min-h-10 rounded-2xl px-3 text-xs font-semibold",
                  percent === step ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {step}%
              </button>
            ))}
          </div>
          {done ? (
            <button
              onClick={() => onPatch({ revision: revised ? "none" : "r1" })}
              className="flex min-h-11 items-center gap-2 rounded-2xl bg-muted px-3 text-xs font-semibold"
            >
              {revised ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              Revised
            </button>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Reach 100% to unlock the Revised control.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
