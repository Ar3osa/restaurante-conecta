import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Clock, MapPin, Star, Wallet } from "lucide-react";
import { Navbar, Footer } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FUNCOES } from "@/lib/pt";
import heroImg from "@/assets/hero-restauracao.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mesa — Trabalho na restauração em Portugal" },
      {
        name: "description",
        content:
          "Trabalhadores de bar, sala e backoffice encontram turnos. Restaurantes e bares encontram pessoal verificado no seu concelho.",
      },
      { property: "og:title", content: "Mesa — Trabalho na restauração em Portugal" },
      {
        property: "og:description",
        content: "Turnos, perfis avaliados e contactos diretos entre pessoal e casas.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">
              Feito para a restauração portuguesa
            </Badge>
            <h1 className="text-4xl font-bold leading-[1.05] md:text-6xl">
              O turno de hoje.
              <br />
              <span className="text-primary">A pessoa certa.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              A Mesa liga bartenders, empregados de mesa e backoffice a restaurantes e bares em
              todo o país. Perfis com competências avaliadas, concelhos de preferência e
              disponibilidade real.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/auth" search={{ modo: "registo", papel: "trabalhador" }}>
                  Sou trabalhador <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth" search={{ modo: "registo", papel: "empregador" }}>
                  Sou restaurante / bar
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link to="/auth" search={{ modo: "entrar" }}>
                  Já tenho conta · Entrar
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Conta de trabalhador sempre gratuita. As casas pagam apenas 1&nbsp;€ por contacto
              desbloqueado.
            </p>
          </div>

          <div className="relative">
            <img
              src={heroImg}
              width={1600}
              height={1104}
              alt="Bartender e empregado de mesa em serviço num restaurante português"
              className="rounded-xl border border-border object-cover shadow-lg"
            />
          </div>
        </section>

        <section className="border-y border-border/70 bg-secondary/40 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold md:text-3xl">Três funções, avaliadas a sério</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Cada trabalhador classifica-se de 1 a 5 estrelas nas competências que interessam ao
              serviço.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {FUNCOES.map((f) => (
                <Card key={f.value} className="border-border/70">
                  <CardContent className="pt-6">
                    <div className="mb-3 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <h3 className="text-lg font-semibold">{f.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.descricao}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">Para quem trabalha</h2>
              <ul className="mt-5 space-y-4">
                <Item icon={<Star className="h-4 w-4" />} titulo="Perfil com competências">
                  Bartender, serviço à mesa e backoffice classificados de 1 a 5 estrelas, mais a
                  tua experiência anterior.
                </Item>
                <Item icon={<MapPin className="h-4 w-4" />} titulo="Escolhes os concelhos">
                  Só apareces a casas nas zonas onde queres mesmo trabalhar.
                </Item>
                <Item icon={<Clock className="h-4 w-4" />} titulo="Turnos, não só empregos">
                  Candidata-te a turnos concretos, com data, horário e remuneração à vista.
                </Item>
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Para restaurantes e bares</h2>
              <ul className="mt-5 space-y-4">
                <Item icon={<BadgeCheck className="h-4 w-4" />} titulo="Conta com NIF">
                  O registo exige o contribuinte da empresa, para garantir casas reais.
                </Item>
                <Item icon={<MapPin className="h-4 w-4" />} titulo="Publica ou procura">
                  Publica a necessidade de um turno ou pesquisa pessoas diretamente.
                </Item>
                <Item icon={<Wallet className="h-4 w-4" />} titulo="1 € por contacto">
                  Vês o perfil completo sem custo. Só pagas quando queres o contacto direto — e
                  nunca duas vezes pela mesma pessoa.
                </Item>
              </ul>
            </div>
          </div>

          <div className="mt-14 rounded-xl border border-border bg-card p-8 text-center">
            <h2 className="text-2xl font-bold">Pronto para começar?</h2>
            <p className="mt-2 text-muted-foreground">
              Cria a conta em poucos minutos e vê o que está disponível no teu concelho.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ modo: "registo" }}>
                  Criar conta
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/ofertas">Ver ofertas de turno</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/auth" search={{ modo: "entrar" }}>
                  Entrar
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Item({
  icon,
  titulo,
  children,
}: {
  icon: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <p className="font-semibold">{titulo}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}
