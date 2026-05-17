import { useEffect, useState } from "react";
import { X, Building2, ShieldCheck, UserRound, Bell } from "lucide-react";
import { type Certificate, formatDateBR, getStatus } from "@/lib/certificates-data";

type Props = {
  cert: Certificate | null;
  onClose: () => void;
  onSave: (c: Certificate) => void;
};

export function SideDrawer({ cert, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Certificate | null>(cert);

  useEffect(() => {
    setDraft(cert);
  }, [cert]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = Boolean(cert);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-foreground/10 backdrop-blur-[2px] z-30 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-[35vw] min-w-[460px] bg-background z-40 shadow-[-20px_0_60px_-20px_rgba(15,23,42,0.18)] border-l border-border/60 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {draft && <DrawerContent draft={draft} setDraft={setDraft} onClose={onClose} onSave={onSave} />}
      </aside>
    </>
  );
}

function DrawerContent({
  draft,
  setDraft,
  onClose,
  onSave,
}: {
  draft: Certificate;
  setDraft: (c: Certificate) => void;
  onClose: () => void;
  onSave: (c: Certificate) => void;
}) {
  const status = getStatus(draft.data_vencimento);
  const statusColor =
    status.kind === "regular"
      ? "bg-emerald-500"
      : status.kind === "warning"
        ? "bg-amber-500"
        : "bg-rose-500";

  const update = <K extends keyof Certificate>(key: K, value: Certificate[K]) =>
    setDraft({ ...draft, [key]: value });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-7 pt-6 pb-5 border-b border-border/60">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${statusColor}`} />
              {status.label}
            </div>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground truncate">
              {draft.razao_social}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 tabular-nums">{draft.cnpj_cpf}</p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8">
        <Section icon={<Building2 className="h-4 w-4" />} title="Dados do Cliente">
          <Field label="Razão Social" value={draft.razao_social} onChange={(v) => update("razao_social", v)} />
          <Field label="CNPJ / CPF" value={draft.cnpj_cpf} onChange={(v) => update("cnpj_cpf", v)} />
        </Section>

        <Section icon={<ShieldCheck className="h-4 w-4" />} title="Certificado Digital">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Emissão"
              type="date"
              value={draft.data_emissao}
              onChange={(v) => update("data_emissao", v)}
            />
            <Field
              label="Vencimento"
              type="date"
              value={draft.data_vencimento}
              onChange={(v) => update("data_vencimento", v)}
            />
          </div>
          <Field
            label="Senha (.pfx)"
            value={draft.senha_pfx}
            onChange={(v) => update("senha_pfx", v)}
            mono
          />
          <p className="text-xs text-muted-foreground">
            Cadastrado em {formatDateBR(draft.data_cadastro)}
          </p>
        </Section>

        <Section icon={<UserRound className="h-4 w-4" />} title="Contato">
          <Field
            label="Responsável"
            value={draft.nome_responsavel}
            onChange={(v) => update("nome_responsavel", v)}
          />
          <Field
            label="E-mail"
            value={draft.email_contato}
            onChange={(v) => update("email_contato", v)}
          />
          <Field
            label="WhatsApp"
            value={draft.whatsapp_contato}
            onChange={(v) => update("whatsapp_contato", v)}
          />
        </Section>

        <Section icon={<Bell className="h-4 w-4" />} title="Notificações">
          <Toggle
            label="Avisar por e-mail"
            checked={draft.notificar_email}
            onChange={(v) => update("notificar_email", v)}
          />
          <Toggle
            label="Avisar por WhatsApp"
            checked={draft.notificar_whatsapp}
            onChange={(v) => update("notificar_whatsapp", v)}
          />
        </Section>
      </div>

      {/* Footer */}
      <div className="px-7 py-4 border-t border-border/60 flex justify-end gap-2 bg-background">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-secondary transition"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            onSave(draft);
            onClose();
          }}
          className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-medium shadow-sm hover:opacity-90 active:scale-[0.98] transition"
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
        {icon}
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full px-3.5 py-2.5 rounded-xl bg-secondary/60 border border-border/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:bg-background transition ${
          mono ? "font-mono tracking-tight" : ""
        }`}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-foreground">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${
          checked ? "bg-foreground" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
