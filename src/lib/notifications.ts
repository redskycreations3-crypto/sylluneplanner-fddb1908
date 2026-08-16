import { Capacitor, registerPlugin } from "@capacitor/core";
import { useEffect, useState } from "react";

/**
 * Local notification layer. On Android (Capacitor) it uses the native
 * LocalNotifications plugin so alerts fire in the background, on the lock
 * screen and fully offline. In the browser it degrades to the Web
 * Notification API.
 */

export type NotificationKey =
  | "study_reminders"
  | "pomodoro_done"
  | "break_done"
  | "daily_goal_reminder"
  | "daily_goal_achieved"
  | "streak_reminder"
  | "planner_reminders";

export type NotificationPrefs = {
  master: boolean;
  types: Record<NotificationKey, boolean>;
  dailyGoalReminderTime: string;
  streakReminderTime: string;
  plannerLeadMinutes: number;
  /** User tapped "Not Now" — never auto-ask again. */
  promptDismissed: boolean;
  promptSeen: boolean;
};

export type StudyReminder = {
  id: number;
  label: string;
  /** HH:mm */
  time: string;
  /** 0 = Sunday … 6 = Saturday. Empty = every day. */
  days: number[];
  enabled: boolean;
};

export const NOTIFICATION_TYPES: { key: NotificationKey; label: string; hint: string }[] = [
  { key: "study_reminders", label: "Study reminders", hint: "Your own subject reminders" },
  { key: "pomodoro_done", label: "Pomodoro session finished", hint: "When a focus block ends" },
  { key: "break_done", label: "Break finished", hint: "When a break ends" },
  { key: "daily_goal_reminder", label: "Daily goal reminder", hint: "If you haven't hit today's goal" },
  { key: "daily_goal_achieved", label: "Daily goal achieved", hint: "Celebrate hitting your goal" },
  { key: "streak_reminder", label: "Study streak reminder", hint: "Keep your streak alive" },
  { key: "planner_reminders", label: "Planner reminders", hint: "Before a planned session" },
];

const PREFS_KEY = "syllune.notifications.v1";
const REMINDERS_KEY = "syllune.reminders.v1";
const FIRED_KEY = "syllune.notifications.fired.v1";
const EVENT = "syllune:notifications-changed";

export const DEFAULT_PREFS: NotificationPrefs = {
  master: false,
  types: {
    study_reminders: true,
    pomodoro_done: true,
    break_done: true,
    daily_goal_reminder: true,
    daily_goal_achieved: true,
    streak_reminder: true,
    planner_reminders: true,
  },
  dailyGoalReminderTime: "20:00",
  streakReminderTime: "21:00",
  plannerLeadMinutes: 10,
  promptDismissed: false,
  promptSeen: false,
};

export const isNative = () => Capacitor.isNativePlatform();

function read<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...(fallback as object), ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getPrefs(): NotificationPrefs {
  const stored = read<NotificationPrefs>(PREFS_KEY, DEFAULT_PREFS);
  return { ...DEFAULT_PREFS, ...stored, types: { ...DEFAULT_PREFS.types, ...stored.types } };
}

export function setPrefs(patch: Partial<NotificationPrefs>) {
  const next = { ...getPrefs(), ...patch };
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
  return next;
}

export function setTypeEnabled(key: NotificationKey, enabled: boolean) {
  const prefs = getPrefs();
  return setPrefs({ types: { ...prefs.types, [key]: enabled } });
}

