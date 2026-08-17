import { Capacitor, registerPlugin } from "@capacitor/core";

export type WidgetTask = {
  id: string;
  title: string;
  time: string;
  emoji: string;
  color: string;
  done: boolean;
};

export type WidgetDay = {
  key: string;
  label: string;
  tasks: WidgetTask[];
};

export type WidgetPayload = { days: WidgetDay[]; todayIndex: number };

export type WidgetToggle = { entryId: string; day: string; done: boolean };

type StudyWidgetPlugin = {
  setData(options: { payload: string }): Promise<void>;
  setOpacity(options: { opacity: number }): Promise<void>;
  consumeToggles(): Promise<{ toggles: WidgetToggle[] }>;
};

const StudyWidget = registerPlugin<StudyWidgetPlugin>("StudyWidget");

export const OPACITY_KEY = "syllune.widget.opacity";

export function widgetAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function readWidgetOpacity() {
  if (typeof localStorage === "undefined") return 0.75;
  const raw = Number(localStorage.getItem(OPACITY_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 0.75;
}

export async function pushWidgetData(payload: WidgetPayload) {
  if (!widgetAvailable()) return;
  try {
    await StudyWidget.setData({ payload: JSON.stringify(payload) });
  } catch {
    /* widget not installed */
  }
}

export async function pushWidgetOpacity(opacity: number) {
  if (typeof localStorage !== "undefined") localStorage.setItem(OPACITY_KEY, String(opacity));
  if (!widgetAvailable()) return;
  try {
    await StudyWidget.setOpacity({ opacity });
  } catch {
    /* widget not installed */
  }
}

export async function consumeWidgetToggles(): Promise<WidgetToggle[]> {
  if (!widgetAvailable()) return [];
  try {
    const { toggles } = await StudyWidget.consumeToggles();
    return toggles ?? [];
  } catch {
    return [];
  }
}
