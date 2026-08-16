import { useEffect } from "react";
import { useDailyGoalMinutes, useProfile, useSessions, useTimetable } from "./data";
import { sessionSeconds, sessionsOn } from "./study";
import {
  IDS,
  cancelIds,
  firedToday,
  getPrefs,
  markFired,
  nextOccurrence,
  notifyNow,
  scheduleAt,
  syncStudyReminders,
} from "./notifications";

/**
 * Keeps scheduled local notifications (goal, streak, planner, reminders) in
 * sync with the user's data. All scheduling is local, so it keeps firing
 * offline once set.
 */
export function useNotificationScheduler() {
  const { data: profile } = useProfile();
  const { data: sessions = [] } = useSessions();
  const { data: timetable = [] } = useTimetable();
  const goalMinutes = useDailyGoalMinutes();

  const todaySeconds = sessionSeconds(sessionsOn(sessions, new Date()));
  const goal = goalMinutes ?? profile?.daily_goal_minutes ?? 240;
  const reached = goal > 0 && todaySeconds / 60 >= goal;

  // Goal achieved — fires once a day, immediately.
  useEffect(() => {
    if (!reached || firedToday("goal-achieved")) return;
    const hours = Math.round((goal / 60) * 10) / 10;
    markFired("goal-achieved");
    void notifyNow(
      "daily_goal_achieved",
      "Daily goal complete 🎉",
      `You reached your ${hours}h study goal today.`,
    );
    void cancelIds([IDS.dailyGoalReminder]);
  }, [reached, goal]);

  // Daily goal reminder + streak reminder.
  useEffect(() => {
    const prefs = getPrefs();
    if (reached) {
      void cancelIds([IDS.dailyGoalReminder]);
    } else {
      void scheduleAt(
        "daily_goal_reminder",
        IDS.dailyGoalReminder,
        nextOccurrence(prefs.dailyGoalReminderTime),
        "Daily goal reminder 🎯",
        "You haven't reached today's study goal yet.",
        true,
      );
    }
    void scheduleAt(
      "streak_reminder",
      IDS.streakReminder,
      nextOccurrence(prefs.streakReminderTime),
      "Keep your streak alive 🔥",
      "A short session today keeps your study streak going.",
      true,
    );
  }, [reached, goal]);

  // Planner reminders for the next 7 days.
  useEffect(() => {
    const prefs = getPrefs();
    void (async () => {
      await cancelIds(Array.from({ length: 60 }, (_, i) => IDS.plannerBase + i));
      if (!prefs.master || prefs.types.planner_reminders === false) return;
      let index = 0;
      for (const entry of timetable) {
        const day = (entry as { day_of_week?: number | null }).day_of_week;
        const time = (entry as { start_time?: string | null }).start_time;
        if (typeof day !== "number" || !time) continue;
        const at = nextOccurrence(time.slice(0, 5), day);
        at.setMinutes(at.getMinutes() - prefs.plannerLeadMinutes);
        const label = (entry as { title?: string | null }).title ?? "your planned session";
        await scheduleAt(
          "planner_reminders",
          IDS.plannerBase + index,
          at,
          "Planned study session 📅",
          `${label} starts in ${prefs.plannerLeadMinutes} minutes.`,
        );
        index += 1;
        if (index > 55) break;
      }
    })();
  }, [timetable]);

  // Keep user study reminders scheduled.
  useEffect(() => {
    void syncStudyReminders();
  }, []);
}