export function getReminders(): StudyReminder[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    const list = raw ? (JSON.parse(raw) as StudyReminder[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveReminders(list: StudyReminder[]) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
  return list;
}

export function usePrefs() {
  const [prefs, setLocal] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [reminders, setReminderList] = useState<StudyReminder[]>([]);
  useEffect(() => {
    const sync = () => {
      setLocal(getPrefs());
      setReminderList(getReminders());
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { prefs, reminders };
}

/* ------------------------------------------------------------------ */
/* Permission                                                          */
/* ------------------------------------------------------------------ */

export type PermissionState = "granted" | "denied" | "prompt";

type LocalNotificationsPlugin = {
  checkPermissions: () => Promise<{ display: string }>;
  requestPermissions: () => Promise<{ display: string }>;
  schedule: (options: { notifications: unknown[] }) => Promise<unknown>;
  cancel: (options: { notifications: { id: number }[] }) => Promise<void>;
  getPending: () => Promise<{ notifications: { id: number }[] }>;
  createChannel?: (channel: Record<string, unknown>) => Promise<void>;
};

let pluginPromise: Promise<LocalNotificationsPlugin | null> | null = null;
async function nativePlugin() {
  if (!isNative()) return null;
  if (!pluginPromise) {
    pluginPromise = import("@capacitor/local-notifications")
      .then((m) => m.LocalNotifications as unknown as LocalNotificationsPlugin)
      .catch(() => null);
  }
  return pluginPromise;
}

const AppSettings = registerPlugin<{ openNotificationSettings: () => Promise<void> }>("AppSettings");

export async function checkPermission(): Promise<PermissionState> {
  const plugin = await nativePlugin();
  if (plugin) {
    const result = await plugin.checkPermissions();
    return result.display === "granted" ? "granted" : result.display === "denied" ? "denied" : "prompt";
  }
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "prompt";
}

export async function requestPermission(): Promise<PermissionState> {
  const plugin = await nativePlugin();
  if (plugin) {
    const result = await plugin.requestPermissions();
    await plugin.createChannel?.({
      id: "syllune-study",
      name: "Study alerts",
      description: "Pomodoro, reminders and goal alerts",
      importance: 5,
      visibility: 1,
    });
    return result.display === "granted" ? "granted" : result.display === "denied" ? "denied" : "prompt";
  }
  if (typeof Notification === "undefined") return "denied";
  const result = await Notification.requestPermission();
  return result === "granted" ? "granted" : result === "denied" ? "denied" : "prompt";
}

export async function openSystemNotificationSettings() {
  if (isNative()) {
    try {
      await AppSettings.openNotificationSettings();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function usePermission() {
  const [state, setState] = useState<PermissionState>("prompt");
  const refresh = () => {
    void checkPermission().then(setState);
  };
  useEffect(() => {
    refresh();
    const onVisible = () => refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return { permission: state, refresh };
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

export const IDS = {
  pomodoroFocus: 1001,
  pomodoroBreak: 1002,
  dailyGoalReminder: 2001,
  dailyGoalAchieved: 2002,
  streakReminder: 2003,
  reminderBase: 3000,
  plannerBase: 5000,
};

function allowed(key: NotificationKey) {
  const prefs = getPrefs();
  return prefs.master && prefs.types[key] !== false;
}

const webTimers = new Map<number, number>();

function webNotify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/icons/icon-192.png", tag: title });
    }
  } catch {
    /* ignore */
  }
}

/** Fires a notification right now (used when a phase ends while app is open). */
export async function notifyNow(key: NotificationKey, title: string, body: string) {
  if (!allowed(key)) return;
  const plugin = await nativePlugin();
  if (plugin) {
    await plugin.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000) + 90000,
          title,
          body,
          channelId: "syllune-study",
          smallIcon: "ic_stat_icon_config_sample",
        },
      ],
    });
    return;
  }
  webNotify(title, body);
}

export async function cancelIds(ids: number[]) {
  const plugin = await nativePlugin();
  if (plugin) {
    await plugin.cancel({ notifications: ids.map((id) => ({ id })) }).catch(() => undefined);
    return;
  }
  ids.forEach((id) => {
    const timer = webTimers.get(id);
    if (timer) window.clearTimeout(timer);
    webTimers.delete(id);
  });
}

/** Schedules one notification at an absolute time (works offline). */
export async function scheduleAt(
  key: NotificationKey,
  id: number,
  at: Date,
  title: string,
  body: string,
  repeatDaily = false,
) {
  await cancelIds([id]);
  if (!allowed(key)) return;
  if (!repeatDaily && at.getTime() <= Date.now()) return;
  const plugin = await nativePlugin();
  if (plugin) {
    await plugin
      .schedule({
        notifications: [
          {
            id,
            title,
            body,
            channelId: "syllune-study",
            smallIcon: "ic_stat_icon_config_sample",
            schedule: repeatDaily
              ? { at, repeats: true, every: "day", allowWhileIdle: true }
              : { at, allowWhileIdle: true },
          },
        ],
      })
      .catch(() => undefined);
    return;
  }
  const delay = at.getTime() - Date.now();
  if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;
  const timer = window.setTimeout(() => webNotify(title, body), delay);
  webTimers.set(id, timer);
}

export function nextOccurrence(time: string, day?: number, from = new Date()) {
  const [h, m] = time.split(":").map((n) => Number(n) || 0);
  const date = new Date(from);
  date.setHours(h, m, 0, 0);
  if (typeof day === "number") {
    const diff = (day - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + diff);
  }
  if (date.getTime() <= from.getTime()) date.setDate(date.getDate() + (typeof day === "number" ? 7 : 1));
  return date;
}

/** Reschedules every user study reminder from the stored list. */
export async function syncStudyReminders() {
  const reminders = getReminders();
  const ids: number[] = [];
  reminders.forEach((reminder, index) => {
    const slots = reminder.days.length ? reminder.days : [-1];
    slots.forEach((_, slot) => ids.push(IDS.reminderBase + index * 10 + slot));
  });
  await cancelIds(
    Array.from({ length: 200 }, (_, i) => IDS.reminderBase + i),
  );
  if (!allowed("study_reminders")) return;
  for (const [index, reminder] of reminders.entries()) {
    if (!reminder.enabled) continue;
    const days = reminder.days.length ? reminder.days : [undefined];
    for (const [slot, day] of days.entries()) {
      const at = nextOccurrence(reminder.time, day as number | undefined);
      await scheduleAt(
        "study_reminders",
        IDS.reminderBase + index * 10 + slot,
        at,
        "Study time 📚",
        `Time to study ${reminder.label}.`,
        day === undefined,
      );
    }
  }
}

/** One-shot guard so a notification only fires once per day. */
export function firedToday(tag: string) {
  try {
    const map = JSON.parse(localStorage.getItem(FIRED_KEY) || "{}") as Record<string, string>;
    return map[tag] === new Date().toDateString();
  } catch {
    return false;
  }
}

export function markFired(tag: string) {
  try {
    const map = JSON.parse(localStorage.getItem(FIRED_KEY) || "{}") as Record<string, string>;
    map[tag] = new Date().toDateString();
    localStorage.setItem(FIRED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
