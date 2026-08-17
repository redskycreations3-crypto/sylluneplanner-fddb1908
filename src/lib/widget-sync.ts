import { useEffect } from "react";
import { App } from "@capacitor/app";
import { usePlannerCompletions, useSubjects, useTimetable, useTogglePlannerCompletion } from "./data";
import { colorOf, dayKey, formatTime } from "./study";
import {
  consumeWidgetToggles,
  pushWidgetData,
  pushWidgetOpacity,
  readWidgetOpacity,
  widgetAvailable,
  type WidgetDay,
} from "./widget";

const RANGE = 7;

/** Keeps the Android home-screen planner widget in sync with the app. */
export function useWidgetSync() {
  const { data: entries = [] } = useTimetable();
  const { data: subjects = [] } = useSubjects();
  const { data: completions = [] } = usePlannerCompletions();
  const toggle = useTogglePlannerCompletion();

  useEffect(() => {
    if (!widgetAvailable()) return;
    const days: WidgetDay[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let offset = -RANGE; offset <= RANGE; offset++) {
      const date = new Date(base);
      date.setDate(base.getDate() + offset);
      const key = dayKey(date);
      const tasks = entries
        .filter((entry) => entry.day_of_week === date.getDay())
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map((entry) => {
          const subject = subjects.find((s) => s.id === entry.subject_id) ?? null;
          return {
            id: entry.id,
            title: entry.title || subject?.name || "Study block",
            time: `${formatTime(entry.start_time)} – ${formatTime(entry.end_time)}`,
            emoji: "",
            color: colorOf(subject).hex,
            done: completions.some((c) => c.entry_id === entry.id && c.day === key),
          };
        });
      days.push({
        key,
        label:
          offset === 0
            ? "Today"
            : offset === 1
              ? "Tomorrow"
              : offset === -1
                ? "Yesterday"
                : date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
        tasks,
      });
    }
    void pushWidgetData({ days, todayIndex: RANGE });
    void pushWidgetOpacity(readWidgetOpacity());
  }, [entries, subjects, completions]);

  useEffect(() => {
    if (!widgetAvailable()) return;
    let cancelled = false;
    const drain = async () => {
      const toggles = await consumeWidgetToggles();
      if (cancelled) return;
      for (const item of toggles) {
        const existing = completions.find((c) => c.entry_id === item.entryId && c.day === item.day);
        if (item.done === Boolean(existing)) continue;
        await toggle.mutateAsync({
          entryId: item.entryId,
          day: item.day,
          done: item.done,
          existingId: existing?.id,
        });
      }
    };
    void drain();
    const handle = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void drain();
    });
    return () => {
      cancelled = true;
      void handle.then((h) => h.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completions]);
}
