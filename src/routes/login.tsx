import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { FileBadge2, Loader2, Mail, Lock, User, Building2, IdCard, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Search = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: search.redirect ?? "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [nomeEscritorio, setNomeEscritorio] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session && !signupSuccess) navigate({ to: search.redirect ?? "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, search.redirect, signupSuccess]);

  const friendlyError = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes("invalid login") || m.includes("invalid credentials")) {
      return "E-mail ou senha incorretos. Por favor, tente novamente.";
    }
    if (m.includes("email not confirmed")) {
      return "Confirme seu e-mail antes de entrar.";
    }
    if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already")) {
      return "Este e-mail já está cadastrado. Tente fazer login.";
    }
    if (m.includes("password") && m.includes("6")) {
      return "A senha precisa ter ao menos 6 caracteres.";
    }
    return msg;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!nome.trim() || !nomeEscritorio.trim() || !cnpjCpf.trim()) {
          throw new Error("Preencha todos os campos obrigatórios.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome: nome.trim(),
              nome_escritorio: nomeEscritorio.trim(),
              cnpj_cpf: cnpjCpf.trim(),
            },
          },
        });
        if (error) throw error;
        // Sign out so user lands on the login form for first access
        await supabase.auth.signOut();
        setSignupSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(friendlyError(err?.message ?? "Falha na autenticação"));
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    setSignupSuccess(false);
    setMode("signin");
    setPassword("");
    setNome("");
    setNomeEscritorio("");
    setCnpjCpf("");
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="h-11 w-11 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-sm">
            <FileBadge2 className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <span className="text-2xl font-semibold tracking-tight text-foreground lowercase">
            certly<span className="text-muted-foreground">.</span>
          </span>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_48px_-24px_rgba(15,23,42,0.12)]">
          {signupSuccess ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-7 w-7" strokeWidth={2} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Cadastro realizado com sucesso!
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                Agora você pode fazer o seu primeiro acesso.
              </p>
              <button
                onClick={goToLogin}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium shadow-sm hover:opacity-90 active:scale-[0.99] transition"
              >
                Ir para o Login
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {mode === "signin" ? "Acesse sua conta" : "Crie sua conta"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie certificados digitais do seu escritório.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <>
                    <Field icon={<User className="h-4 w-4" />} label="Nome completo">
                      <input
                        type="text"
                        autoComplete="name"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        required
                      />
                    </Field>
                    <Field icon={<Building2 className="h-4 w-4" />} label="Nome do escritório">
                      <input
                        type="text"
                        value={nomeEscritorio}
                        onChange={(e) => setNomeEscritorio(e.target.value)}
                        placeholder="Contabilidade Exemplo"
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        required
                      />
                    </Field>
                    <Field icon={<IdCard className="h-4 w-4" />} label="CNPJ ou CPF do escritório">
                      <input
                        type="text"
                        value={cnpjCpf}
                        onChange={(e) => setCnpjCpf(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        required
                      />
                    </Field>
                  </>
                )}
                <Field icon={<Mail className="h-4 w-4" />} label="E-mail">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@escritorio.com.br"
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    required
                  />
                </Field>
                <Field icon={<Lock className="h-4 w-4" />} label="Senha">
                  <input
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    minLength={6}
                    required
                  />
                </Field>

                {errorMsg && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium shadow-sm hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Entrar" : "Cadastrar"}
                </button>
              </form>

              <button
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setErrorMsg(null);
                }}
                className="mt-5 w-full text-center text-xs text-muted-foreground hover:text-foreground transition"
              >
                {mode === "signin"
                  ? "Ainda não tem conta? Criar agora"
                  : "Já tem conta? Entrar"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-secondary/70 border border-border/60 focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/40 transition">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </div>
    </label>
  );
}
