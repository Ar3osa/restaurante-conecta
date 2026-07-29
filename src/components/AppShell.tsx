import type { ReactNode } from "react";
import { Navbar, Footer } from "@/components/Navbar";

export function AppShell({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{titulo}</h1>
            {descricao && <p className="mt-1 text-muted-foreground">{descricao}</p>}
          </div>
          {acoes}
        </div>
        {children}
      </main>
      <Footer />
    </div>
  );
}