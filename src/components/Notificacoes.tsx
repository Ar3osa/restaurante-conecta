import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
  type Notificacao,
} from "@/lib/notificacoes.functions";
import { cn } from "@/lib/utils";

function quandoFoi(iso: string) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

export function Notificacoes() {
  const listar = useServerFn(listarNotificacoes);
  const marcarLida = useServerFn(marcarNotificacaoLida);
  const marcarTodas = useServerFn(marcarTodasNotificacoesLidas);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: () => listar(),
    // Atualiza sozinho enquanto o separador está aberto, para não ser preciso
    // recarregar a página para ver que houve resposta a uma candidatura.
    refetchInterval: 60_000,
    staleTime: 30_000,
    // Se a tabela ainda não existir (migração por aplicar) ou a rede falhar,
    // o sino fica simplesmente vazio em vez de insistir em pedidos falhados.
    retry: false,
  });

  const lida = useMutation({
    mutationFn: (id: string) => marcarLida({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes"] }),
  });

  const todasLidas = useMutation({
    mutationFn: () => marcarTodas(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes"] }),
  });

  const lista = data?.lista ?? [];
  const naoLidas = data?.naoLidas ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label={naoLidas > 0 ? `Notificações (${naoLidas} por ler)` : "Notificações"}
        >
          <Bell className="h-4 w-4" />
          {naoLidas > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notificações</p>
          {naoLidas > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => todasLidas.mutate()}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {lista.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Ainda não tens notificações.
            </p>
          )}

          {lista.map((n: Notificacao) => {
            const conteudo = (
              <div
                className={cn(
                  "border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/60",
                  !n.lida && "bg-primary/5",
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.lida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className={cn("min-w-0", n.lida && "pl-4")}>
                    <p className="text-sm font-medium">{n.titulo}</p>
                    {n.corpo && <p className="mt-0.5 text-xs text-muted-foreground">{n.corpo}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {quandoFoi(n.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );

            return n.url ? (
              <Link
                key={n.id}
                to={n.url}
                className="block"
                onClick={() => !n.lida && lida.mutate(n.id)}
              >
                {conteudo}
              </Link>
            ) : (
              <button
                key={n.id}
                type="button"
                className="block w-full"
                onClick={() => !n.lida && lida.mutate(n.id)}
              >
                {conteudo}
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
