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
      ai_analysis: {
        Row: {
          analyzed_at: string
          biomarkers: Json | null
          diagnosis: string[] | null
          exam_id: string
          findings: Json | null
          id: string
          measurements: Json | null
          model_used: string | null
          optic_nerve_analysis: Json | null
          quality_score: string | null
          raw_response: Json | null
          recommendations: string[] | null
          retinography_analysis: Json | null
          risk_classification: string | null
        }
        Insert: {
          analyzed_at?: string
          biomarkers?: Json | null
          diagnosis?: string[] | null
          exam_id: string
          findings?: Json | null
          id?: string
          measurements?: Json | null
          model_used?: string | null
          optic_nerve_analysis?: Json | null
          quality_score?: string | null
          raw_response?: Json | null
          recommendations?: string[] | null
          retinography_analysis?: Json | null
          risk_classification?: string | null
        }
        Update: {
          analyzed_at?: string
          biomarkers?: Json | null
          diagnosis?: string[] | null
          exam_id?: string
          findings?: Json | null
          id?: string
          measurements?: Json | null
          model_used?: string | null
          optic_nerve_analysis?: Json | null
          quality_score?: string | null
          raw_response?: Json | null
          recommendations?: string[] | null
          retinography_analysis?: Json | null
          risk_classification?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          accuracy_rating: string | null
          ai_analysis_id: string | null
          biomarkers_feedback: Json | null
          case_difficulty: string | null
          created_at: string | null
          diagnosis_added: string[] | null
          diagnosis_correct: string[] | null
          diagnosis_feedback: string | null
          diagnosis_removed: string[] | null
          doctor_id: string
          exam_id: string
          general_comments: string | null
          id: string
          is_reference_case: boolean | null
          measurements_feedback: Json | null
          overall_rating: number | null
          pathology_tags: string[] | null
          quality_correct: string | null
          quality_feedback: string | null
          teaching_notes: string | null
          updated_at: string | null
        }
        Insert: {
          accuracy_rating?: string | null
          ai_analysis_id?: string | null
          biomarkers_feedback?: Json | null
          case_difficulty?: string | null
          created_at?: string | null
          diagnosis_added?: string[] | null
          diagnosis_correct?: string[] | null
          diagnosis_feedback?: string | null
          diagnosis_removed?: string[] | null
          doctor_id: string
          exam_id: string
          general_comments?: string | null
          id?: string
          is_reference_case?: boolean | null
          measurements_feedback?: Json | null
          overall_rating?: number | null
          pathology_tags?: string[] | null
          quality_correct?: string | null
          quality_feedback?: string | null
          teaching_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          accuracy_rating?: string | null
          ai_analysis_id?: string | null
          biomarkers_feedback?: Json | null
          case_difficulty?: string | null
          created_at?: string | null
          diagnosis_added?: string[] | null
          diagnosis_correct?: string[] | null
          diagnosis_feedback?: string | null
          diagnosis_removed?: string[] | null
          doctor_id?: string
          exam_id?: string
          general_comments?: string | null
          id?: string
          is_reference_case?: boolean | null
          measurements_feedback?: Json | null
          overall_rating?: number | null
          pathology_tags?: string[] | null
          quality_correct?: string | null
          quality_feedback?: string | null
          teaching_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_ai_analysis_id_fkey"
            columns: ["ai_analysis_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      exam_comparisons: {
        Row: {
          comparison_notes: string | null
          created_at: string
          created_by: string | null
          exam_ids: string[]
          id: string
          patient_id: string
        }
        Insert: {
          comparison_notes?: string | null
          created_at?: string
          created_by?: string | null
          exam_ids: string[]
          id?: string
          patient_id: string
        }
        Update: {
          comparison_notes?: string | null
          created_at?: string
          created_by?: string | null
          exam_ids?: string[]
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_comparisons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_comparisons_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_images: {
        Row: {
          exam_id: string
          eye: Database["public"]["Enums"]["eye_type"]
          id: string
          image_url: string
          sequence: number | null
          uploaded_at: string
        }
        Insert: {
          exam_id: string
          eye: Database["public"]["Enums"]["eye_type"]
          id?: string
          image_url: string
          sequence?: number | null
          uploaded_at?: string
        }
        Update: {
          exam_id?: string
          eye?: Database["public"]["Enums"]["eye_type"]
          id?: string
          image_url?: string
          sequence?: number | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_images_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          clinical_indication: string | null
          created_at: string
          doctor_id: string | null
          equipment: string | null
          exam_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          eye: Database["public"]["Enums"]["eye_type"]
          id: string
          patient_id: string
          status: Database["public"]["Enums"]["exam_status"]
          updated_at: string
        }
        Insert: {
          clinical_indication?: string | null
          created_at?: string
          doctor_id?: string | null
          equipment?: string | null
          exam_date?: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          eye: Database["public"]["Enums"]["eye_type"]
          id?: string
          patient_id: string
          status?: Database["public"]["Enums"]["exam_status"]
          updated_at?: string
        }
        Update: {
          clinical_indication?: string | null
          created_at?: string
          doctor_id?: string | null
          equipment?: string | null
          exam_date?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          eye?: Database["public"]["Enums"]["eye_type"]
          id?: string
          patient_id?: string
          status?: Database["public"]["Enums"]["exam_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          birth_date: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          gender: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          record_number: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          gender?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          record_number?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          gender?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          record_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          clinic_address: string | null
          clinic_cnpj: string | null
          clinic_logo_url: string | null
          clinic_name: string | null
          clinic_phone: string | null
          created_at: string
          crm: string
          crm_uf: string
          default_report_template: string | null
          email_notifications: boolean | null
          full_name: string
          id: string
          include_logo_in_pdf: boolean | null
          include_signature_in_pdf: boolean | null
          language: string | null
          phone: string | null
          signature_url: string | null
          specialty: Database["public"]["Enums"]["specialty_type"]
          status: Database["public"]["Enums"]["profile_status"]
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          clinic_address?: string | null
          clinic_cnpj?: string | null
          clinic_logo_url?: string | null
          clinic_name?: string | null
          clinic_phone?: string | null
          created_at?: string
          crm: string
          crm_uf: string
          default_report_template?: string | null
          email_notifications?: boolean | null
          full_name: string
          id?: string
          include_logo_in_pdf?: boolean | null
          include_signature_in_pdf?: boolean | null
          language?: string | null
          phone?: string | null
          signature_url?: string | null
          specialty?: Database["public"]["Enums"]["specialty_type"]
          status?: Database["public"]["Enums"]["profile_status"]
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          clinic_address?: string | null
          clinic_cnpj?: string | null
          clinic_logo_url?: string | null
          clinic_name?: string | null
          clinic_phone?: string | null
          created_at?: string
          crm?: string
          crm_uf?: string
          default_report_template?: string | null
          email_notifications?: boolean | null
          full_name?: string
          id?: string
          include_logo_in_pdf?: boolean | null
          include_signature_in_pdf?: boolean | null
          language?: string | null
          phone?: string | null
          signature_url?: string | null
          specialty?: Database["public"]["Enums"]["specialty_type"]
          status?: Database["public"]["Enums"]["profile_status"]
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          ai_analysis_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          doctor_notes: string | null
          exam_id: string
          final_diagnosis: string | null
          final_findings: Json | null
          final_recommendations: string | null
          id: string
          pdf_url: string | null
          share_expires_at: string | null
          share_token: string | null
          updated_at: string
        }
        Insert: {
          ai_analysis_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          doctor_notes?: string | null
          exam_id: string
          final_diagnosis?: string | null
          final_findings?: Json | null
          final_recommendations?: string | null
          id?: string
          pdf_url?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          updated_at?: string
        }
        Update: {
          ai_analysis_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          doctor_notes?: string | null
          exam_id?: string
          final_diagnosis?: string | null
          final_findings?: Json | null
          final_recommendations?: string | null
          id?: string
          pdf_url?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_ai_analysis_id_fkey"
            columns: ["ai_analysis_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_exams_without_feedback: {
        Args: { doctor_profile_id: string }
        Returns: number
      }
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved_doctor: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "doctor"
      exam_status: "pending" | "analyzing" | "analyzed" | "approved"
      exam_type: "oct_macular" | "oct_nerve" | "retinography"
      eye_type: "od" | "oe" | "both"
      profile_status: "pending" | "approved" | "suspended"
      specialty_type: "oftalmologia" | "retina" | "glaucoma"
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
      app_role: ["admin", "doctor"],
      exam_status: ["pending", "analyzing", "analyzed", "approved"],
      exam_type: ["oct_macular", "oct_nerve", "retinography"],
      eye_type: ["od", "oe", "both"],
      profile_status: ["pending", "approved", "suspended"],
      specialty_type: ["oftalmologia", "retina", "glaucoma"],
    },
  },
} as const
