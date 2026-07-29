import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConcelhoSelect } from "@/components/ConcelhoSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FUNCOES, type Funcao } from "@/lib/pt";
import { criarOferta } from "@/lib/empresa.functions";

export const Route = createFileRoute("/_authenticated/empresa/nova-oferta")({
  head: () => ({
    meta: [
      { title: "Publicar turno — Mesa" },
      {
        name: "description",
        content: "Publica a necessidade de um turno com data, horário e remuneração.",
      },
      { property: "og:title", content: "Publicar turno — Mesa" },
      { property: "og:description", content: "Publica um turno para a tua casa na Mesa." },
    ],
  }),
  component: NovaOferta,
});

function NovaOferta() {
  const criar = useServerFn(criarOferta);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    titulo: "",
    funcao: "servico_mesa" as Funcao,
    concelho: "",
    dataTurno: "",
    horaInicio: "19:00",
    horaFim: "23:00",
    remuneracao: "",
    descricao: "",
  });

  const publicar = useMutation({
    mutationFn: () =>
      criar({
        data: {
          ...form,
          remuneracao: form.remuneracao ? Number(form.remuneracao) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Turno publicado.");
      queryClient.invalidateQueries();
      navigate({ to: "/empresa" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valido =
    form.titulo.trim().length >= 3 && form.concelho.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(form.dataTurno);

  return (
    <AppShell titulo="Publicar turno" descricao="Publicar turnos é gratuito.">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Detalhes do turno</CardTitle>
          <CardDescription>Quanto mais claro, melhores candidaturas recebes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Título</Label>
            <Input
              value={form.titulo}
              maxLength={100}
              placeholder="Ex.: Bartender para sábado à noite"
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <Select
              value={form.funcao}
              onValueChange={(v) => setForm({ ...form, funcao: v as Funcao })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNCOES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Concelho</Label>
            <ConcelhoSelect
              value={form.concelho}
              placeholder="Escolher concelho"
              onChange={(v) => setForm({ ...form, concelho: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>Data do turno</Label>
            <Input
              type="date"
              value={form.dataTurno}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, dataTurno: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Remuneração (€ por turno)</Label>
            <Input
              type="number"
              min={0}
              value={form.remuneracao}
              placeholder="Opcional"
              onChange={(e) => setForm({ ...form, remuneracao: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Hora de início</Label>
            <Input
              type="time"
              value={form.horaInicio}
              onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Hora de fim</Label>
            <Input
              type="time"
              value={form.horaFim}
              onChange={(e) => setForm({ ...form, horaFim: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.descricao}
              maxLength={800}
              rows={4}
              placeholder="O que é preciso, experiência desejada, farda, etc."
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              className="w-full"
              size="lg"
              onClick={() => publicar.mutate()}
              disabled={!valido || publicar.isPending}
            >
              Publicar turno
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}