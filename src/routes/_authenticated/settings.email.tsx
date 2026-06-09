import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { EmailTemplateSettings } from "@/components/certly/EmailTemplateSettings";

export const Route = createFileRoute("/_authenticated/settings/email")({
  component: SettingsEmailPage,
});

function SettingsEmailPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="max-w-[1100px] mx-auto px-8 py-5 flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Configurações
          </h1>
        </div>
      </header>
      <main className="max-w-[1100px] mx-auto px-8 py-8">
        <EmailTemplateSettings />
      </main>
    </div>
  );
}
