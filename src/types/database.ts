// Hand-authored types mirroring supabase/migrations/*.sql.
// In a real deployment, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
// Kept hand-written here because this repo isn't linked to a live project.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TemplateStatus = "draft" | "under_review" | "approved" | "published" | "archived";
export type QuestionType =
  | "yes_no"
  | "pass_fail"
  | "compliant_non_compliant"
  | "text"
  | "long_text"
  | "number"
  | "decimal"
  | "temperature"
  | "date"
  | "time"
  | "dropdown"
  | "multi_select"
  | "photo"
  | "video"
  | "attachment"
  | "signature";
export type QuestionPolarity = "positive" | "negative";
export type InspectionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "closed"
  | "cancelled";
export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "custom";
export type AnswerStatus = "pending" | "pass" | "fail" | "na";
export type FindingSource = "inspection" | "manual" | "audit" | "other";
export type FindingSeverity = "low" | "medium" | "high" | "critical";
export type FindingStatus =
  | "open"
  | "assigned"
  | "investigation"
  | "action_required"
  | "verification"
  | "closed"
  | "rejected";
export type CapaActionType = "corrective" | "preventive";
export type CapaPriority = "low" | "medium" | "high" | "urgent";
export type CapaStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "verification"
  | "approved"
  | "closed"
  | "rejected";
export type FishboneCategory = "man" | "machine" | "method" | "material" | "measurement" | "environment";
export type AssetStatus = "active" | "inactive" | "under_maintenance" | "retired";
export type AssetCriticality = "low" | "medium" | "high" | "critical";
export type EvidenceKind = "photo" | "video" | "document" | "signature" | "other";
export type NotificationChannel = "in_app" | "email" | "whatsapp" | "push";
export type AuditAction =
  | "created"
  | "updated"
  | "assigned"
  | "status_changed"
  | "submitted"
  | "approved"
  | "rejected"
  | "closed"
  | "reopened"
  | "deleted";
export type SiteType = "factory" | "branch" | "warehouse" | "office";
export type AreaType = "production" | "warehouse" | "storage" | "utility" | "office" | "other";
export type SanitationStationType =
  | "bait_station"
  | "insect_light_trap"
  | "pheromone_trap"
  | "rodent_trap"
  | "sanitation_checkpoint"
  | "other";
