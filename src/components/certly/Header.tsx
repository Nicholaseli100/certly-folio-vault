import { Search, RefreshCw, LogOut, Camera, Loader2, Settings } from "lucide-react";
import cerlyLogo from "@/assets/cerly-logo.png";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "@tanstack/react-router";
import type { CertStatus } from "@/lib/certificates-data";

type Filter = "all" | "expired" | "warning";

type Props = {
  total: number;
  expiredCount: number;
  warningCount: number;
  filter: Filter;
  setFilter: (f: Filter) => void;
  query: string;
  setQuery: (q: string) => void;
  onImport: () => void;
};

const tabBase =
  "px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2";

export function Header({
  total,
  expiredCount,
  warningCount,
  filter,
  setFilter,
  query,
  setQuery,
  onImport,
}: Props) {
  const isActive = (f: Filter) => filter === f;

  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="max-w-[1400px] mx-auto px-8 py-5 flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3 min-w-fit">
          <div className="h-9 w-9 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-sm">
            <FileBadge2 className="h-4 w-4" strokeWidth={2.2} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-foreground lowercase">
              certly<span className="text-muted-foreground">.</span>
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {total} certificados
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 flex justify-center">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-secondary/80 border border-border/50">
            <button
              onClick={() => setFilter("all")}
              className={`${tabBase} ${
                isActive("all")
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter("expired")}
              className={`${tabBase} ${
                isActive("expired")
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Vencidos
              <StatusDot kind="expired" count={expiredCount} />
            </button>
            <button
              onClick={() => setFilter("warning")}
              className={`${tabBase} ${
                isActive("warning")
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              A Vencer
              <StatusDot kind="warning" count={warningCount} />
            </button>
          </div>
        </div>

        {/* Search + Import */}
        <div className="flex items-center gap-3 min-w-fit">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou CNPJ…"
              className="pl-10 pr-4 py-2 w-72 rounded-full bg-secondary/80 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:bg-background transition"
            />
          </div>
          <button
            onClick={onImport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium shadow-sm hover:opacity-90 active:scale-[0.98] transition"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.4} />
            Sincronizar Certificados
          </button>
          <Link
            to="/settings/email"
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            title="Configurações"
            aria-label="Configurações"
            activeProps={{ className: "h-9 w-9 rounded-full flex items-center justify-center text-foreground bg-secondary transition" }}
          >
            <Settings className="h-4 w-4" />
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function StatusDot({ kind, count }: { kind: CertStatus; count: number }) {
  const color =
    kind === "expired"
      ? "bg-rose-500 text-white"
      : kind === "warning"
        ? "bg-amber-400 text-amber-950"
        : "bg-emerald-500 text-white";
  return (
    <span
      className={`${color} text-[10px] font-semibold rounded-full min-w-5 h-5 px-1.5 inline-flex items-center justify-center tabular-nums`}
    >
      {count}
    </span>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("perfis_usuarios")
      .select("url_foto_perfil")
      .eq("id", uid)
      .maybeSingle();
    setAvatarUrl(data?.url_foto_perfil ?? null);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
      if (data.user?.id) loadProfile(data.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
      if (session?.user?.id) loadProfile(session.user.id);
      else setAvatarUrl(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const initial = email?.[0]?.toUpperCase() ?? "?";

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file || !userId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from("perfis_usuarios")
        .update({ url_foto_perfil: url })
        .eq("id", userId);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      toast.success("Foto de perfil atualizada.");
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + (err?.message ?? "desconhecido"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 pl-3 ml-1 border-l border-border/60">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleAvatarFile(e.target.files?.[0])}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="group relative h-8 w-8 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-semibold overflow-hidden ring-1 ring-border/60 hover:ring-foreground/30 transition"
        title={email ? `${email} · alterar foto` : "Alterar foto"}
        aria-label="Alterar foto de perfil"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
        <span className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 text-background animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5 text-background" />
          )}
        </span>
      </button>
      <button
        onClick={logout}
        className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition"
        title="Sair"
        aria-label="Sair"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
