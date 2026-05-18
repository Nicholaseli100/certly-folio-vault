import { useEffect, useState } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  // MOCK: auth check disabled for preview testing
  beforeLoad: async () => {},
  component: AuthedLayout,
});

function AuthedLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {});
    setReady(true);
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!ready) return null;
  return <Outlet />;
}
