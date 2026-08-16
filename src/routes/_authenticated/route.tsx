import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAccount, useOutboxSync } from "@/lib/data";
import { isOnline } from "@/lib/offline";
import { TimerProvider } from "@/lib/timer";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // A stored session is enough to open the app — we only force the login
    // screen when there is genuinely nothing to restore. This keeps the app
    // usable offline and means the user logs in once per device.
    const { data: stored } = await supabase.auth.getSession();
    if (!isOnline()) {
      if (stored.session?.user) return { user: stored.session.user };
      throw redirect({ to: "/auth" });
    }
    const { data, error } = await supabase.auth.getUser();
    if (data.user) return { user: data.user };
    // Network/refresh hiccup: fall back to the stored session instead of
    // kicking a signed-in user back to the login page.
    if (error && stored.session?.user) return { user: stored.session.user };
    throw redirect({ to: "/auth" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const queryClient = useQueryClient();
  useOutboxSync();

  useEffect(() => {
    if (!isOnline()) return;
    bootstrapAccount()
      .then(() => queryClient.invalidateQueries())
      .catch(() => undefined);
  }, [queryClient]);

  return (
    <TimerProvider>
      <Outlet />
    </TimerProvider>
  );
}