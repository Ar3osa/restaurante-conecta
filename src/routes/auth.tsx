import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Papel = "trabalhador" | "empregador";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { modo?: "entrar" | "registo"; papel?: Papel } => ({
    modo: search.modo === "registo" ? ("registo" as const) : ("entrar" as const),
    papel:
      search.papel === "empregador"
        ? ("empregador" as Papel)
        : search.papel === "trabalhador"
          ? ("trabalhador" as Papel)
          : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — Mesa" },
      {
        name: "description",
        content:
          "Acede à Mesa como trabalhador da restauração ou como restaurante/bar. Entrada por email ou Google.",
      },
      { property: "og:title", content: "Entrar ou criar conta — Mesa" },
      { property: "og:description", content: "Acede à plataforma Mesa." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { modo, papel: papelInicial } = Route.useSearch();
  const navigate = useNavigate();
  const [registo, setRegisto] = useState(modo === "registo");
  const [papel, setPapel] = useState<Papel>(papelInicial ?? "trabalhador");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [aCarregar, setACarregar] = useState(false);
  const [recuperacaoAberta, setRecuperacaoAberta] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [aEnviarRecuperacao, setAEnviarRecuperacao] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void encaminhar();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function encaminhar() {
    const { data } = await supabase.from("user_roles").select("role");
    const papeis = (data ?? []).map((r) => r.role);
    if (papeis.includes("empregador")) return navigate({ to: "/empresa", replace: true });
    if (papeis.includes("trabalhador")) return navigate({ to: "/trabalhador", replace: true });
    navigate({
      to: papel === "empregador" ? "/empresa/registo" : "/trabalhador/perfil",
      replace: true,
    });
  }

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setACarregar(true);
    try {
      if (registo) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { nome } },
        });
        if (error) throw error;
        toast.success("Conta criada! Vamos completar o teu perfil.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta.");
      }
      await encaminhar();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ocorreu um erro.";
      toast.error(
        msg.includes("Invalid login credentials")
          ? "Email ou palavra-passe incorretos."
          : msg.includes("already registered")
            ? "Já existe uma conta com este email."
            : msg,
      );
    } finally {
      setACarregar(false);
    }
  }

  async function pedirRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    setAEnviarRecuperacao(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperacao, {
        redirectTo: `${window.location.origin}/nova-palavra-passe`,
      });
      if (error) throw error;
      // Não revelamos se o email existe ou não — a mensagem é a mesma nos dois casos.
      toast.success("Se existir uma conta com esse email, enviámos-te um link de recuperação.");
      setRecuperacaoAberta(false);
      setEmailRecuperacao("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o email.");
    } finally {
      setAEnviarRecuperacao(false);
    }
  }

  async function entrarComGoogle() {
    setACarregar(true);
    // Supabase redirects the whole page to Google and back — on success the
    // browser navigates away, so there is no local success branch here.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      setACarregar(false);
      toast.error("Não foi possível entrar com o Google.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/40 px-4 py-12">
      <Link to="/" className="mb-6 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <UtensilsCrossed className="h-5 w-5" />
        </span>
        <span className="text-display text-xl font-bold">Mesa</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{registo ? "Criar conta" : "Entrar"}</CardTitle>
          <CardDescription>
            {registo
              ? "Leva menos de um minuto. O perfil completa-se a seguir."
              : "Que bom ver-te outra vez."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Tabs
            value={registo ? "registo" : "entrar"}
            onValueChange={(v) => setRegisto(v === "registo")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="registo">Criar conta</TabsTrigger>
            </TabsList>
          </Tabs>

          {registo && (
            <div className="space-y-2">
              <Label>Vou usar a Mesa como</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "trabalhador" as const, t: "Trabalhador" },
                  { v: "empregador" as const, t: "Restaurante / bar" },
                ].map((op) => (
                  <button
                    key={op.v}
                    type="button"
                    onClick={() => setPapel(op.v)}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                      papel === op.v
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {op.t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submeter} className="space-y-4">
            {registo && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {!registo && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => {
                  setEmailRecuperacao(email);
                  setRecuperacaoAberta(true);
                }}
              >
                Esqueci-me da palavra-passe
              </button>
            )}
            <Button type="submit" className="w-full" disabled={aCarregar}>
              {registo ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <div className="relative text-center">
            <span className="relative z-10 bg-card px-3 text-xs uppercase tracking-wide text-muted-foreground">
              ou
            </span>
            <span className="absolute left-0 top-1/2 h-px w-full bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={entrarComGoogle}
            disabled={aCarregar}
          >
            Continuar com Google
          </Button>
        </CardContent>
      </Card>

      <Dialog open={recuperacaoAberta} onOpenChange={setRecuperacaoAberta}>
        <DialogContent>
          <form onSubmit={pedirRecuperacao}>
            <DialogHeader>
              <DialogTitle>Recuperar palavra-passe</DialogTitle>
              <DialogDescription>
                Escreve o teu email e enviamos-te um link para definires uma nova palavra-passe.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="email-recuperacao">Email</Label>
              <Input
                id="email-recuperacao"
                type="email"
                value={emailRecuperacao}
                onChange={(e) => setEmailRecuperacao(e.target.value)}
                maxLength={255}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={aEnviarRecuperacao}>
                Enviar link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
