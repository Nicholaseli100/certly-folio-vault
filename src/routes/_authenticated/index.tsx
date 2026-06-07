import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud, Loader2, FileBadge2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/certly/Header";
import { CertificateList } from "@/components/certly/CertificateList";
import { SideDrawer } from "@/components/certly/SideDrawer";
import { type Certificate, getStatus } from "@/lib/certificates-data";
import { createEmptyCertificate, isNewCertificate } from "@/lib/certificate-draft";
import { encryptSenhaPfx, isEncryptedSenhaPfx } from "@/lib/tauri-crypto";
import { sincronizarCertificadosLocais, isWindowsLocalCert } from "@/lib/tauri-certs";
import { localToCertificate } from "@/lib/local-cert-mapper";
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
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("certificados")
        .select("*")
        .order("data_cadastro", { ascending: false });
        
      if (error) {
        if (error.message.includes("Auth session missing")) {
          window.location.href = "/login";
          return;
        }
        throw error;
      }

      let list = (data ?? []).map(rowToCert);

      try {
        const locals = await sincronizarCertificadosLocais();
        const mapped = locals.map(localToCertificate);
        const merged = new Map(list.map((c) => [c.id, c]));
        for (const cert of mapped) {
          merged.set(cert.id, cert);
        }
        list = Array.from(merged.values());
      } catch (err) {
        console.error("Erro na sincronização local:", err);
      }

      setCertificates(list);
    } catch (err: any) {
      toast.error("Erro ao carregar certificados.");
    } finally {
      // Bloqueio de segurança: sempre desliga o loading
      setLoading(false);
      setDragging(false);
      setUploading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Reset preventivo de estados ao montar
    setDragging(false);
    setUploading(false);
    setSyncing(false);
    fetchAll();
  }, []);

  const expiredCount = useMemo(() => certificates.filter((c) => getStatus(c.data_vencimento).kind === "expired").length, [certificates]);
  const warningCount = useMemo(() => certificates.filter((c) => getStatus(c.data_vencimento).kind === "warning").length, [certificates]);

  const visible = useMemo(() => {
    return certificates.filter((c) => {
      const s = getStatus(c.data_vencimento).kind;
      if (filter === "expired" && s !== "expired") return false;
      if (filter === "warning" && s !== "warning") return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!c.razao_social.toLowerCase().includes(q) && !c.cnpj_cpf.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [certificates, filter, query]);

  const handleImportFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileId = crypto.randomUUID();
        const path = `${userId}/${fileId}.pfx`;
        await supabase.storage.from("certificados-pfx").upload(path, file, { contentType: "application/x-pkcs12" });
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 365);
        await supabase.from("certificados").insert({
          user_id: userId,
          razao_social: file.name.replace(/\.pfx$/i, "") || "Novo Cliente",
          cnpj_cpf: "",
          data_emissao: new Date().toISOString().slice(0, 10),
          data_vencimento: vencimento.toISOString().slice(0, 10),
          senha_pfx: "",
          url_arquivo_pfx: path,
        });
      }
      toast.success(`${files.length} certificado(s) importado(s).`);
      await fetchAll();
    } catch (err: any) {
      toast.error("Falha ao importar.");
    } finally {
      setUploading(false);
    }
  };

  const handleSyncLocal = async () => {
    setSyncing(true);
    try {
      const locals = await sincronizarCertificadosLocais();
      const mapped = locals.map(localToCertificate);
      setCertificates((prev) => {
        const merged = new Map(prev.map((c) => [c.id, c]));
        for (const cert of mapped) merged.set(cert.id, cert);
        return Array.from(merged.values());
      });
      toast.success("Certificados locais sincronizados.");
    } catch (err: any) {
      toast.error("Falha ao sincronizar.");
    } finally {
      setSyncing(false);
    }
  };

  // ... (funções handleSave e handleDelete permanecem as mesmas)
  const handleSave = async (updated: Certificate) => {
    const isNew = isNewCertificate(updated);
    let senhaEncrypted = updated.senha_pfx;
    try {
      if (updated.senha_pfx.trim() && !isEncryptedSenhaPfx(updated.senha_pfx)) {
        senhaEncrypted = await encryptSenhaPfx(updated.senha_pfx);
      }
    } catch (err) { toast.error("Falha na criptografia."); return; }

    const payload = {
      razao_social: updated.razao_social.trim(),
      cnpj_cpf: updated.cnpj_cpf.trim(),
      data_emissao: updated.data_emissao || null,
      data_vencimento: updated.data_vencimento,
      senha_pfx: senhaEncrypted,
      nome_responsavel: updated.nome_responsavel.trim(),
      email_contato: updated.email_contato.trim(),
      whatsapp_contato: updated.whatsapp_contato.trim(),
      notificar_email: updated.notificar_email,
      notificar_whatsapp: updated.notificar_whatsapp,
    };

    if (isWindowsLocalCert(updated.id)) {
      setCertificates((prev) => prev.map((c) => (c.id === updated.id ? { ...updated, senha_pfx: senhaEncrypted } : c)));
      toast.success("Atualizado localmente.");
      return;
    }

    if (isNew) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { window.location.href = "/login"; return; }
      const { data, error } = await supabase.from("certificados").insert({ ...payload, user_id: userData.user.id }).select().single();
      if (error) { toast.error("Erro ao salvar."); return; }
      setCertificates((prev) => [rowToCert(data), ...prev]);
    } else {
      const { error } = await supabase.from("certificados").update(payload).eq("id", updated.id);
      if (error) { toast.error("Erro ao salvar."); return; }
      setCertificates((prev) => prev.map((c) => (c.id === updated.id ? { ...updated, senha_pfx: senhaEncrypted } : c)));
    }
    toast.success("Salvo com sucesso.");
  };

  const handleDelete = async (id: string) => {
    if (isWindowsLocalCert(id)) {
      setCertificates((prev) => prev.filter((c) => c.id !== id));
    } else {
      await supabase.from("certificados").delete().eq("id", id);
      setCertificates((prev) => prev.filter((c) => c.id !== id));
    }
    toast.success("Removido.");
  };

  return (
    <div className="min-h-screen bg-background"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleImportFiles(e.dataTransfer.files); }}
    >
      <Header total={certificates.length} expiredCount={expiredCount} warningCount={warningCount} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} onImport={handleSyncLocal} />
      <main className="max-w-[1400px] mx-auto px-8 py-8">
        {loading ? (
            <div className="mt-20 flex flex-col items-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-3" />
                <p>Carregando...</p>
            </div>
        ) : (
            <CertificateList certificates={visible} onOpen={setOpenCert} onDelete={handleDelete} />
        )}
      </main>
      <SideDrawer cert={openCert} onClose={() => setOpenCert(null)} onSave={handleSave} />
    </div>
  );
}

function EmptyState({ onSync, syncing, onManualAdd }: { onSync: () => void; syncing: boolean; onManualAdd: () => void; }) {
  return (
    <div className="mt-16 rounded-3xl border border-dashed border-border bg-card/50 px-10 py-16 flex flex-col items-center text-center">
      <h2 className="text-lg font-semibold text-foreground">Nenhum certificado</h2>
      <button onClick={onManualAdd} className="mt-4 px-4 py-2 rounded-full border">Manual</button>
      <button onClick={onSync} disabled={syncing} className="mt-2 px-4 py-2 rounded-full bg-foreground text-background">Sync</button>
    </div>
  );
}