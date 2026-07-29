import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { comprarCreditos, historicoCreditos, obterMinhaEmpresa } from "@/lib/empresa.functions";

export const Route = createFileRoute("/_authenticated/empresa/creditos")({
  head: () => ({
    meta: [
      { title: "Créditos de contacto — Mesa" },
      {
        name: "description",
        content: "Compra créditos para desbloquear contactos de trabalhadores. 1 crédito = 1 €.",
      },
      { property: "og:title", content: "Créditos de contacto — Mesa" },
      { property: "og:description", content: "Gere os créditos da tua casa na Mesa." },
    ],
  }),
  component: Creditos,
});

const PACOTES = [
  { creditos: 5, destaque: false },
  { creditos: 15, destaque: true },
  { creditos: 40, destaque: false },
];

function Creditos() {
  const obter = useServerFn(obterMinhaEmpresa);
  const comprar = useServerFn(comprarCreditos);
  const historico = useServerFn(historicoCreditos);
  const queryClient = useQueryClient();

  const empresa = useQuery({ queryKey: ["empresa"], queryFn: () => obter() });
  const movimentos = useQuery({ queryKey: ["creditos-historico"], queryFn: () => historico() });

  const compra = useMutation({
    mutationFn: (creditos: number) => comprar({ data: { creditos } }),
    onSuccess: (r) => {
      toast.success(`Pagamento simulado concluído. Saldo: ${r.saldo} créditos.`);
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      titulo="Créditos de contacto"
      descricao="Cada contacto desbloqueado custa 1 crédito (1 €). Nunca pagas duas vezes pela mesma pessoa."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Saldo atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold">{empresa.data?.saldo ?? 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">créditos disponíveis</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Comprar créditos</CardTitle>
            <CardDescription>
              Modo de demonstração: o pagamento é simulado, não é cobrado nada.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {PACOTES.map((p) => (
              <div
                key={p.creditos}
                className={`rounded-lg border p-4 text-center ${
                  p.destaque ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                {p.destaque && (
                  <Badge className="mb-2" variant="default">
                    Mais escolhido
                  </Badge>
                )}
                <p className="text-3xl font-bold">{p.creditos}</p>
                <p className="mb-3 text-sm text-muted-foreground">{p.creditos} €</p>
                <Button
                  size="sm"
                  variant={p.destaque ? "default" : "outline"}
                  className="w-full"
                  onClick={() => compra.mutate(p.creditos)}
                  disabled={compra.isPending}
                >
                  Comprar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Movimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(movimentos.data ?? []).length === 0 && (
            <p className="py-6 text-center text-muted-foreground">Ainda não há movimentos.</p>
          )}
          {(movimentos.data ?? []).map((m) => {
            const mov = m as { id: string; tipo: string; creditos: number; created_at: string; descricao?: string };
            return (
              <div
                key={mov.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{mov.descricao || mov.tipo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(mov.created_at).toLocaleString("pt-PT")}
                  </p>
                </div>
                <span
                  className={mov.creditos > 0 ? "font-semibold text-primary" : "font-semibold"}
                >
                  {mov.creditos > 0 ? "+" : ""}
                  {mov.creditos}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </AppShell>
  );
}