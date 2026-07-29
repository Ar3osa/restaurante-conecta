import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConcelhoSelect } from "@/components/ConcelhoSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIPOS_NEGOCIO } from "@/lib/pt";
import { validarNif } from "@/lib/nif";
import { criarEmpresa, obterMinhaEmpresa } from "@/lib/empresa.functions";

export const Route = createFileRoute("/_authenticated/empresa/registo")({
  head: () => ({
    meta: [
      { title: "Registar restaurante ou bar — Mesa" },
      {
        name: "description",
        content: "Regista a tua casa com o NIF da empresa e começa a publicar turnos na Mesa.",
      },
      { property: "og:title", content: "Registar restaurante ou bar — Mesa" },
      { property: "og:description", content: "Regista a tua casa na Mesa com o NIF da empresa." },
    ],
  }),
  component: RegistoEmpresa,
});

function RegistoEmpresa() {
  const obter = useServerFn(obterMinhaEmpresa);
  const criar = useServerFn(criarEmpresa);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ["empresa"], queryFn: () => obter() });

  const [form, setForm] = useState({
    nome: "",
    nif: "",
    tipo: "restaurante",
    concelho: "",
    morada: "",
    descricao: "",
    responsavel: "",
    telefone: "",
  });

  useEffect(() => {
    const e = data?.empresa as Record<string, unknown> | null | undefined;
    if (!e) return;
    setForm((f) => ({
      ...f,
      nome: (e.nome as string) ?? "",
      nif: (e.nif as string) ?? "",
      tipo: (e.tipo as string) ?? "restaurante",
      concelho: (e.concelho as string) ?? "",
      morada: (e.morada as string) ?? "",
      descricao: (e.descricao as string) ?? "",
    }));
  }, [data]);

  const existente = !!data?.empresa;
  const nifValido = validarNif(form.nif);

  const gravar = useMutation({
    mutationFn: () =>
      criar({
        data: { ...form, tipo: form.tipo as "restaurante" },
      }),
    onSuccess: () => {
      toast.success(existente ? "Dados atualizados." : "Empresa registada.");
      queryClient.invalidateQueries();
      navigate({ to: "/empresa" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      titulo={existente ? "Dados da empresa" : "Registar a tua casa"}
      descricao="Pedimos o NIF para garantir que só há casas reais na plataforma."
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informação da empresa</CardTitle>
          <CardDescription>O NIF não é público — serve apenas para validação.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome do estabelecimento</Label>
            <Input
              value={form.nome}
              maxLength={100}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>NIF da empresa</Label>
            <Input
              value={form.nif}
              maxLength={9}
              inputMode="numeric"
              disabled={existente}
              onChange={(e) =>
                setForm({ ...form, nif: e.target.value.replace(/\D/g, "").slice(0, 9) })
              }
            />
            {form.nif.length === 9 && !nifValido && (
              <p className="text-xs text-destructive">Este NIF não é válido.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_NEGOCIO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
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
            <Label>Morada</Label>
            <Input
              value={form.morada}
              maxLength={160}
              onChange={(e) => setForm({ ...form, morada: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Descrição da casa</Label>
            <Textarea
              value={form.descricao}
              maxLength={600}
              rows={3}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input
              value={form.responsavel}
              maxLength={80}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone de contacto</Label>
            <Input
              value={form.telefone}
              maxLength={20}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              className="w-full"
              size="lg"
              onClick={() => gravar.mutate()}
              disabled={
                gravar.isPending ||
                !nifValido ||
                form.nome.trim().length < 2 ||
                form.concelho.length < 2 ||
                form.responsavel.trim().length < 2 ||
                form.telefone.trim().length < 6
              }
            >
              {existente ? "Guardar alterações" : "Registar empresa"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}