import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAccount } from "@/lib/data";
import { TimerProvider } from "@/lib/timer";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const queryClient = useQueryClient();

  useEffect(() => {
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