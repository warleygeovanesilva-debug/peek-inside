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
      abastecimentos: {
        Row: {
          combustivel: string | null
          consumo_kml: number | null
          created_at: string
          created_by: string | null
          data: string
          filial_id: string
          id: string
          km: number
          litros: number
          motorista_id: string | null
          observacoes: string | null
          posto: string | null
          updated_at: string
          valor_litro: number
          valor_total: number
          veiculo_id: string
        }
        Insert: {
          combustivel?: string | null
          consumo_kml?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          filial_id: string
          id?: string
          km: number
          litros: number
          motorista_id?: string | null
          observacoes?: string | null
          posto?: string | null
          updated_at?: string
          valor_litro: number
          valor_total: number
          veiculo_id: string
        }
        Update: {
          combustivel?: string | null
          consumo_kml?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          filial_id?: string
          id?: string
          km?: number
          litros?: number
          motorista_id?: string | null
          observacoes?: string | null
          posto?: string | null
          updated_at?: string
          valor_litro?: number
          valor_total?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abastec_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastec_motorista_fk"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "kpi_ranking_motoristas"
            referencedColumns: ["motorista_id"]
          },
          {
            foreignKeyName: "abastec_motorista_fk"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastec_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_consumo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "abastec_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_custo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "abastec_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          filial_id: string
          id: string
          itens: Json
          km: number | null
          motorista_id: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["checklist_status"]
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          filial_id: string
          id?: string
          itens?: Json
          km?: number | null
          motorista_id?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["checklist_status"]
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          filial_id?: string
          id?: string
          itens?: Json
          km?: number | null
          motorista_id?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["checklist_status"]
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_motorista_fk"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "kpi_ranking_motoristas"
            referencedColumns: ["motorista_id"]
          },
          {
            foreignKeyName: "check_motorista_fk"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_consumo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "check_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_custo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "check_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      filiais: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj: string | null
          created_at: string
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      manutencoes: {
        Row: {
          created_at: string
          custo: number | null
          data_prevista: string | null
          data_realizada: string | null
          descricao: string
          filial_id: string
          fornecedor: string | null
          id: string
          km_proxima: number | null
          km_realizacao: number | null
          observacoes: string | null
          status: Database["public"]["Enums"]["manutencao_status"]
          tipo: Database["public"]["Enums"]["manutencao_tipo"]
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          custo?: number | null
          data_prevista?: string | null
          data_realizada?: string | null
          descricao: string
          filial_id: string
          fornecedor?: string | null
          id?: string
          km_proxima?: number | null
          km_realizacao?: number | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["manutencao_status"]
          tipo?: Database["public"]["Enums"]["manutencao_tipo"]
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          custo?: number | null
          data_prevista?: string | null
          data_realizada?: string | null
          descricao?: string
          filial_id?: string
          fornecedor?: string | null
          id?: string
          km_proxima?: number | null
          km_realizacao?: number | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["manutencao_status"]
          tipo?: Database["public"]["Enums"]["manutencao_tipo"]
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manut_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manut_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_consumo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "manut_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_custo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "manut_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          ativo: boolean
          cnh: string | null
          cnh_categoria: string | null
          cnh_validade: string | null
          cpf: string | null
          created_at: string
          email: string | null
          filial_id: string
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cnh?: string | null
          cnh_categoria?: string | null
          cnh_validade?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          filial_id: string
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cnh?: string | null
          cnh_categoria?: string | null
          cnh_validade?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          filial_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motoristas_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          data_resolucao: string | null
          descricao: string
          filial_id: string
          id: string
          local: string | null
          motorista_id: string | null
          numero_documento: string | null
          observacoes: string | null
          severidade: Database["public"]["Enums"]["ocorrencia_severidade"]
          status: Database["public"]["Enums"]["ocorrencia_status"]
          tipo: Database["public"]["Enums"]["ocorrencia_tipo"]
          updated_at: string
          valor: number | null
          veiculo_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          data_resolucao?: string | null
          descricao: string
          filial_id: string
          id?: string
          local?: string | null
          motorista_id?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          severidade?: Database["public"]["Enums"]["ocorrencia_severidade"]
          status?: Database["public"]["Enums"]["ocorrencia_status"]
          tipo?: Database["public"]["Enums"]["ocorrencia_tipo"]
          updated_at?: string
          valor?: number | null
          veiculo_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          data_resolucao?: string | null
          descricao?: string
          filial_id?: string
          id?: string
          local?: string | null
          motorista_id?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          severidade?: Database["public"]["Enums"]["ocorrencia_severidade"]
          status?: Database["public"]["Enums"]["ocorrencia_status"]
          tipo?: Database["public"]["Enums"]["ocorrencia_tipo"]
          updated_at?: string
          valor?: number | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_motorista_fk"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "kpi_ranking_motoristas"
            referencedColumns: ["motorista_id"]
          },
          {
            foreignKeyName: "ocorrencias_motorista_fk"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_consumo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "ocorrencias_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_custo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "ocorrencias_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pneus: {
        Row: {
          created_at: string
          custo: number | null
          data_compra: string | null
          dot: string | null
          filial_id: string
          id: string
          km_atual: number | null
          km_instalacao: number | null
          marca: string | null
          medida: string | null
          modelo: string | null
          numero_serie: string | null
          observacoes: string | null
          posicao: string | null
          status: Database["public"]["Enums"]["pneu_status"]
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          created_at?: string
          custo?: number | null
          data_compra?: string | null
          dot?: string | null
          filial_id: string
          id?: string
          km_atual?: number | null
          km_instalacao?: number | null
          marca?: string | null
          medida?: string | null
          modelo?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          posicao?: string | null
          status?: Database["public"]["Enums"]["pneu_status"]
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          created_at?: string
          custo?: number | null
          data_compra?: string | null
          dot?: string | null
          filial_id?: string
          id?: string
          km_atual?: number | null
          km_instalacao?: number | null
          marca?: string | null
          medida?: string | null
          modelo?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          posicao?: string | null
          status?: Database["public"]["Enums"]["pneu_status"]
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pneus_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pneus_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_consumo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "pneus_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_custo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "pneus_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          filial_id: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          filial_id?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          filial_id?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      rodizios_pneus: {
        Row: {
          created_at: string
          data: string
          filial_id: string
          id: string
          km: number | null
          observacoes: string | null
          pneu_id: string
          posicao_anterior: string | null
          posicao_nova: string | null
          veiculo_id: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          filial_id: string
          id?: string
          km?: number | null
          observacoes?: string | null
          pneu_id: string
          posicao_anterior?: string | null
          posicao_nova?: string | null
          veiculo_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          filial_id?: string
          id?: string
          km?: number | null
          observacoes?: string | null
          pneu_id?: string
          posicao_anterior?: string | null
          posicao_nova?: string | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rod_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rod_pneu_fk"
            columns: ["pneu_id"]
            isOneToOne: false
            referencedRelation: "pneus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rod_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_consumo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "rod_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "kpi_custo_veiculo"
            referencedColumns: ["veiculo_id"]
          },
          {
            foreignKeyName: "rod_veiculo_fk"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          filial_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          filial_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          filial_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: number | null
          chassi: string | null
          combustivel: string | null
          cor: string | null
          created_at: string
          crlv_validade: string | null
          filial_id: string
          id: string
          km_atual: number
          marca: string | null
          modelo: string | null
          observacoes: string | null
          placa: string
          renavam: string | null
          status: Database["public"]["Enums"]["veiculo_status"]
          tipo: Database["public"]["Enums"]["veiculo_tipo"]
          updated_at: string
        }
        Insert: {
          ano?: number | null
          chassi?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          crlv_validade?: string | null
          filial_id: string
          id?: string
          km_atual?: number
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa: string
          renavam?: string | null
          status?: Database["public"]["Enums"]["veiculo_status"]
          tipo?: Database["public"]["Enums"]["veiculo_tipo"]
          updated_at?: string
        }
        Update: {
          ano?: number | null
          chassi?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          crlv_validade?: string | null
          filial_id?: string
          id?: string
          km_atual?: number
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa?: string
          renavam?: string | null
          status?: Database["public"]["Enums"]["veiculo_status"]
          tipo?: Database["public"]["Enums"]["veiculo_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kpi_consumo_veiculo: {
        Row: {
          abastecimentos: number | null
          consumo_medio_kml: number | null
          filial_id: string | null
          gasto_total: number | null
          litros_total: number | null
          modelo: string | null
          placa: string | null
          veiculo_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_custo_veiculo: {
        Row: {
          custo_abastecimento: number | null
          custo_manutencao: number | null
          custo_por_km: number | null
          custo_total: number | null
          filial_id: string | null
          km_atual: number | null
          placa: string | null
          veiculo_id: string | null
        }
        Insert: {
          custo_abastecimento?: never
          custo_manutencao?: never
          custo_por_km?: never
          custo_total?: never
          filial_id?: string | null
          km_atual?: number | null
          placa?: string | null
          veiculo_id?: string | null
        }
        Update: {
          custo_abastecimento?: never
          custo_manutencao?: never
          custo_por_km?: never
          custo_total?: never
          filial_id?: string | null
          km_atual?: number | null
          placa?: string | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_ranking_motoristas: {
        Row: {
          abastecimentos: number | null
          consumo_medio_kml: number | null
          filial_id: string | null
          gasto_total: number | null
          litros_total: number | null
          motorista_id: string | null
          nome: string | null
          ocorrencias: number | null
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_filial_fk"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motoristas_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bootstrap_filial: {
        Args: { _cidade?: string; _estado?: string; _nome: string }
        Returns: string
      }
      current_filial_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "motorista"
      checklist_status: "aprovado" | "reprovado" | "pendente"
      manutencao_status: "agendada" | "em_andamento" | "concluida" | "cancelada"
      manutencao_tipo:
        | "preventiva"
        | "corretiva"
        | "revisao"
        | "troca_oleo"
        | "outro"
      ocorrencia_severidade: "baixa" | "media" | "alta" | "critica"
      ocorrencia_status: "aberta" | "em_analise" | "resolvida" | "cancelada"
      ocorrencia_tipo: "multa" | "sinistro" | "avaria" | "infracao" | "outro"
      pneu_status: "em_uso" | "estoque" | "recapagem" | "descartado"
      veiculo_status: "ativo" | "inativo" | "manutencao" | "vendido"
      veiculo_tipo:
        | "carro"
        | "caminhao"
        | "moto"
        | "van"
        | "onibus"
        | "maquina"
        | "outro"
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
      app_role: ["admin", "gestor", "motorista"],
      checklist_status: ["aprovado", "reprovado", "pendente"],
      manutencao_status: ["agendada", "em_andamento", "concluida", "cancelada"],
      manutencao_tipo: [
        "preventiva",
        "corretiva",
        "revisao",
        "troca_oleo",
        "outro",
      ],
      ocorrencia_severidade: ["baixa", "media", "alta", "critica"],
      ocorrencia_status: ["aberta", "em_analise", "resolvida", "cancelada"],
      ocorrencia_tipo: ["multa", "sinistro", "avaria", "infracao", "outro"],
      pneu_status: ["em_uso", "estoque", "recapagem", "descartado"],
      veiculo_status: ["ativo", "inativo", "manutencao", "vendido"],
      veiculo_tipo: [
        "carro",
        "caminhao",
        "moto",
        "van",
        "onibus",
        "maquina",
        "outro",
      ],
    },
  },
} as const
