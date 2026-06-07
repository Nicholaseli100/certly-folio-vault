import { useEffect, useState } from "react";
import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // Busca a sessão
    const { data, error } = await supabase.auth.getSession();
    
    // Se der erro de rede, ou se não houver sessão ativa, joga pro login
    if (error || !data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Fica vigiando: se o usuário deslogar, redireciona ele à força
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.navigate({ to: "/login" });
      }
    });
    
    setReady(true);
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ready) return null;

  return <Outlet />;
}