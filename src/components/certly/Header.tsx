import { Search, RefreshCw, LogOut, Camera, Loader2, User, Building2, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        {/* Logo — ultra minimal, Apple-inspired */}
        <Link to="/" className="flex items-center gap-2.5 min-w-fit group">
          <CertlyMark />
          <div className="flex items-baseline gap-2.5">
            <span
              className="text-[19px] font-semibold tracking-[-0.025em] text-foreground lowercase"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", system-ui, sans-serif',
              }}
            >
              certly
            </span>
            <span className="text-[11px] text-muted-foreground/70 tabular-nums tracking-tight">
              {total}
            </span>
          </div>
        </Link>

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

        {/* Search + Import + Avatar */}
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
            Sincronizar
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

/* Refined monochrome logo mark — abstract certificate seal */
function CertlyMark() {
  return (
    <div className="h-8 w-8 rounded-[10px] bg-foreground text-background flex items-center justify-center shadow-[0_1px_2px_rgba(15,23,42,0.12)] group-hover:scale-[1.03] transition">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[15px] w-[15px]"
        strokeWidth={2}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    </div>
  );
}

function StatusDot({ kind, count }: { kind: CertStatus; count: number }) {
  if (count === 0) return null;
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
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleAvatarFile(e.target.files?.[0]);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-secondary/80 transition ring-1 ring-transparent hover:ring-border/60"
            aria-label="Menu do usuário"
          >
            <span className="relative h-8 w-8 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-semibold overflow-hidden ring-1 ring-border/60">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
              {uploading && (
                <span className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 text-background animate-spin" />
                </span>
              )}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-64 rounded-2xl p-1.5 border-border/60 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)]"
        >
          <DropdownMenuLabel className="px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Conectado como
            </div>
            <div className="text-sm font-medium text-foreground truncate mt-0.5">
              {email ?? "—"}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={() => fileRef.current?.click()}
            className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-secondary"
          >
            <Camera className="h-4 w-4 mr-2.5 text-muted-foreground" />
            <span className="text-sm">Alterar foto de perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-secondary"
          >
            <Link to="/">
              <User className="h-4 w-4 mr-2.5 text-muted-foreground" />
              <span className="text-sm">Minha Conta</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-secondary"
          >
            <Link to="/settings/email">
              <Building2 className="h-4 w-4 mr-2.5 text-muted-foreground" />
              <span className="text-sm">Configurações do Escritório</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={logout}
            className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-rose-50 focus:text-rose-700 text-rose-600"
          >
            <LogOut className="h-4 w-4 mr-2.5" />
            <span className="text-sm font-medium">Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
