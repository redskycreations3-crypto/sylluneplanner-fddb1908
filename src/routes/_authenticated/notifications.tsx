import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/study/app-shell";
import { SectionTitle } from "@/components/study/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  NOTIFICATION_TYPES,
  getReminders,
  isNative,
  openSystemNotificationSettings,
  requestPermission,
  saveReminders,
  setPrefs,
  setTypeEnabled,
  syncStudyReminders,
  usePermission,
  usePrefs,
  type StudyReminder,
} from "@/lib/notifications";
import { DAYS } from "@/lib/study";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Syllune" },
      { name: "description", content: "Control study reminders, Pomodoro alerts, daily goal and streak notifications in Syllune." },
      { property: "og:title", content: "Notifications — Syllune" },
      { property: "og:description", content: "Study reminders, Pomodoro alerts and goal notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { prefs, reminders } = usePrefs();
  const { permission, refresh } = usePermission();
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("19:00");

  async function toggleMaster(next: boolean) {
    if (next) {
      const result = await requestPermission();
      refresh();
      if (result !== "granted") {
        setPrefs({ master: false, promptSeen: true });
        toast.error("Notification permission is required");
        return;
      }
    }
    setPrefs({ master: next, promptSeen: true, promptDismissed: next ? false : prefs.promptDismissed });
    await syncStudyReminders();
    toast.success(next ? "Notifications on" : "Notifications off");
  }

  function addReminder() {
    const name = label.trim();
    if (!name) {
      toast.error("Name the reminder first");
      return;
    }
    const next: StudyReminder = { id: Date.now(), label: name, time, days: [], enabled: true };
    saveReminders([...getReminders(), next]);
    setLabel("");
    void syncStudyReminders();
    toast.success("Reminder added");
  }

  function updateReminder(id: number, patch: Partial<StudyReminder>) {
    saveReminders(getReminders().map((r) => (r.id === id ? { ...r, ...patch } : r)));
    void syncStudyReminders();
  }

  function removeReminder(id: number) {
    saveReminders(getReminders().filter((r) => r.id !== id));
    void syncStudyReminders();
    toast.success("Reminder removed");
  }

  return (
    <AppShell
      header={
        <div className="mb-4 flex items-center gap-2">
          <Link to="/settings" className="grid h-9 w-9 place-items-center rounded-2xl bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
      }
    >
      <div className="grid gap-5">
        <section>
          <div className="card-soft grid gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft">
                  <Bell className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-[11px] text-muted-foreground">
                    Permission: {permission === "granted" ? "Allowed" : "Not allowed"}
                  </p>
                </div>
              </div>
              <Switch checked={prefs.master && permission === "granted"} onCheckedChange={toggleMaster} />
            </div>
            {permission === "denied" ? (
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={async () => {
                  const opened = await openSystemNotificationSettings();
                  if (!opened) toast.info("Enable notifications for Syllune in your device settings");
                }}
              >
                Enable in Android Settings
              </Button>
            ) : null}
            {!isNative() ? (
              <p className="text-[11px] text-muted-foreground">
                Install the Android app for background and lock-screen alerts.
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <SectionTitle>What to notify me about</SectionTitle>
          <div className={cn("card-soft grid gap-3 p-4", !prefs.master && "opacity-60")}>
            {NOTIFICATION_TYPES.map((type) => (
              <div key={type.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label className="text-xs font-semibold">{type.label}</Label>
                  <p className="truncate text-[11px] text-muted-foreground">{type.hint}</p>
                </div>
                <Switch
                  disabled={!prefs.master}
                  checked={prefs.types[type.key] !== false}
                  onCheckedChange={(checked) => {
                    setTypeEnabled(type.key, checked);
                    void syncStudyReminders();
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Reminder times</SectionTitle>
          <div className="card-soft grid gap-3 p-4">
            <div className="grid gap-1">
              <Label>Daily goal reminder</Label>
              <Input
                type="time"
                value={prefs.dailyGoalReminderTime}
                onChange={(e) => setPrefs({ dailyGoalReminderTime: e.target.value })}
                className="rounded-2xl"
              />
            </div>
            <div className="grid gap-1">
              <Label>Streak reminder</Label>
              <Input
                type="time"
                value={prefs.streakReminderTime}
                onChange={(e) => setPrefs({ streakReminderTime: e.target.value })}
                className="rounded-2xl"
              />
            </div>
            <div className="grid gap-1">
              <Label>Planner reminder lead time (minutes)</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={prefs.plannerLeadMinutes}
                onChange={(e) => setPrefs({ plannerLeadMinutes: Number(e.target.value) || 0 })}
                className="num rounded-2xl"
              />
            </div>
          </div>
        </section>

        <section>
          <SectionTitle>Study reminders</SectionTitle>
          <div className="card-soft grid gap-3 p-4">
            <div className="flex flex-wrap gap-2">
              <Input
                value={label}
                placeholder="Physics"
                onChange={(e) => setLabel(e.target.value)}
                className="min-w-0 flex-1 rounded-2xl"
              />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-32 rounded-2xl"
              />
              <Button className="rounded-2xl" onClick={addReminder}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {reminders.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No reminders yet. Add one like “Physics · 7:00 PM”.
              </p>
            ) : (
              reminders.map((reminder) => (
                <div key={reminder.id} className="grid gap-2 rounded-2xl bg-muted/60 p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={reminder.label}
                      onChange={(e) => updateReminder(reminder.id, { label: e.target.value })}
                      className="min-w-0 flex-1 rounded-2xl bg-card"
                    />
                    <Input
                      type="time"
                      value={reminder.time}
                      onChange={(e) => updateReminder(reminder.id, { time: e.target.value })}
                      className="w-28 rounded-2xl bg-card"
                    />
                    <Switch
                      checked={reminder.enabled}
                      onCheckedChange={(checked) => updateReminder(reminder.id, { enabled: checked })}
                    />
                    <button
                      onClick={() => removeReminder(reminder.id)}
                      className="grid h-9 w-9 place-items-center rounded-2xl bg-card text-destructive"
                      aria-label="Delete reminder"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {DAYS.map((day) => {
                      const active = reminder.days.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          onClick={() =>
                            updateReminder(reminder.id, {
                              days: active
                                ? reminder.days.filter((d) => d !== day.value)
                                : [...reminder.days, day.value].sort(),
                            })
                          }
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                            active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                          )}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                    {reminder.days.length === 0 ? (
                      <span className="self-center text-[10px] text-muted-foreground">Every day</span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
