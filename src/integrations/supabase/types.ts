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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          ancienne_valeur: string | null
          champ: string | null
          created_at: string | null
          description: string
          enregistrement_id: string | null
          id: string
          nouvelle_valeur: string | null
          table_modifiee: string
          utilisateur_id: string | null
        }
        Insert: {
          ancienne_valeur?: string | null
          champ?: string | null
          created_at?: string | null
          description: string
          enregistrement_id?: string | null
          id?: string
          nouvelle_valeur?: string | null
          table_modifiee: string
          utilisateur_id?: string | null
        }
        Update: {
          ancienne_valeur?: string | null
          champ?: string | null
          created_at?: string | null
          description?: string
          enregistrement_id?: string | null
          id?: string
          nouvelle_valeur?: string | null
          table_modifiee?: string
          utilisateur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          categorie: string
          cle: string
          description: string | null
          id: string
          updated_at: string | null
          valeur: string
        }
        Insert: {
          categorie: string
          cle: string
          description?: string | null
          id?: string
          updated_at?: string | null
          valeur: string
        }
        Update: {
          categorie?: string
          cle?: string
          description?: string | null
          id?: string
          updated_at?: string | null
          valeur?: string
        }
        Relationships: []
      }
      modules_roi: {
        Row: {
          actif: boolean | null
          description: string | null
          id: string
          nom: string
          ordre: number
          slug: string
        }
        Insert: {
          actif?: boolean | null
          description?: string | null
          id?: string
          nom: string
          ordre: number
          slug: string
        }
        Update: {
          actif?: boolean | null
          description?: string | null
          id?: string
          nom?: string
          ordre?: number
          slug?: string
        }
        Relationships: []
      }
      paliers: {
        Row: {
          capacite_max: number | null
          capacite_min: number
          id: string
          ordre: number
          segment_id: string
          tarif_mensuel: number
        }
        Insert: {
          capacite_max?: number | null
          capacite_min: number
          id?: string
          ordre: number
          segment_id: string
          tarif_mensuel: number
        }
        Update: {
          capacite_max?: number | null
          capacite_min?: number
          id?: string
          ordre?: number
          segment_id?: string
          tarif_mensuel?: number
        }
        Relationships: [
          {
            foreignKeyName: "paliers_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      parametres_roi: {
        Row: {
          cle: string
          id: string
          label: string
          module_id: string
          ordre: number
          valeur: number
        }
        Insert: {
          cle: string
          id?: string
          label: string
          module_id: string
          ordre: number
          valeur: number
        }
        Update: {
          cle?: string
          id?: string
          label?: string
          module_id?: string
          ordre?: number
          valeur?: number
        }
        Relationships: [
          {
            foreignKeyName: "parametres_roi_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_roi"
            referencedColumns: ["id"]
          },
        ]
      }
      rabais: {
        Row: {
          actif: boolean | null
          condition_description: string | null
          groupe_exclusion: string | null
          id: string
          nom: string
          ordre: number
          pourcentage: number
          slug: string
          type_ui: string
        }
        Insert: {
          actif?: boolean | null
          condition_description?: string | null
          groupe_exclusion?: string | null
          id?: string
          nom: string
          ordre: number
          pourcentage: number
          slug: string
          type_ui: string
        }
        Update: {
          actif?: boolean | null
          condition_description?: string | null
          groupe_exclusion?: string | null
          id?: string
          nom?: string
          ordre?: number
          pourcentage?: number
          slug?: string
          type_ui?: string
        }
        Relationships: []
      }
      segments: {
        Row: {
          actif: boolean | null
          created_at: string | null
          id: string
          minimum_mensuel: number | null
          nom: string
          ordre: number
          prix_unitaire: number | null
          slug: string
          type_tarification: string
          unite: string
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          id?: string
          minimum_mensuel?: number | null
          nom: string
          ordre: number
          prix_unitaire?: number | null
          slug: string
          type_tarification: string
          unite: string
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          id?: string
          minimum_mensuel?: number | null
          nom?: string
          ordre?: number
          prix_unitaire?: number | null
          slug?: string
          type_tarification?: string
          unite?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      soumission_etablissements: {
        Row: {
          est_pilote: boolean | null
          id: string
          nom_etablissement: string | null
          nombre_unites: number
          prix_brut: number | null
          prix_final: number | null
          segment_id: string | null
          soumission_id: string
        }
        Insert: {
          est_pilote?: boolean | null
          id?: string
          nom_etablissement?: string | null
          nombre_unites: number
          prix_brut?: number | null
          prix_final?: number | null
          segment_id?: string | null
          soumission_id: string
        }
        Update: {
          est_pilote?: boolean | null
          id?: string
          nom_etablissement?: string | null
          nombre_unites?: number
          prix_brut?: number | null
          prix_final?: number | null
          segment_id?: string | null
          soumission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soumission_etablissements_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soumission_etablissements_soumission_id_fkey"
            columns: ["soumission_id"]
            isOneToOne: false
            referencedRelation: "soumissions"
            referencedColumns: ["id"]
          },
        ]
      }
      soumission_options: {
        Row: {
          id: string
          nom: string
          ordre: number | null
          prix_description: string
          soumission_id: string
        }
        Insert: {
          id?: string
          nom: string
          ordre?: number | null
          prix_description?: string
          soumission_id: string
        }
        Update: {
          id?: string
          nom?: string
          ordre?: number | null
          prix_description?: string
          soumission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soumission_options_soumission_id_fkey"
            columns: ["soumission_id"]
            isOneToOne: false
            referencedRelation: "soumissions"
            referencedColumns: ["id"]
          },
        ]
      }
      soumission_rabais: {
        Row: {
          description_rabais: string | null
          id: string
          pourcentage_applique: number | null
          rabais_id: string | null
          soumission_id: string
          type_rabais: string | null
        }
        Insert: {
          description_rabais?: string | null
          id?: string
          pourcentage_applique?: number | null
          rabais_id?: string | null
          soumission_id: string
          type_rabais?: string | null
        }
        Update: {
          description_rabais?: string | null
          id?: string
          pourcentage_applique?: number | null
          rabais_id?: string | null
          soumission_id?: string
          type_rabais?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soumission_rabais_rabais_id_fkey"
            columns: ["rabais_id"]
            isOneToOne: false
            referencedRelation: "rabais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soumission_rabais_soumission_id_fkey"
            columns: ["soumission_id"]
            isOneToOne: false
            referencedRelation: "soumissions"
            referencedColumns: ["id"]
          },
        ]
      }
      soumission_roi: {
        Row: {
          budget_alimentaire: number | null
          cout_gestion_dechets: number | null
          cout_octogone_annuel: number | null
          couts_approvisionnement: number | null
          economies_totales: number | null
          id: string
          nb_employes_cuisine: number | null
          nb_employes_total: number | null
          nb_responsables_commandes: number | null
          periode_retour_mois: number | null
          roi_multiplicateur: number | null
          soumission_id: string
          taux_horaire_admin: number | null
          taux_horaire_comptabilite: number | null
          taux_horaire_cuisine: number | null
        }
        Insert: {
          budget_alimentaire?: number | null
          cout_gestion_dechets?: number | null
          cout_octogone_annuel?: number | null
          couts_approvisionnement?: number | null
          economies_totales?: number | null
          id?: string
          nb_employes_cuisine?: number | null
          nb_employes_total?: number | null
          nb_responsables_commandes?: number | null
          periode_retour_mois?: number | null
          roi_multiplicateur?: number | null
          soumission_id: string
          taux_horaire_admin?: number | null
          taux_horaire_comptabilite?: number | null
          taux_horaire_cuisine?: number | null
        }
        Update: {
          budget_alimentaire?: number | null
          cout_gestion_dechets?: number | null
          cout_octogone_annuel?: number | null
          couts_approvisionnement?: number | null
          economies_totales?: number | null
          id?: string
          nb_employes_cuisine?: number | null
          nb_employes_total?: number | null
          nb_responsables_commandes?: number | null
          periode_retour_mois?: number | null
          roi_multiplicateur?: number | null
          soumission_id?: string
          taux_horaire_admin?: number | null
          taux_horaire_comptabilite?: number | null
          taux_horaire_cuisine?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "soumission_roi_soumission_id_fkey"
            columns: ["soumission_id"]
            isOneToOne: false
            referencedRelation: "soumissions"
            referencedColumns: ["id"]
          },
        ]
      }
      soumission_roi_modules: {
        Row: {
          economie_annuelle: number | null
          economie_mensuelle: number | null
          id: string
          module_id: string | null
          selectionne: boolean | null
          soumission_roi_id: string
        }
        Insert: {
          economie_annuelle?: number | null
          economie_mensuelle?: number | null
          id?: string
          module_id?: string | null
          selectionne?: boolean | null
          soumission_roi_id: string
        }
        Update: {
          economie_annuelle?: number | null
          economie_mensuelle?: number | null
          id?: string
          module_id?: string | null
          selectionne?: boolean | null
          soumission_roi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soumission_roi_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_roi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soumission_roi_modules_soumission_roi_id_fkey"
            columns: ["soumission_roi_id"]
            isOneToOne: false
            referencedRelation: "soumission_roi"
            referencedColumns: ["id"]
          },
        ]
      }
      soumissions: {
        Row: {
          cout_total_an1: number | null
          created_at: string | null
          date_expiration: string | null
          frais_integration: number | null
          frais_integration_offerts: boolean | null
          id: string
          nom_client: string
          notes_internes: string | null
          notes_personnalisees: string | null
          numero: string
          parent_id: string | null
          statut: string
          total_annuel: number | null
          total_mensuel: number | null
          updated_at: string | null
          utilisateur_id: string | null
          version: number | null
        }
        Insert: {
          cout_total_an1?: number | null
          created_at?: string | null
          date_expiration?: string | null
          frais_integration?: number | null
          frais_integration_offerts?: boolean | null
          id?: string
          nom_client: string
          notes_internes?: string | null
          notes_personnalisees?: string | null
          numero: string
          parent_id?: string | null
          statut?: string
          total_annuel?: number | null
          total_mensuel?: number | null
          updated_at?: string | null
          utilisateur_id?: string | null
          version?: number | null
        }
        Update: {
          cout_total_an1?: number | null
          created_at?: string | null
          date_expiration?: string | null
          frais_integration?: number | null
          frais_integration_offerts?: boolean | null
          id?: string
          nom_client?: string
          notes_internes?: string | null
          notes_personnalisees?: string | null
          numero?: string
          parent_id?: string | null
          statut?: string
          total_annuel?: number | null
          total_mensuel?: number | null
          updated_at?: string | null
          utilisateur_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "soumissions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "soumissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soumissions_utilisateur_id_fkey"
            columns: ["utilisateur_id"]
            isOneToOne: false
            referencedRelation: "utilisateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      utilisateurs: {
        Row: {
          actif: boolean | null
          created_at: string | null
          email: string
          id: string
          nom: string
          role: string
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          nom: string
          role: string
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nom?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
