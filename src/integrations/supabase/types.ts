export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          concelho: string
          created_at: string
          descricao: string
          id: string
          morada: string
          nif: string
          nome: string
          owner_id: string
          tipo: Database["public"]["Enums"]["business_type"]
          updated_at: string
          verificado: boolean
        }
        Insert: {
          concelho: string
          created_at?: string
          descricao?: string
          id?: string
          morada?: string
          nif: string
          nome: string
          owner_id: string
          tipo?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          verificado?: boolean
        }
        Update: {
          concelho?: string
          created_at?: string
          descricao?: string
          id?: string
          morada?: string
          nif?: string
          nome?: string
          owner_id?: string
          tipo?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          verificado?: boolean
        }
        Relationships: []
      }
      contact_unlocks: {
        Row: {
          business_id: string
          created_at: string
          custo_creditos: number
          id: string
          worker_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          custo_creditos?: number
          id?: string
          worker_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          custo_creditos?: number
          id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_unlocks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          business_id: string
          created_at: string
          creditos: number
          descricao: string
          id: string
          tipo: string
        }
        Insert: {
          business_id: string
          created_at?: string
          creditos: number
          descricao?: string
          id?: string
          tipo: string
        }
        Update: {
          business_id?: string
          created_at?: string
          creditos?: number
          descricao?: string
          id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["application_status"]
          id: string
          job_id: string
          mensagem: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["application_status"]
          id?: string
          job_id: string
          mensagem?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["application_status"]
          id?: string
          job_id?: string
          mensagem?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          business_id: string
          concelho: string
          created_at: string
          data_turno: string
          descricao: string
          estado: Database["public"]["Enums"]["job_status"]
          funcao: Database["public"]["Enums"]["job_role"]
          hora_fim: string
          hora_inicio: string
          id: string
          remuneracao: number | null
          titulo: string
          updated_at: string
        }
        Insert: {
          business_id: string
          concelho: string
          created_at?: string
          data_turno: string
          descricao?: string
          estado?: Database["public"]["Enums"]["job_status"]
          funcao: Database["public"]["Enums"]["job_role"]
          hora_fim?: string
          hora_inicio?: string
          id?: string
          remuneracao?: number | null
          titulo: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          concelho?: string
          created_at?: string
          data_turno?: string
          descricao?: string
          estado?: Database["public"]["Enums"]["job_status"]
          funcao?: Database["public"]["Enums"]["job_role"]
          hora_fim?: string
          hora_inicio?: string
          id?: string
          remuneracao?: number | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          business_id: string
          created_at: string
          saldo: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          saldo?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          saldo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_experience: {
        Row: {
          created_at: string
          descricao: string
          funcao: string
          id: string
          local: string
          periodo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          funcao: string
          id?: string
          local: string
          periodo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          funcao?: string
          id?: string
          local?: string
          periodo?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_profiles: {
        Row: {
          anos_experiencia: number
          bio: string
          concelhos: string[]
          created_at: string
          demo: boolean
          dias: string[]
          foco: Database["public"]["Enums"]["job_role"]
          horarios: string[]
          nome_publico: string
          procura_ativa: boolean
          skill_backoffice: number
          skill_bartender: number
          skill_servico_mesa: number
          titulo: string
          updated_at: string
          user_id: string
          visivel: boolean
        }
        Insert: {
          anos_experiencia?: number
          bio?: string
          concelhos?: string[]
          created_at?: string
          demo?: boolean
          dias?: string[]
          foco?: Database["public"]["Enums"]["job_role"]
          horarios?: string[]
          nome_publico?: string
          procura_ativa?: boolean
          skill_backoffice?: number
          skill_bartender?: number
          skill_servico_mesa?: number
          titulo?: string
          updated_at?: string
          user_id: string
          visivel?: boolean
        }
        Update: {
          anos_experiencia?: number
          bio?: string
          concelhos?: string[]
          created_at?: string
          demo?: boolean
          dias?: string[]
          foco?: Database["public"]["Enums"]["job_role"]
          horarios?: string[]
          nome_publico?: string
          procura_ativa?: boolean
          skill_backoffice?: number
          skill_bartender?: number
          skill_servico_mesa?: number
          titulo?: string
          updated_at?: string
          user_id?: string
          visivel?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      comprar_creditos: {
        Args: { _business_id: string; _creditos: number }
        Returns: number
      }
      contactos_desbloqueados: {
        Args: { _business_id: string }
        Returns: {
          created_at: string
          email: string
          nome: string
          telefone: string
          worker_id: string
        }[]
      }
      desbloquear_contacto: {
        Args: { _business_id: string; _worker_id: string }
        Returns: {
          email: string
          nome: string
          saldo: number
          telefone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "trabalhador" | "empregador" | "admin"
      application_status: "pendente" | "aceite" | "recusada"
      business_type:
        | "restaurante"
        | "bar"
        | "cafe"
        | "hotel"
        | "catering"
        | "outro"
      job_role: "bartender" | "servico_mesa" | "backoffice"
      job_status: "aberta" | "fechada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["trabalhador", "empregador", "admin"],
      application_status: ["pendente", "aceite", "recusada"],
      business_type: [
        "restaurante",
        "bar",
        "cafe",
        "hotel",
        "catering",
        "outro",
      ],
      job_role: ["bartender", "servico_mesa", "backoffice"],
      job_status: ["aberta", "fechada"],
    },
  },
} as const
