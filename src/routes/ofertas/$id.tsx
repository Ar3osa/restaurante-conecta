import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Clock, Euro, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { obterOferta } from "@/lib/publico.functions";
import { candidatar } from "@/lib/trabalhador.functions";
import { FUNCAO_LABEL, formatarData, formatarRemuneracao, type Funcao } from "@/lib/pt";
import { usePapeis } from "@/hooks/useAuth";

type Oferta = {
  id: string;
  titulo: string;
  funcao: string;
  concelho: string;
  data_turno: string;
  hora_inicio: string;
  hora_fim: string;
  remuneracao_min: number | null;
  remuneracao_max: number | null;
  descricao: string;
  created_at: string;
  businesses: { nome?: string; tipo?: string; concelho?: string } | null;
};

export const Route = createFileRoute("/ofertas/$id")({
  // Carregada no servidor para que os motores de busca e as pré-visualizações
  // de partilha (WhatsApp, LinkedIn) vejam a oferta já preenchida.
  loader: ({ params }) => obterOferta({ data: { id: params.id } }),
  head: ({ loaderData }) => {
    const o = loaderData as Oferta | null | undefined;
    if (!o) {
      return { meta: [{ title: "Oferta não encontrada — Mesa" }] };
    }

    const empresa = o.businesses?.nome ?? "Uma casa";
    const funcao = FUNCAO_LABEL[o.funcao as Funcao] ?? o.funcao;
    const salario = formatarRemuneracao(o.remuneracao_min, o.remuneracao_max);
    const descricao =
      `${funcao} em ${o.concelho}, ${formatarData(o.data_turno)}` +
      `${salario ? `, ${salario}` : ""}. ${o.descricao}`.slice(0, 200);

    // Dados estruturados JobPosting: é o que permite a oferta aparecer no
    // Google Jobs / "Empregos" em vez de ser só mais uma página.
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      title: o.titulo,
      description: o.descricao || descricao,
      datePosted: o.created_at,
      validThrough: `${o.data_turno}T23:59:59`,
      employmentType: "TEMPORARY",
      directApply: true,
      hiringOrganization: {
        "@type": "Organization",
        name: empresa,
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: o.concelho,
          addressCountry: "PT",
        },
      },
    };

    if (o.remuneracao_min != null || o.remuneracao_max != null) {
      jsonLd.baseSalary = {
        "@type": "MonetaryAmount",
        currency: "EUR",
        value: {
          "@type": "QuantitativeValue",
          ...(o.remuneracao_min != null ? { minValue: o.remuneracao_min } : {}),
          ...(o.remuneracao_max != null ? { maxValue: o.remuneracao_max } : {}),
          unitText: "HOUR",
        },
      };
    }

    return {
      meta: [
        { title: `${o.titulo} — ${o.concelho} — Mesa` },
        { name: "description", content: descricao },
        { property: "og:title", content: `${o.titulo} — ${o.concelho}` },
        { property: "og:description", content: descricao },
        { property: "og:type", content: "article" },
      ],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  component: DetalheOferta,
});

function DetalheOferta() {
  const oferta = Route.useLoaderData() as Oferta | null;
  const [dialogAberto, setDialogAberto] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const { user, eTrabalhador } = usePapeis();
  const navigate = useNavigate();
  const enviar = useServerFn(candidatar);

  const candidatura = useMutation({
    mutationFn: (jobId: string) => enviar({ data: { jobId, mensagem } }),
    onSuccess: () => {
      toast.success("Candidatura enviada.");
      setDialogAberto(false);
      setMensagem("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!oferta) {
    return (
      <AppShell titulo="Oferta não encontrada">
        <Card>
          <CardContent className="space-y-4 py-14 text-center">
            <p className="text-muted-foreground">
              Este turno já não está disponível — pode ter sido preenchido ou fechado.
            </p>
            <Button asChild>
              <Link to="/ofertas">Ver outros turnos</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  function abrirCandidatura() {
    if (!user) {
      navigate({ to: "/auth", search: { modo: "registo", papel: "trabalhador" } });
      return;
    }
    if (!eTrabalhador) {
      toast.error("Só contas de trabalhador se podem candidatar.");
      return;
    }
    setDialogAberto(true);
  }

  const salario = formatarRemuneracao(oferta.remuneracao_min, oferta.remuneracao_max);

  return (
    <AppShell titulo={oferta.titulo} descricao={oferta.businesses?.nome}>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/ofertas">
          <ArrowLeft className="mr-1 h-4 w-4" /> Todas as ofertas
        </Link>
      </Button>

      <Card className="max-w-2xl">
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-display text-xl font-bold">{oferta.titulo}</h2>
              {oferta.businesses?.nome && (
                <p className="text-sm text-muted-foreground">{oferta.businesses.nome}</p>
              )}
            </div>
            <Badge variant="secondary">{FUNCAO_LABEL[oferta.funcao as Funcao]}</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Detalhe icone={<MapPin className="h-4 w-4" />} rotulo="Concelho">
              {oferta.concelho}
            </Detalhe>
            <Detalhe icone={<CalendarDays className="h-4 w-4" />} rotulo="Data do turno">
              {formatarData(oferta.data_turno)}
            </Detalhe>
            <Detalhe icone={<Clock className="h-4 w-4" />} rotulo="Horário">
              {oferta.hora_inicio}–{oferta.hora_fim}
            </Detalhe>
            {salario && (
              <Detalhe icone={<Euro className="h-4 w-4" />} rotulo="Remuneração">
                {salario}
              </Detalhe>
            )}
          </div>

          {oferta.descricao && (
            <div>
              <p className="mb-1 text-sm font-medium">Descrição</p>
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {oferta.descricao}
              </p>
            </div>
          )}

          <Button size="lg" className="w-full sm:w-auto" onClick={abrirCandidatura}>
            Candidatar a este turno
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidatar a “{oferta.titulo}”</DialogTitle>
            <DialogDescription>
              Escreve uma mensagem curta à casa. O teu perfil segue em anexo.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            maxLength={500}
            rows={5}
            placeholder="Ex.: Tenho 3 anos de bar e estou disponível nesse horário."
          />
          <DialogFooter>
            <Button onClick={() => candidatura.mutate(oferta.id)} disabled={candidatura.isPending}>
              Enviar candidatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Detalhe({
  icone,
  rotulo,
  children,
}: {
  icone: React.ReactNode;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icone} {rotulo}
      </p>
      <p className="mt-1 font-medium">{children}</p>
    </div>
  );
}
