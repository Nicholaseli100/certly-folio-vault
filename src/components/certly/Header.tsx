import { Search, Plus, FileBadge2 } from "lucide-react";
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
            <FileBadge2 className="h-4.5 w-4.5" strokeWidth={2.2} />
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
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Importar Certificado
          </button>
        </div>
      </div>
    </header>
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
