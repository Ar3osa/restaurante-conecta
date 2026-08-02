import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed, LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePapeis } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, eTrabalhador, eEmpregador } = usePapeis();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const painel = eEmpregador ? "/empresa" : "/trabalhador";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <span className="text-display text-xl font-bold">Mesa</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" asChild>
            <Link to="/ofertas">Ofertas de turno</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/trabalhadores">Trabalhadores</Link>
          </Button>
          {eEmpregador && (
            <Button variant="ghost" asChild>
              <Link to="/empresa/procurar">Procurar pessoal</Link>
            </Button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* Menu de navegação em mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon" aria-label="Abrir menu">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/ofertas">Ofertas de turno</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/trabalhadores">Trabalhadores</Link>
              </DropdownMenuItem>
              {eEmpregador && (
                <DropdownMenuItem asChild>
                  <Link to="/empresa/procurar">Procurar pessoal</Link>
                </DropdownMenuItem>
              )}
              {user && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to={painel}>O meu painel</Link>
                  </DropdownMenuItem>
                  {eTrabalhador && (
                    <DropdownMenuItem asChild>
                      <Link to="/trabalhador/perfil">Editar perfil</Link>
                    </DropdownMenuItem>
                  )}
                  {eEmpregador && (
                    <DropdownMenuItem asChild>
                      <Link to="/empresa/creditos">Créditos</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={sair}>
                    <LogOut className="mr-2 h-4 w-4" /> Terminar sessão
                  </DropdownMenuItem>
                </>
              )}
              {!user && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/auth">Entrar</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/auth" search={{ modo: "registo" }}>
                      Criar conta
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden gap-2 md:inline-flex">
                  <Menu className="h-4 w-4" />
                  <span className="max-w-[10rem] truncate">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to={painel}>O meu painel</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/ofertas">Ofertas de turno</Link>
                </DropdownMenuItem>
                {eTrabalhador && (
                  <DropdownMenuItem asChild>
                    <Link to="/trabalhador/perfil">Editar perfil</Link>
                  </DropdownMenuItem>
                )}
                {eEmpregador && (
                  <DropdownMenuItem asChild>
                    <Link to="/empresa/creditos">Créditos</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={sair}>
                  <LogOut className="mr-2 h-4 w-4" /> Terminar sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth" search={{ modo: "registo" }}>
                  Criar conta
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/70 bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>Mesa — trabalho na restauração em Portugal.</p>
        <p>Modo de demonstração: os pagamentos são simulados.</p>
      </div>
    </footer>
  );
}