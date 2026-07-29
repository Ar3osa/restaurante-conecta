import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Papel = "trabalhador" | "empregador" | "admin";

export function useSessionUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export function usePapeis() {
  const { user, loading } = useSessionUser();
  const query = useQuery({
    queryKey: ["papeis", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;
      return (data ?? []).map((r) => r.role as Papel);
    },
  });

  return {
    user,
    loading: loading || (!!user && query.isLoading),
    papeis: query.data ?? [],
    eTrabalhador: (query.data ?? []).includes("trabalhador"),
    eEmpregador: (query.data ?? []).includes("empregador"),
  };
}