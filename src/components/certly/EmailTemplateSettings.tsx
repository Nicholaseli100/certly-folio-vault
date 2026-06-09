import { useRef, useState } from "react";
import { toast } from "sonner";
import { Mail, Save, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const DEFAULT_SUBJECT = "Aviso: seu certificado digital expira em 30 dias";
const DEFAULT_BODY =
  "Olá {{nome_cliente}}, aqui é da equipe do escritório {{nome_escritorio}}. Entramos em contato para lembrar que o seu certificado digital expira em 30 dias. Por favor, providencie a renovação para evitar bloqueios nas operações da sua empresa.";

const VARIABLES = [
  { tag: "{{nome_cliente}}", label: "Nome do cliente" },
  { tag: "{{nome_escritorio}}", label: "Nome do escritório" },
];

const SAMPLE = {
  nome_cliente: "João Silva",
  nome_escritorio: "Escritório Contábil ABC",
};

function render(text: string) {
  return text
    .replaceAll("{{nome_cliente}}", SAMPLE.nome_cliente)
    .replaceAll("{{nome_escritorio}}", SAMPLE.nome_escritorio);
}

export function EmailTemplateSettings() {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [lastFocus, setLastFocus] = useState<"subject" | "body">("body");

  const insertVariable = (tag: string) => {
    if (lastFocus === "subject" && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? subject.length;
      const next = subject.slice(0, start) + tag + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + tag.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      const el = bodyRef.current;
      if (!el) return;
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? body.length;
      const next = body.slice(0, start) + tag + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + tag.length;
        el.setSelectionRange(pos, pos);
      });
    }
  };

  const handleSave = () => {
    toast.success("Template salvo com sucesso");
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Template de e-mail
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize a mensagem enviada aos seus clientes quando o certificado
            estiver próximo do vencimento.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar template
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Editor
            </CardTitle>
            <CardDescription>
              Use as variáveis para inserir dados dinâmicos do cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto do e-mail</Label>
              <Input
                id="subject"
                ref={subjectRef}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={() => setLastFocus("subject")}
                placeholder="Ex: Seu certificado expira em breve"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Mensagem</Label>
              <Textarea
                id="body"
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setLastFocus("body")}
                rows={12}
                className="resize-y min-h-[260px] leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Variáveis disponíveis
              </p>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertVariable(v.tag)}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground hover:text-background hover:border-foreground active:scale-[0.97]"
                    title={`Inserir ${v.label}`}
                  >
                    <span className="font-mono">{v.tag}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Clique em uma variável para inseri-la na posição do cursor.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              Pré-visualização em tempo real
            </CardTitle>
            <CardDescription>
              Exemplo com dados fictícios: {SAMPLE.nome_cliente} ·{" "}
              {SAMPLE.nome_escritorio}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/40 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Assunto
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5 break-words">
                  {render(subject) || (
                    <span className="text-muted-foreground italic">
                      (sem assunto)
                    </span>
                  )}
                </p>
              </div>
              <div className="px-4 py-5">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {render(body) || (
                    <span className="text-muted-foreground italic">
                      (mensagem vazia)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default EmailTemplateSettings;
