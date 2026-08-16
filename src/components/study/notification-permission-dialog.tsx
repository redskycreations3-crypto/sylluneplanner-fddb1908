import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  checkPermission,
  getPrefs,
  requestPermission,
  setPrefs,
  syncStudyReminders,
} from "@/lib/notifications";

/**
 * In-app explanation shown once before the native Android permission dialog.
 * Tapping "Not Now" stops it from ever asking again automatically — the user
 * can still turn notifications on from Settings → Notifications.
 */
export function NotificationPermissionDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const prefs = getPrefs();
      if (prefs.promptSeen || prefs.promptDismissed) return;
      const permission = await checkPermission();
      if (!cancelled && permission === "prompt") setOpen(true);
    }, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  async function allow() {
    setPrefs({ promptSeen: true });
    const result = await requestPermission();
    if (result === "granted") {
      setPrefs({ master: true });
      await syncStudyReminders();
    }
    setOpen(false);
  }

  function notNow() {
    setPrefs({ promptSeen: true, promptDismissed: true, master: false });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : notNow())}>
      <DialogContent className="max-w-[22rem] rounded-3xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-primary-soft">
          <Bell className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-bold">Stay on track with Syllune</h2>
        <p className="text-sm text-muted-foreground">
          Allow notifications for study reminders, Pomodoro alerts, daily goals and important study
          updates.
        </p>
        <div className="grid gap-2 pt-1">
          <Button className="h-12 rounded-2xl" onClick={allow}>
            Allow Notifications
          </Button>
          <Button variant="ghost" className="rounded-2xl" onClick={notNow}>
            Not Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
