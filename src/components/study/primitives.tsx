import {
  Atom,
  Book,
  Brain,
  Dumbbell,
  FlaskConical,
  Globe,
  Languages,
  Laptop,
  Leaf,
  Music,
  Palette,
  Sigma,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { colorOf } from "@/lib/study";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  book: Book,
  atom: Atom,
  flask: FlaskConical,
  sigma: Sigma,
  laptop: Laptop,
  languages: Languages,
  globe: Globe,
  palette: Palette,
  music: Music,
  dumbbell: Dumbbell,
  leaf: Leaf,
  brain: Brain,
};

export function SubjectIcon({
  subject,
  className,
  size = "md",
}: {
  subject?: { icon: string; color: string } | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const Icon = ICONS[subject?.icon ?? "book"] ?? Book;
  const color = colorOf(subject);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl",
        size === "sm" ? "h-9 w-9" : "h-11 w-11",
        color.chip,
        className,
      )}
    >
      <Icon className={cn(color.text, size === "sm" ? "h-4 w-4" : "h-5 w-5")} />
    </span>
  );
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {Object.entries(ICONS).map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "grid h-10 place-items-center rounded-xl border transition-colors",
            value === key ? "border-primary bg-primary-soft" : "border-border bg-muted/40",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export function ProgressRing({
  percent,
  size = 96,
  stroke = 8,
  color,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="stroke-muted"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          stroke={color ?? "currentColor"}
          className={color ? undefined : "text-primary"}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (clamped / 100) * circumference}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{
          width: `${Math.max(0, Math.min(100, percent))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <h2 className="truncate text-base font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card-soft grid place-items-center gap-1 px-6 py-10 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
