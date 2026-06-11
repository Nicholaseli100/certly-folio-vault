import { useState } from "react";
import { Download, Loader2, ShieldAlert, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Certificate } from "@/lib/certificates-data";

type Props = {
  cert: Certificate;
  /** Mock toggle: when true, simulates a non-exportable certificate */
  nonExportable?: boolean;
  className?: string;
};

export function ExportCertificateButton({ cert, nonExportable, className }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nonExportable) {
      toast("Exportação indisponível", {
        description:
          "Este certificado foi instalado sem permissões de exportação e não pode ser clonado.",
        icon: <ShieldAlert className="h-4 w-4 text-amber-600" strokeWidth={2} />,
        className: "border border-border",
      });
      return;
    }
    setPassword(cert.senha_pfx ?? "");
    setOpen(true);
  };

  const handleExport = async () => {
    if (!password) {
      toast.error("Informe a senha do PFX para continuar.");
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      const blob = new Blob([`exported pfx for ${cert.razao_social}`], {
        type: "application/x-pkcs12",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cert.razao_social.replace(/\s+/g, "_")}.pfx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificado exportado com sucesso.");
      setOpen(false);
      setPassword("");
    } catch {
      toast.error("Não foi possível exportar o certificado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        title="Exportar certificado"
        className={
          "h-9 w-9 rounded-2xl flex items-center justify-center text-muted-foreground " +
          "transition-all duration-200 ease-out hover:bg-accent/50 hover:text-foreground " +
          "hover:scale-105 active:scale-100 " +
          (className ?? "")
        }
      >
        <Download className="h-4 w-4" strokeWidth={2} />
      </button>

      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="rounded-2xl border border-border/60 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur sm:max-w-md"
        >
          <DialogHeader>
            <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center mb-2">
              <Lock className="h-5 w-5 text-foreground" strokeWidth={2} />
            </div>
            <DialogTitle className="text-lg">Exportar certificado</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Confirme a senha do PFX de{" "}
              <span className="font-medium text-foreground">{cert.razao_social}</span> para
              gerar uma cópia exportável.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <Label htmlFor="pfx-pass" className="text-xs text-muted-foreground">
              Senha do PFX
            </Label>
            <Input
              id="pfx-pass"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-2xl h-10"
              onKeyDown={(e) => e.key === "Enter" && handleExport()}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="rounded-2xl px-4 h-10 text-sm font-medium text-foreground bg-secondary hover:bg-accent/60 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="rounded-2xl px-5 h-10 text-sm font-medium bg-foreground text-background shadow-sm hover:opacity-90 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-100 inline-flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <Download className="h-4 w-4" strokeWidth={2} />
              )}
              Exportar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
