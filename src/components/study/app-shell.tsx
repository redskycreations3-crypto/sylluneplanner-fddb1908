import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, BookOpen, CalendarDays, CloudOff, Home, RefreshCw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimer } from "@/lib/timer";
import { formatClock } from "@/lib/study";
import { useOnline, usePendingCount } from "@/lib/offline";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/syllabus", label: "Syllabus", icon: BookOpen },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
  { to: "/planner", label: "Planner", icon: CalendarDays },
] as const;

export function AppShell({
  children,
  title,
  header,
}: {
  children: React.ReactNode;
  title?: string;
  header?: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isActive, isRunning, elapsed, remaining, state } = useTimer();
  const showTimerPill = isActive && pathname !== "/focus";
  const online = useOnline();
  const pending = usePendingCount();

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-xl px-4 pt-6 sm:max-w-2xl">
        {!online || pending > 0 ? (
          <div
            className={cn(
              "mb-4 flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-medium",
              online ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {online ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudOff className="h-4 w-4" />}
            <span>
              {online
                ? `Syncing ${pending} offline change${pending === 1 ? "" : "s"}…`
                : pending > 0
                  ? `Offline — ${pending} change${pending === 1 ? "" : "s"} saved on this device`
                  : "Offline — your study tracking keeps working"}
            </span>
          </div>
        ) : null}
        {header ?? (title ? <h1 className="mb-4 text-2xl font-bold">{title}</h1> : null)}
        {children}
      </div>

      {showTimerPill ? (
        <Link
          to="/focus"
          className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg"
        >
          <Timer className={cn("h-4 w-4", isRunning && "animate-pulse")} />
          <span className="num text-sm font-semibold">
            {formatClock(state.mode === "countdown" ? remaining : elapsed)}
          </span>
        </Link>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-stretch justify-between px-2 py-2 sm:max-w-2xl">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-2xl transition-colors",
                    active && "bg-primary-soft",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
