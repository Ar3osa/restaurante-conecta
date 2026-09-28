import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/nova-palavra-passe")({
  head: () => ({
    meta: [
      { title: "Definir nova palavra-passe — Mesa" },
      { name: "description", content: "Define uma nova palavra-passe para a tua conta Mesa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NovaPalavraPasse,
});

type Estado = "a_validar" | "pronto" | "link_invalido";

function NovaPalavraPasse() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>("a_validar");
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    let vivo = true;

    // O link do email traz um token que o cliente Supabase troca por sessão
    // automaticamente ao carregar a página. Pode demorar uns instantes, por isso
    // ouvimos também as mudanças de estado em vez de decidir só na primeira leitura.
    const { data: subscricao } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!vivo) return;
      if (sessao) setEstado("pronto");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      if (data.session) {
        setEstado("pronto");
      } else {
        // Sem sessão passado um instante, o link expirou ou já foi usado.
        setTimeout(() => vivo && setEstado((e) => (e === "a_validar" ? "link_invalido" : e)), 1500);
      }
    });

    return () => {
      vivo = false;
      subscricao.subscription.unsubscribe();
    };
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmacao) {
      toast.error("As palavras-passe não coincidem.");
      return;
    }

    setAGuardar(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Palavra-passe alterada. Já podes entrar.");
      navigate({ to: "/auth", search: { modo: "entrar" }, replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível alterar a palavra-passe.";
      toast.error(
        msg.includes("should be different")
          ? "A nova palavra-passe tem de ser diferente da anterior."
          : msg,
      );
    } finally {
      setAGuardar(false);
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
          <CardTitle>Nova palavra-passe</CardTitle>
          <CardDescription>
            {estado === "pronto"
              ? "Escolhe uma palavra-passe nova para a tua conta."
              : estado === "a_validar"
                ? "A validar o link…"
                : "Este link já não é válido."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {estado === "a_validar" && <p className="text-sm text-muted-foreground">Um momento…</p>}

          {estado === "link_invalido" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Os links de recuperação expiram passado pouco tempo e só podem ser usados uma vez.
                Pede um novo para continuares.
              </p>
              <Button asChild className="w-full">
                <Link to="/auth" search={{ modo: "entrar" }}>
                  Pedir novo link
                </Link>
              </Button>
            </div>
          )}

          {estado === "pronto" && (
            <form onSubmit={guardar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova palavra-passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Pelo menos 6 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmacao">Confirmar palavra-passe</Label>
                <Input
                  id="confirmacao"
                  type="password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={aGuardar}>
                Guardar nova palavra-passe
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
