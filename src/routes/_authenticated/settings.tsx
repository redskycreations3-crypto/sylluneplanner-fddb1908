import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/study/app-shell";
import { SectionTitle } from "@/components/study/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  exportAllData,
  importAllData,
  resetAllData,
  useChapters,
  useProfile,
  useSaveProfile,
  useSessions,
  useSubjects,
  useTimetable,
} from "@/lib/data";
import { downloadStudyReport } from "@/lib/report";
import { fileToAvatarDataUrl } from "@/lib/avatar";
import { clearResolutions, usePendingCount, useSyncResolutions } from "@/lib/offline";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { autoProgressSettings, type AutoProgressRule } from "@/lib/auto-progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — StudyFlow" },
      { name: "description", content: "Set study goals, timer defaults, reminders, theme and manage your StudyFlow data." },
      { property: "og:title", content: "Settings — StudyFlow" },
      { property: "og:description", content: "Goals, timer defaults, notifications, theme and data export." },
    ],
  }),
  component: SettingsPage,
});

const EMOJIS = ["🦊", "🐨", "🐼", "🐧", "🦉", "🐝", "🌸", "🚀"];

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const saveProfile = useSaveProfile();
  const { data: subjects = [] } = useSubjects();
  const { data: chapters = [] } = useChapters();
  const { data: sessions = [] } = useSessions();
  const { data: timetable = [] } = useTimetable();
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => {
    if (profile) {
      setName(profile.display_name);
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  function patch(values: Record<string, unknown>) {
    saveProfile.mutate(values, { onSuccess: () => toast.success("Saved") });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Settings">
      <div className="grid gap-5">
        <section>
          <SectionTitle>Profile</SectionTitle>
          <div className="card-soft grid gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-3xl bg-primary-soft text-3xl">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Your avatar" className="h-full w-full object-cover" />
                ) : (
                  (profile?.avatar_emoji ?? "🦊")
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    try {
                      patch({ avatar_url: await fileToAvatarDataUrl(file) });
                    } catch {
                      toast.error("Could not use that image");
                    }
                  }}
                />
                <Button size="sm" variant="secondary" className="rounded-2xl" onClick={() => avatarRef.current?.click()}>
                  Upload photo
                </Button>
                {profile?.avatar_url ? (
                  <Button size="sm" variant="ghost" className="rounded-2xl" onClick={() => patch({ avatar_url: null })}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => patch({ avatar_emoji: emoji, avatar_url: null })}
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-2xl text-xl",
                    profile?.avatar_emoji === emoji && !profile?.avatar_url ? "bg-primary-soft" : "bg-muted",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="grid gap-1">
              <Label>Display name</Label>
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-2xl" />
                <Button className="rounded-2xl" onClick={() => patch({ display_name: name.trim() || "Student" })}>
                  Save
                </Button>
              </div>
            </div>
            <div className="grid gap-1">
              <Label>Bio / status</Label>
              <div className="flex gap-2">
                <Input
                  value={bio}
                  maxLength={120}
                  placeholder="One chapter at a time."
                  onChange={(e) => setBio(e.target.value)}
                  className="rounded-2xl"
                />
                <Button className="rounded-2xl" onClick={() => patch({ bio: bio.trim() || null })}>
                  Save
                </Button>
              </div>
            </div>
            <Link to="/subjects" className="text-xs font-semibold text-primary">
              Manage subjects →
            </Link>
          </div>
        </section>

        <section>
          <SectionTitle>Study goals</SectionTitle>
          <div className="card-soft grid gap-3 p-4">
            {[
              { key: "daily_goal_minutes", label: "Daily goal (minutes)" },
              { key: "weekly_goal_minutes", label: "Weekly goal (minutes)" },
              { key: "streak_min_minutes", label: "Minutes that count as a study day" },
            ].map((field) => (
              <div key={field.key} className="grid gap-1">
                <Label>{field.label}</Label>
                <Input
                  type="number"
                  min={1}
                  defaultValue={(profile as Record<string, never> | null | undefined)?.[field.key as never] ?? ""}
                  key={`${field.key}-${profile?.updated_at ?? ""}`}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (Number.isFinite(value) && value > 0) patch({ [field.key]: value });
                  }}
                  className="num rounded-2xl"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Timer defaults</SectionTitle>
          <div className="card-soft grid gap-3 p-4">
            <div className="flex gap-2">
              {(["stopwatch", "countdown"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => patch({ default_timer_mode: mode })}
                  className={cn(
                    "flex-1 rounded-2xl py-2 text-xs font-semibold capitalize",
                    profile?.default_timer_mode === mode ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>Countdown (min)</Label>
                <Input
                  type="number"
                  min={1}
                  key={`cd-${profile?.updated_at ?? ""}`}
                  defaultValue={profile?.default_countdown_minutes ?? 25}
                  onBlur={(e) => patch({ default_countdown_minutes: Number(e.target.value) || 25 })}
                  className="num rounded-2xl"
                />
              </div>
              <div className="grid gap-1">
                <Label>Break (min)</Label>
                <Input
                  type="number"
                  min={1}
                  key={`br-${profile?.updated_at ?? ""}`}
                  defaultValue={profile?.break_minutes ?? 5}
                  onBlur={(e) => patch({ break_minutes: Number(e.target.value) || 5 })}
                  className="num rounded-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        <AutoProgressCard profile={profile ?? null} patch={patch} />

        <section>
          <SectionTitle>Notifications</SectionTitle>
          <div className="card-soft grid gap-3 p-4">
            {[
              { key: "notify_timetable", label: "Upcoming timetable sessions" },
              { key: "notify_daily_goal", label: "Daily goal reminder" },
              { key: "notify_revision", label: "Revision deadlines" },
              { key: "notify_streak", label: "Streak reminders" },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-3">
                <Label className="text-xs font-medium">{row.label}</Label>
                <Switch
                  checked={Boolean((profile as unknown as Record<string, boolean> | null)?.[row.key])}
                  onCheckedChange={async (checked) => {
                    if (checked && typeof Notification !== "undefined" && Notification.permission === "default") {
                      await Notification.requestPermission();
                    }
                    patch({ [row.key]: checked });
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Theme</SectionTitle>
          <div className="card-soft flex gap-2 p-4">
            {(["light", "dark", "system"] as ThemeChoice[]).map((choice) => (
              <button
                key={choice}
                onClick={() => setTheme(choice)}
                className={cn(
                  "flex-1 rounded-2xl py-2 text-xs font-semibold capitalize",
                  theme === choice ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {choice}
              </button>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Data</SectionTitle>
          <div className="card-soft grid gap-2 p-4">
            <Button
              className="rounded-2xl"
              onClick={() => {
                downloadStudyReport({ profile: profile ?? null, subjects, chapters, sessions, timetable });
                toast.success("PDF report downloaded");
              }}
            >
              Export PDF report
            </Button>
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={async () => {
                const data = await exportAllData();
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "studyflow-export.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  await importAllData(JSON.parse(await file.text()));
                  await queryClient.invalidateQueries();
                  toast.success("Data imported");
                } catch {
                  toast.error("Could not import that file");
                }
                event.target.value = "";
              }}
            />
            <Button variant="secondary" className="rounded-2xl" onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
            <Button
              variant="destructive"
              className="rounded-2xl"
              onClick={async () => {
                if (!confirm("Delete all subjects, chapters and sessions?")) return;
                await resetAllData();
                await queryClient.invalidateQueries();
                toast.success("All data reset");
              }}
            >
              Reset all data
            </Button>
          </div>
        </section>

        <SyncActivity />

        <Button variant="ghost" className="rounded-2xl" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </AppShell>
  );
}

function SyncActivity() {
  return <SyncActivityInner />;
}

function AutoProgressCard({
  profile,
  patch,
}: {
  profile: import("@/lib/study").Profile | null;
  patch: (values: Record<string, unknown>) => void;
}) {
  const settings = autoProgressSettings(profile);
  const RULES: { key: AutoProgressRule; label: string }[] = [
    { key: "minutes", label: "Study minutes" },
    { key: "sessions", label: "Sessions" },
    { key: "manual", label: "Manual only" },
  ];
  return (
    <section>
      <SectionTitle>Chapter auto-progress</SectionTitle>
      <div className="card-soft grid gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-xs font-medium">Update chapters from focus sessions</Label>
            <p className="text-[11px] text-muted-foreground">
              Chapters advance automatically when you study them.
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => patch({ auto_progress_enabled: checked })}
          />
        </div>

        <div className="grid gap-1">
          <Label className="text-xs font-medium">Complete a chapter when it reaches</Label>
          <div className="flex gap-2">
            {RULES.map((rule) => (
              <button
                key={rule.key}
                onClick={() => patch({ auto_progress_rule: rule.key })}
                className={cn(
                  "flex-1 rounded-2xl px-2 py-2 text-[11px] font-semibold",
                  settings.rule === rule.key ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {rule.label}
              </button>
            ))}
          </div>
        </div>

        {settings.rule !== "manual" ? (
          <div className="grid gap-1">
            <Label>{settings.rule === "sessions" ? "Sessions needed" : "Minutes needed"}</Label>
            <Input
              type="number"
              min={1}
              key={`${settings.rule}-${profile?.updated_at ?? ""}`}
              defaultValue={settings.rule === "sessions" ? settings.sessions : settings.minutes}
              onBlur={(e) => {
                const value = Number(e.target.value);
                if (!Number.isFinite(value) || value <= 0) return;
                patch(
                  settings.rule === "sessions"
                    ? { auto_complete_sessions: value }
                    : { auto_complete_minutes: value },
                );
              }}
              className="num rounded-2xl"
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs font-medium">Mark as In progress on first session</Label>
          <Switch
            checked={settings.startInProgress}
            onCheckedChange={(checked) => patch({ auto_start_in_progress: checked })}
          />
        </div>
      </div>
    </section>
  );
}

function SyncActivityInner() {
  const resolutions = useSyncResolutions();
  const pending = usePendingCount();
  return (
    <section>
      <SectionTitle>Sync activity</SectionTitle>
      <div className="card-soft grid gap-2 p-4">
        <p className="text-xs text-muted-foreground">
          {pending > 0
            ? `${pending} change${pending > 1 ? "s" : ""} waiting to sync.`
            : "Everything is synced."}
        </p>
        {resolutions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No conflicts so far.</p>
        ) : (
          <>
            {[...resolutions].reverse().slice(0, 8).map((item) => (
              <div key={item.id + item.at} className="rounded-2xl bg-muted/50 px-3 py-2">
                <p className="text-xs font-semibold capitalize">{item.outcome}</p>
                <p className="text-[11px] text-muted-foreground">{item.message}</p>
                <p className="num text-[10px] text-muted-foreground">
                  {new Date(item.at).toLocaleString()}
                </p>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="rounded-2xl" onClick={clearResolutions}>
              Clear log
            </Button>
          </>
        )}
      </div>
      </section>
  );
}
