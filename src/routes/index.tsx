import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud } from "lucide-react";
import { Header } from "@/components/certly/Header";
import { CertificateList } from "@/components/certly/CertificateList";
import { SideDrawer } from "@/components/certly/SideDrawer";
import {
  type Certificate,
  getStatus,
  seedCertificates,
} from "@/lib/certificates-data";

export const Route = createFileRoute("/")({
  component: CertlyApp,
});

type Filter = "all" | "expired" | "warning";

function CertlyApp() {
  const [certificates, setCertificates] = useState<Certificate[]>(seedCertificates);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openCert, setOpenCert] = useState<Certificate | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const expiredCount = useMemo(
    () => certificates.filter((c) => getStatus(c.data_vencimento).kind === "expired").length,
    [certificates],
  );
  const warningCount = useMemo(
    () => certificates.filter((c) => getStatus(c.data_vencimento).kind === "warning").length,
    [certificates],
  );

  const visible = useMemo(() => {
    const sorted = [...certificates].sort(
      (a, b) => new Date(b.data_cadastro).getTime() - new Date(a.data_cadastro).getTime(),
    );
    return sorted.filter((c) => {
      const s = getStatus(c.data_vencimento).kind;
      if (filter === "expired" && s !== "expired") return false;
      if (filter === "warning" && s !== "warning") return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !c.razao_social.toLowerCase().includes(q) &&
          !c.cnpj_cpf.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [certificates, filter, query]);

  const handleImportFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const now = new Date();
    const newCerts: Certificate[] = Array.from(files).map((f, i) => ({
      id: crypto.randomUUID(),
      razao_social: f.name.replace(/\.pfx$/i, "") || "Novo Cliente",
      cnpj_cpf: "00.000.000/0000-00",
      data_cadastro: new Date(now.getTime() + i).toISOString(),
      data_emissao: new Date().toISOString().slice(0, 10),
      data_vencimento: new Date(now.getTime() + 365 * 86400000).toISOString().slice(0, 10),
      senha_pfx: "",
      nome_responsavel: "—",
      email_contato: "",
      whatsapp_contato: "",
      notificar_email: true,
      notificar_whatsapp: false,
    }));
    setCertificates((prev) => [...newCerts, ...prev]);
  };

  const handleSave = (updated: Certificate) =>
    setCertificates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

  const handleDelete = (id: string) =>
    setCertificates((prev) => prev.filter((c) => c.id !== id));

  return (
    <div
      className="min-h-screen bg-background"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleImportFiles(e.dataTransfer.files);
      }}
    >
      <Header
        total={certificates.length}
        expiredCount={expiredCount}
        warningCount={warningCount}
        filter={filter}
        setFilter={setFilter}
        query={query}
        setQuery={setQuery}
        onImport={() => fileRef.current?.click()}
      />

      <input
        ref={fileRef}
        type="file"
        accept=".pfx"
        multiple
        className="hidden"
        onChange={(e) => handleImportFiles(e.target.files)}
      />

      <main className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Certificados
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {visible.length} {visible.length === 1 ? "registro" : "registros"} ·
              ordenados pelos mais recentes
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Dica: duplo clique para editar · arraste um .pfx para qualquer lugar
          </p>
        </div>

        <CertificateList
          certificates={visible}
          onOpen={setOpenCert}
          onDelete={handleDelete}
        />
      </main>

      <SideDrawer cert={openCert} onClose={() => setOpenCert(null)} onSave={handleSave} />

      {/* Drag & drop overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-foreground/5 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-background rounded-3xl border-2 border-dashed border-foreground/30 px-12 py-10 shadow-2xl flex flex-col items-center gap-3">
            <UploadCloud className="h-10 w-10 text-foreground" />
            <p className="text-lg font-semibold text-foreground">Solte para importar</p>
            <p className="text-sm text-muted-foreground">
              Aceita arquivos .pfx de certificados digitais
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