export type SanitationStationStatus = "active" | "inactive" | "removed";
export type PestActivityLevel = "none" | "low" | "medium" | "high";
export type SanitationCondition = "clean" | "needs_attention" | "dirty";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          name_ar: string | null;
          slug: string;
          logo_url: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]> & { name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
        Relationships: [];
      };
      sites: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          name_ar: string | null;
          code: string;
          type: SiteType;
          address: string | null;
          city: string | null;
          timezone: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sites"]["Row"]> & {
          organization_id: string;
          name: string;
          code: string;
        };
        Update: Partial<Database["public"]["Tables"]["sites"]["Row"]>;
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string;
          name: string;
          name_ar: string | null;
          code: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["departments"]["Row"]> & {
          organization_id: string;
          site_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["departments"]["Row"]>;
        Relationships: [];
      };
      areas: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string;
          department_id: string | null;
          name: string;
          name_ar: string | null;
          type: AreaType;
          qr_code_token: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["areas"]["Row"]> & {
          organization_id: string;
          site_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["areas"]["Row"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string | null;
          department_id: string | null;
          name: string;
          name_ar: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["teams"]["Row"]> & { organization_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["teams"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          full_name_ar: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          organization_id: string | null;
          key: string;
          name: string;
          name_ar: string;
          is_system: boolean;
          description: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["roles"]["Row"]> & { key: string; name: string; name_ar: string };
        Update: Partial<Database["public"]["Tables"]["roles"]["Row"]>;
        Relationships: [];
      };
      permissions: {
        Row: { key: string; category: string; description: string };
        Insert: { key: string; category: string; description: string };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Row"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: { role_id: string; permission_key: string };
        Insert: { role_id: string; permission_key: string };
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Row"]>;
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role_id: string;
          site_id: string | null;
          department_id: string | null;
          is_active: boolean;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["memberships"]["Row"]> & {
          organization_id: string;
          user_id: string;
          role_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["memberships"]["Row"]>;
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          organization_id: string;
          parent_template_id: string | null;
          code: string;
          name: string;
          name_ar: string | null;
          category: string;
          department_id: string | null;
          description: string | null;
          version: number;
          status: TemplateStatus;
          owner_id: string | null;
          created_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          published_at: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["templates"]["Row"]> & { organization_id: string; code: string; name: string };
        Update: Partial<Database["public"]["Tables"]["templates"]["Row"]>;
        Relationships: [];
      };
      template_sections: {
        Row: {
          id: string;
          organization_id: string;
          template_id: string;
          title: string;
          title_ar: string | null;
          description: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["template_sections"]["Row"]> & {
          organization_id: string;
          template_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["template_sections"]["Row"]>;
        Relationships: [];
      };
      template_questions: {
        Row: {
          id: string;
          organization_id: string;
          template_id: string;
          section_id: string;
          sort_order: number;
          prompt: string;
          prompt_ar: string | null;
          type: QuestionType;
          is_required: boolean;
          weight: number;
          is_critical: boolean;
          instructions: string | null;
          min_value: number | null;
          max_value: number | null;
          unit: string | null;
          options: Json;
          require_photo_on_fail: boolean;
          require_comment_on_fail: boolean;
          require_capa_on_fail: boolean;
          condition: Json | null;
          polarity: QuestionPolarity;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["template_questions"]["Row"]> & {
          organization_id: string;
          template_id: string;
          section_id: string;
          prompt: string;
          type: QuestionType;
        };
        Update: Partial<Database["public"]["Tables"]["template_questions"]["Row"]>;
        Relationships: [];
      };
      inspections: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string;
          department_id: string | null;
          area_id: string | null;
          template_id: string;
          template_version: number;
          inspector_id: string | null;
          assigned_team_id: string | null;
          status: InspectionStatus;
          scheduled_date: string;
          started_at: string | null;
          completed_at: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          approved_at: string | null;
          approved_by: string | null;
          score: number | null;
          compliance_percent: number | null;
          comments: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inspections"]["Row"]> & {
          organization_id: string;
          site_id: string;
          template_id: string;
          template_version: number;
        };
        Update: Partial<Database["public"]["Tables"]["inspections"]["Row"]>;
        Relationships: [];
      };
      inspection_answers: {
        Row: {
          id: string;
          organization_id: string;
          inspection_id: string;
          question_id: string;
          section_id: string;
          value_bool: boolean | null;
          value_number: number | null;
          value_text: string | null;
          value_option: Json | null;
          value_date: string | null;
          value_time: string | null;
          status: AnswerStatus;
          is_critical_fail: boolean;
          comment: string | null;
          answered_by: string | null;
          answered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inspection_answers"]["Row"]> & {
          inspection_id: string;
          question_id: string;
          section_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["inspection_answers"]["Row"]>;
        Relationships: [];
      };
      inspection_schedules: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string;
          department_id: string | null;
          area_id: string | null;
          template_id: string;
          frequency: ScheduleFrequency;
          custom_rule: Json | null;
          assigned_to: string | null;
          assigned_team_id: string | null;
          next_due_date: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inspection_schedules"]["Row"]> & {
          organization_id: string;
          site_id: string;
          template_id: string;
          frequency: ScheduleFrequency;
          next_due_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["inspection_schedules"]["Row"]>;
        Relationships: [];
      };
      findings: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string;
          department_id: string | null;
          finding_number: string;
          source: FindingSource;
          inspection_id: string | null;
          inspection_answer_id: string | null;
          question_snapshot: string | null;
          description: string;
          severity: FindingSeverity;
          category: string | null;
          detected_by: string | null;
          detected_date: string;
          immediate_action: string | null;
          root_cause: string | null;
          status: FindingStatus;
          assigned_to: string | null;
          sanitation_check_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          closed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["findings"]["Row"]> & {
          organization_id: string;
          site_id: string;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["findings"]["Row"]>;
        Relationships: [];
      };
      capas: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string;
          finding_id: string | null;
          capa_number: string;
          problem_description: string;
          root_cause: string | null;
          action_type: CapaActionType;
          required_action: string;
          assigned_to: string | null;
          owner_id: string | null;
          priority: CapaPriority;
          due_date: string | null;
          status: CapaStatus;
          completion_notes: string | null;
          completed_at: string | null;
          verifier_id: string | null;
          verification_notes: string | null;
          verified_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          closed_at: string | null;
          rejected_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["capas"]["Row"]> & {
          organization_id: string;
          site_id: string;
          problem_description: string;
          required_action: string;
        };
        Update: Partial<Database["public"]["Tables"]["capas"]["Row"]>;
        Relationships: [];
      };
      capa_five_whys: {
        Row: {
          capa_id: string;
          why_1: string | null;
          why_2: string | null;
          why_3: string | null;
          why_4: string | null;
          why_5: string | null;
          final_root_cause: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["capa_five_whys"]["Row"]> & { capa_id: string };
        Update: Partial<Database["public"]["Tables"]["capa_five_whys"]["Row"]>;
        Relationships: [];
      };
      capa_fishbone_causes: {
        Row: {
          id: string;
          capa_id: string;
          category: FishboneCategory;
          cause_text: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["capa_fishbone_causes"]["Row"]> & {
          capa_id: string;
          category: FishboneCategory;
          cause_text: string;
        };
        Update: Partial<Database["public"]["Tables"]["capa_fishbone_causes"]["Row"]>;
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string;
          area_id: string | null;
          department_id: string | null;
          asset_code: string;
          qr_code_token: string;
          name: string;
          name_ar: string | null;
          category: string;
          manufacturer: string | null;
          model: string | null;
          serial_number: string | null;
          installation_date: string | null;
          status: AssetStatus;
          criticality: AssetCriticality;
          warranty_expiry: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["assets"]["Row"]> & {
          organization_id: string;
          site_id: string;
          asset_code: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Row"]>;
        Relationships: [];
      };
      sanitation_stations: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string;
          area_id: string | null;
          department_id: string | null;
          station_code: string;
          qr_code_token: string;
          name: string;
          name_ar: string | null;
          station_type: SanitationStationType;
          status: SanitationStationStatus;
          target_pest: string | null;
          installation_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sanitation_stations"]["Row"]> & {
          organization_id: string;
          site_id: string;
          station_code: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["sanitation_stations"]["Row"]>;
        Relationships: [];
      };
      sanitation_checks: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string;
          station_id: string;
          check_number: string;
          checked_by: string | null;
          checked_at: string;
          activity_level: PestActivityLevel;
          pest_type_observed: string | null;
          cleanliness_status: SanitationCondition | null;
          chemical_used: string | null;
          corrective_action: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sanitation_checks"]["Row"]> & {
          organization_id: string;
          site_id: string;
          station_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["sanitation_checks"]["Row"]>;
        Relationships: [];
      };
      evidence_files: {
        Row: {
          id: string;
          organization_id: string;
          site_id: string | null;
          entity_type: string;
          entity_id: string;
          bucket: string;
          file_path: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          kind: EvidenceKind;
          caption: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["evidence_files"]["Row"]> & {
          entity_type: string;
          entity_id: string;
          file_path: string;
          file_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["evidence_files"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          type: string;
          title: string;
          title_ar: string | null;
          body: string | null;
          body_ar: string | null;
          entity_type: string | null;
          entity_id: string | null;
          is_read: boolean;
          created_at: string;
          read_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          organization_id: string;
          user_id: string;
          type: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          notification_type: string;
          channel: NotificationChannel;
          is_enabled: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["notification_preferences"]["Row"]> & {
          user_id: string;
          organization_id: string;
          notification_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_preferences"]["Row"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          organization_id: string;
          entity_type: string;
          entity_id: string;
          action: AuditAction;
          actor_id: string | null;
          actor_name: string | null;
          old_value: Json | null;
          new_value: Json | null;
          note: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      counters: {
        Row: { organization_id: string; key: string; value: number };
        Insert: { organization_id: string; key: string; value?: number };
        Update: Partial<Database["public"]["Tables"]["counters"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: { p_name: string; p_name_ar: string | null; p_slug: string; p_site_name?: string };
        Returns: string;
      };
      create_template_revision: {
        Args: { p_template_id: string };
        Returns: string;
      };
    };
    Enums: {
      template_status: TemplateStatus;
      question_type: QuestionType;
      inspection_status: InspectionStatus;
      finding_severity: FindingSeverity;
      finding_status: FindingStatus;
      capa_status: CapaStatus;
      asset_status: AssetStatus;
      sanitation_station_type: SanitationStationType;
      sanitation_station_status: SanitationStationStatus;
      pest_activity_level: PestActivityLevel;
      sanitation_condition: SanitationCondition;
    };
  };
}
