import { useState } from "react";
import { Download, ClipboardCopy, Check, Trash2 } from "lucide-react";
import { type Certificate, getStatus, formatDateBR } from "@/lib/certificates-data";

type Props = {
  certificates: Certificate[];
  onOpen: (c: Certificate) => void;
  onDelete: (id: string) => void;
};

export function CertificateList({ certificates, onOpen, onDelete }: Props) {
  if (certificates.length === 0) {
    return (
      <div className="mt-20 text-center">
        <p className="text-lg font-medium text-foreground">Nenhum certificado encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Ajuste os filtros ou importe um novo arquivo .pfx
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-card border border-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="grid grid-cols-[1fr_220px_180px_120px] px-6 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60 bg-secondary/40">
        <div>Razão Social</div>
        <div>CNPJ / CPF</div>
        <div>Vencimento</div>
        <div className="text-right">Status</div>
      </div>
      <ul className="divide-y divide-border/60">
        {certificates.map((c) => (
          <Row key={c.id} cert={c} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}

function Row({
  cert,
  onOpen,
  onDelete,
}: {
  cert: Certificate;
  onOpen: (c: Certificate) => void;
  onDelete: (id: string) => void;
}) {
  const status = getStatus(cert.data_vencimento);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(cert.senha_pfx);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([`fake pfx for ${cert.razao_social}`], {
      type: "application/x-pkcs12",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cert.razao_social.replace(/\s+/g, "_")}.pfx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    onDelete(cert.id);
  };

  return (
    <li
      onDoubleClick={() => onOpen(cert)}
      className="group grid grid-cols-[1fr_220px_180px_120px] items-center px-6 py-4 hover:bg-secondary/50 transition cursor-pointer relative"
    >
      <div className="min-w-0">
        <div className="font-medium text-foreground truncate">{cert.razao_social}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {cert.nome_responsavel}
        </div>
      </div>
      <div className="text-sm text-muted-foreground tabular-nums">{cert.cnpj_cpf}</div>
      <div className="text-sm text-foreground tabular-nums">
        {formatDateBR(cert.data_vencimento)}
      </div>
      <div className="flex justify-end">
        <StatusBadge status={status} />
      </div>

      {/* Hover actions */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition bg-card/95 backdrop-blur pl-3">
        <ActionButton title="Baixar .pfx" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </ActionButton>
        <ActionButton title={copied ? "Copiado!" : "Copiar senha"} onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <ClipboardCopy className="h-4 w-4" />
          )}
        </ActionButton>
        <ActionButton
          title={confirming ? "Clique novamente para confirmar" : "Remover"}
          onClick={handleDelete}
          danger={confirming}
        >
          <Trash2 className="h-4 w-4" />
        </ActionButton>
      </div>
    </li>
  );
}

function ActionButton({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-9 w-9 rounded-xl flex items-center justify-center transition ${
        danger
          ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: ReturnType<typeof getStatus>;
}) {
  const styles = {
    regular: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
    expired: "bg-rose-50 text-rose-700 ring-rose-200",
  }[status.kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${styles}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status.kind === "regular"
            ? "bg-emerald-500"
            : status.kind === "warning"
              ? "bg-amber-500"
              : "bg-rose-500"
        }`}
      />
      {status.label}
    </span>
  );
}
