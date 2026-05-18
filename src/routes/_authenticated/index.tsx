import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud, Loader2, FileBadge2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/certly/Header";
import { CertificateList } from "@/components/certly/CertificateList";
import { SideDrawer } from "@/components/certly/SideDrawer";
import { type Certificate, getStatus } from "@/lib/certificates-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  component: CertlyApp,
});

type Filter = "all" | "expired" | "warning";

function rowToCert(r: any): Certificate {
  return {
    id: r.id,
    razao_social: r.razao_social ?? "",
    cnpj_cpf: r.cnpj_cpf ?? "",
    data_cadastro: r.data_cadastro ?? r.created_at,
    data_emissao: r.data_emissao ?? "",
    data_vencimento: r.data_vencimento ?? "",
    senha_pfx: r.senha_pfx ?? "",
    nome_responsavel: r.nome_responsavel ?? "",
    email_contato: r.email_contato ?? "",
    whatsapp_contato: r.whatsapp_contato ?? "",
    notificar_email: r.notificar_email ?? true,
    notificar_whatsapp: r.notificar_whatsapp ?? false,
  };
}

function CertlyApp() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openCert, setOpenCert] = useState<Certificate | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("certificados")
      .select("*")
      .order("data_cadastro", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar certificados: " + error.message);
      setCertificates([]);
    } else {
      setCertificates((data ?? []).map(rowToCert));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const expiredCount = useMemo(
    () => certificates.filter((c) => getStatus(c.data_vencimento).kind === "expired").length,
    [certificates],
  );
  const warningCount = useMemo(
    () => certificates.filter((c) => getStatus(c.data_vencimento).kind === "warning").length,
    [certificates],
  );

  const visible = useMemo(() => {
    return certificates.filter((c) => {
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

  const handleImportFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast.error("Sessão expirada.");
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileId = crypto.randomUUID();
        const path = `${userId}/${fileId}.pfx`;
        const { error: upErr } = await supabase.storage
          .from("certificados-pfx")
          .upload(path, file, { contentType: "application/x-pkcs12" });
        if (upErr) throw upErr;

        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 365);

        const { error: insErr } = await supabase.from("certificados").insert({
          user_id: userId,
          razao_social: file.name.replace(/\.pfx$/i, "") || "Novo Cliente",
          cnpj_cpf: "",
          data_emissao: new Date().toISOString().slice(0, 10),
          data_vencimento: vencimento.toISOString().slice(0, 10),
          senha_pfx: "",
          url_arquivo_pfx: path,
        });
        if (insErr) throw insErr;
      }
      toast.success(`${files.length} certificado(s) sincronizado(s).`);
      await fetchAll();
    } catch (err: any) {
      toast.error("Falha ao importar: " + (err?.message ?? "erro desconhecido"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (updated: Certificate) => {
    const { error } = await supabase
      .from("certificados")
      .update({
        razao_social: updated.razao_social,
        cnpj_cpf: updated.cnpj_cpf,
        data_emissao: updated.data_emissao || null,
        data_vencimento: updated.data_vencimento,
        senha_pfx: updated.senha_pfx,
        nome_responsavel: updated.nome_responsavel,
        email_contato: updated.email_contato,
        whatsapp_contato: updated.whatsapp_contato,
        notificar_email: updated.notificar_email,
        notificar_whatsapp: updated.notificar_whatsapp,
      })
      .eq("id", updated.id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    setCertificates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    toast.success("Alterações salvas.");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("certificados").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    setCertificates((prev) => prev.filter((c) => c.id !== id));
    toast.success("Certificado removido.");
  };

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
              {loading
                ? "Carregando…"
                : `${visible.length} ${visible.length === 1 ? "registro" : "registros"} · ordenados pelos mais recentes`}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Dica: duplo clique para editar · arraste um .pfx para qualquer lugar
          </p>
        </div>

        {loading ? (
          <div className="mt-20 flex flex-col items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mb-3" />
            <p className="text-sm">Carregando certificados…</p>
          </div>
        ) : certificates.length === 0 ? (
          <EmptyState onImport={() => fileRef.current?.click()} />
        ) : (
          <CertificateList
            certificates={visible}
            onOpen={setOpenCert}
            onDelete={handleDelete}
          />
        )}
      </main>

      <SideDrawer cert={openCert} onClose={() => setOpenCert(null)} onSave={handleSave} />

      {(dragging || uploading) && (
        <div className="fixed inset-0 z-50 bg-foreground/5 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-background rounded-3xl border-2 border-dashed border-foreground/30 px-12 py-10 shadow-2xl flex flex-col items-center gap-3">
            {uploading ? (
              <Loader2 className="h-10 w-10 text-foreground animate-spin" />
            ) : (
              <UploadCloud className="h-10 w-10 text-foreground" />
            )}
            <p className="text-lg font-semibold text-foreground">
              {uploading ? "Enviando arquivos…" : "Solte para importar"}
            </p>
            <p className="text-sm text-muted-foreground">
              Aceita arquivos .pfx de certificados digitais
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="mt-16 rounded-3xl border border-dashed border-border bg-card/50 px-10 py-16 flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <FileBadge2 className="h-6 w-6 text-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        Nenhum certificado cadastrado
      </h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Sincronize seus primeiros arquivos .pfx para começar a gerenciar os
        certificados digitais do seu escritório.
      </p>
      <button
        onClick={onImport}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium shadow-sm hover:opacity-90 active:scale-[0.98] transition"
      >
        <UploadCloud className="h-4 w-4" />
        Sincronizar certificados
      </button>
    </div>
  );
}
