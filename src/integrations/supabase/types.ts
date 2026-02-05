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
      accounts: {
        Row: {
          account_type: string | null
          company_id: number | null
          created_at: string | null
          current_balance: number | null
          description: string | null
          id: number
          initial_balance: number | null
          is_active: boolean | null
          is_main: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          account_type?: string | null
          company_id?: number | null
          created_at?: string | null
          current_balance?: number | null
          description?: string | null
          id?: never
          initial_balance?: number | null
          is_active?: boolean | null
          is_main?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          account_type?: string | null
          company_id?: number | null
          created_at?: string | null
          current_balance?: number | null
          description?: string | null
          id?: never
          initial_balance?: number | null
          is_active?: boolean | null
          is_main?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          company_id: number | null
          created_at: string | null
          id: number
          name: string
          type: string
        }
        Insert: {
          color?: string | null
          company_id?: number | null
          created_at?: string | null
          id?: never
          name: string
          type: string
        }
        Update: {
          color?: string | null
          company_id?: number | null
          created_at?: string | null
          id?: never
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          client_id: number | null
          company_id: number | null
          content: string
          created_at: string | null
          id: number
          is_read: boolean | null
          sender: string
        }
        Insert: {
          client_id?: number | null
          company_id?: number | null
          content: string
          created_at?: string | null
          id?: never
          is_read?: boolean | null
          sender: string
        }
        Update: {
          client_id?: number | null
          company_id?: number | null
          content?: string
          created_at?: string | null
          id?: never
          is_read?: boolean | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string | null
          cep: string | null
          city: string | null
          company_id: number | null
          complement: string | null
          cpf_cnpj: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: number
          name: string
          neighborhood: string | null
          number: string | null
          origem: string | null
          phone: string
          state: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          company_id?: number | null
          complement?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: never
          name: string
          neighborhood?: string | null
          number?: string | null
          origem?: string | null
          phone: string
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          company_id?: number | null
          complement?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: never
          name?: string
          neighborhood?: string | null
          number?: string | null
          origem?: string | null
          phone?: string
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cep: string | null
          city: string | null
          cnpj: string | null
          company_code: string | null
          company_name: string
          complement: string | null
          created_at: string | null
          email: string | null
          id: number
          logo_url: string | null
          max_members: number
          neighborhood: string | null
          number: string | null
          owner_id: string | null
          phone: string
          primary_color: string | null
          state: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          company_code?: string | null
          company_name: string
          complement?: string | null
          created_at?: string | null
          email?: string | null
          id?: never
          logo_url?: string | null
          max_members?: number
          neighborhood?: string | null
          number?: string | null
          owner_id?: string | null
          phone: string
          primary_color?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          company_code?: string | null
          company_name?: string
          complement?: string | null
          created_at?: string | null
          email?: string | null
          id?: never
          logo_url?: string | null
          max_members?: number
          neighborhood?: string | null
          number?: string | null
          owner_id?: string | null
          phone?: string
          primary_color?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_join_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: number
          created_at: string | null
          id: number
          rejected_reason: string | null
          requested_role: string
          requester_email: string
          requester_name: string
          requester_user_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: number
          created_at?: string | null
          id?: never
          rejected_reason?: string | null
          requested_role: string
          requester_email: string
          requester_name: string
          requester_user_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: number
          created_at?: string | null
          id?: never
          rejected_reason?: string | null
          requested_role?: string
          requester_email?: string
          requester_name?: string
          requester_user_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_join_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          cep: string | null
          city: string | null
          cnpj: string | null
          company_id: number | null
          company_name: string | null
          complement: string | null
          created_at: string | null
          email: string | null
          id: number
          logo_url: string | null
          neighborhood: string | null
          number: string | null
          phone: string | null
          primary_color: string | null
          state: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          company_id?: number | null
          company_name?: string | null
          complement?: string | null
          created_at?: string | null
          email?: string | null
          id?: never
          logo_url?: string | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          primary_color?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          company_id?: number | null
          company_name?: string | null
          complement?: string | null
          created_at?: string | null
          email?: string | null
          id?: never
          logo_url?: string | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          primary_color?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consumption_rules: {
        Row: {
          company_id: number | null
          created_at: string | null
          id: number
          material_type: string
          size_g: number | null
          size_m: number | null
          size_p: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          id?: never
          material_type: string
          size_g?: number | null
          size_m?: number | null
          size_p?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          id?: never
          material_type?: string
          size_g?: number | null
          size_m?: number | null
          size_p?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumption_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: number | null
          discount_applied: number
          id: number
          subscription_id: number | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id?: number | null
          discount_applied: number
          id?: never
          subscription_id?: number | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: number | null
          discount_applied?: number
          id?: never
          subscription_id?: number | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: number
          is_active: boolean | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: never
          is_active?: boolean | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: never
          is_active?: boolean | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_until?: string | null
        }
        Relationships: []
      }
      master_actions: {
        Row: {
          action_type: string
          created_at: string | null
          id: number
          new_value: string | null
          old_value: string | null
          performed_by: string | null
          reason: string | null
          target_subscription_id: number | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: never
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          reason?: string | null
          target_subscription_id?: number | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: never
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
          reason?: string | null
          target_subscription_id?: number | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_actions_target_subscription_id_fkey"
            columns: ["target_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          average_cost: number | null
          brand: string | null
          company_id: number | null
          created_at: string | null
          current_stock: number | null
          id: number
          is_active: boolean | null
          minimum_stock: number | null
          name: string
          product_type_id: number | null
          type: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          average_cost?: number | null
          brand?: string | null
          company_id?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: never
          is_active?: boolean | null
          minimum_stock?: number | null
          name: string
          product_type_id?: number | null
          type?: string | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          average_cost?: number | null
          brand?: string | null
          company_id?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: never
          is_active?: boolean | null
          minimum_stock?: number | null
          name?: string
          product_type_id?: number | null
          type?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_events: {
        Row: {
          company_id: number | null
          created_at: string | null
          event_type: string
          from_stage_id: number | null
          id: number
          item_id: number | null
          pipeline_id: number | null
          processed: boolean | null
          processed_at: string | null
          to_stage_id: number | null
          user_id: string | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          event_type: string
          from_stage_id?: number | null
          id?: number
          item_id?: number | null
          pipeline_id?: number | null
          processed?: boolean | null
          processed_at?: string | null
          to_stage_id?: number | null
          user_id?: string | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          event_type?: string
          from_stage_id?: number | null
          id?: number
          item_id?: number | null
          pipeline_id?: number | null
          processed?: boolean | null
          processed_at?: string | null
          to_stage_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pipeline_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_events_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_items: {
        Row: {
          client_id: number | null
          company_id: number | null
          created_at: string | null
          entity_id: number | null
          entity_type: string
          id: number
          is_urgent: boolean | null
          metadata: Json | null
          pipeline_id: number | null
          position: number | null
          responsible_id: string | null
          scheduled_time: string | null
          stage_id: number | null
          title: string
          updated_at: string | null
          value: number | null
          vehicle_id: number | null
        }
        Insert: {
          client_id?: number | null
          company_id?: number | null
          created_at?: string | null
          entity_id?: number | null
          entity_type?: string
          id?: number
          is_urgent?: boolean | null
          metadata?: Json | null
          pipeline_id?: number | null
          position?: number | null
          responsible_id?: string | null
          scheduled_time?: string | null
          stage_id?: number | null
          title: string
          updated_at?: string | null
          value?: number | null
          vehicle_id?: number | null
        }
        Update: {
          client_id?: number | null
          company_id?: number | null
          created_at?: string | null
          entity_id?: number | null
          entity_type?: string
          id?: number
          is_urgent?: boolean | null
          metadata?: Json | null
          pipeline_id?: number | null
          position?: number | null
          responsible_id?: string | null
          scheduled_time?: string | null
          stage_id?: number | null
          title?: string
          updated_at?: string | null
          value?: number | null
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_items_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_items_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stage_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_definitions: {
        Row: {
          color: string | null
          company_id: number | null
          created_at: string | null
          id: number
          is_final: boolean | null
          is_lost: boolean | null
          is_won: boolean | null
          name: string
          notify_client: boolean | null
          pipeline_id: number | null
          position: number | null
        }
        Insert: {
          color?: string | null
          company_id?: number | null
          created_at?: string | null
          id?: number
          is_final?: boolean | null
          is_lost?: boolean | null
          is_won?: boolean | null
          name: string
          notify_client?: boolean | null
          pipeline_id?: number | null
          position?: number | null
        }
        Update: {
          color?: string | null
          company_id?: number | null
          created_at?: string | null
          id?: number
          is_final?: boolean | null
          is_lost?: boolean | null
          is_won?: boolean | null
          name?: string
          notify_client?: boolean | null
          pipeline_id?: number | null
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stage_definitions_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          client_id: number | null
          company_id: number | null
          created_at: string | null
          id: number
          position: number | null
          scheduled_time: string | null
          service_name: string | null
          stage: string
          updated_at: string | null
          vehicle_id: number | null
        }
        Insert: {
          client_id?: number | null
          company_id?: number | null
          created_at?: string | null
          id?: never
          position?: number | null
          scheduled_time?: string | null
          service_name?: string | null
          stage: string
          updated_at?: string | null
          vehicle_id?: number | null
        }
        Update: {
          client_id?: number | null
          company_id?: number | null
          created_at?: string | null
          id?: never
          position?: number | null
          scheduled_time?: string | null
          service_name?: string | null
          stage?: string
          updated_at?: string | null
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          active: boolean | null
          company_id: number | null
          created_at: string | null
          description: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          brand: string
          category: string
          company_id: number
          cost_per_meter: number | null
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          light_transmission: string | null
          model: string | null
          name: string
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          brand: string
          category: string
          company_id: number
          cost_per_meter?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          light_transmission?: string | null
          model?: string | null
          name: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          brand?: string
          category?: string
          company_id?: number
          cost_per_meter?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          light_transmission?: string | null
          model?: string | null
          name?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: number | null
          created_at: string | null
          email: string
          id: number
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: number | null
          created_at?: string | null
          email: string
          id?: never
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: number | null
          created_at?: string | null
          email?: string
          id?: never
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      region_consumption_rules: {
        Row: {
          category: string
          company_id: number
          created_at: string | null
          id: number
          meters_consumed: number
          region_id: number
          updated_at: string | null
          vehicle_size: string
        }
        Insert: {
          category: string
          company_id: number
          created_at?: string | null
          id?: number
          meters_consumed?: number
          region_id: number
          updated_at?: string | null
          vehicle_size: string
        }
        Update: {
          category?: string
          company_id?: number
          created_at?: string | null
          id?: number
          meters_consumed?: number
          region_id?: number
          updated_at?: string | null
          vehicle_size?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_consumption_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_consumption_rules_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "vehicle_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          company_id: number | null
          created_at: string | null
          id: number
          quantity: number | null
          sale_id: number | null
          service_id: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          id?: never
          quantity?: number | null
          sale_id?: number | null
          service_id?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          id?: never
          quantity?: number | null
          sale_id?: number | null
          service_id?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_id: number | null
          company_id: number | null
          created_at: string | null
          discount: number | null
          id: number
          is_open: boolean | null
          observations: string | null
          payment_method: string | null
          sale_date: string
          seller_id: string | null
          status: string | null
          subtotal: number
          total: number
          updated_at: string | null
          vehicle_id: number | null
        }
        Insert: {
          client_id?: number | null
          company_id?: number | null
          created_at?: string | null
          discount?: number | null
          id?: never
          is_open?: boolean | null
          observations?: string | null
          payment_method?: string | null
          sale_date?: string
          seller_id?: string | null
          status?: string | null
          subtotal?: number
          total: number
          updated_at?: string | null
          vehicle_id?: number | null
        }
        Update: {
          client_id?: number | null
          company_id?: number | null
          created_at?: string | null
          discount?: number | null
          id?: never
          is_open?: boolean | null
          observations?: string | null
          payment_method?: string | null
          sale_date?: string
          seller_id?: string | null
          status?: string | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_items_detailed: {
        Row: {
          category: string
          company_id: number
          created_at: string | null
          id: number
          meters_used: number
          notes: string | null
          product_type_id: number
          region_id: number
          sale_id: number
          total_price: number
          unit_price: number
        }
        Insert: {
          category: string
          company_id: number
          created_at?: string | null
          id?: number
          meters_used?: number
          notes?: string | null
          product_type_id: number
          region_id: number
          sale_id: number
          total_price: number
          unit_price: number
        }
        Update: {
          category?: string
          company_id?: number
          created_at?: string | null
          id?: number
          meters_used?: number
          notes?: string | null
          product_type_id?: number
          region_id?: number
          sale_id?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_items_detailed_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_items_detailed_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_items_detailed_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "vehicle_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_items_detailed_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          commission_percentage: number | null
          company_id: number | null
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          commission_percentage?: number | null
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: never
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          commission_percentage?: number | null
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: never
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          client_id: number | null
          company_id: number | null
          created_at: string | null
          discount: number | null
          entry_date: string | null
          entry_time: string | null
          exit_date: string | null
          exit_time: string | null
          has_exited: boolean | null
          id: number
          name: string
          observations: string | null
          payment_status: string | null
          photos: Json | null
          sale_id: number | null
          status: string | null
          tag: string | null
          updated_at: string | null
          vehicle_id: number | null
        }
        Insert: {
          client_id?: number | null
          company_id?: number | null
          created_at?: string | null
          discount?: number | null
          entry_date?: string | null
          entry_time?: string | null
          exit_date?: string | null
          exit_time?: string | null
          has_exited?: boolean | null
          id?: never
          name: string
          observations?: string | null
          payment_status?: string | null
          photos?: Json | null
          sale_id?: number | null
          status?: string | null
          tag?: string | null
          updated_at?: string | null
          vehicle_id?: number | null
        }
        Update: {
          client_id?: number | null
          company_id?: number | null
          created_at?: string | null
          discount?: number | null
          entry_date?: string | null
          entry_time?: string | null
          exit_date?: string | null
          exit_time?: string | null
          has_exited?: boolean | null
          id?: never
          name?: string
          observations?: string | null
          payment_status?: string | null
          photos?: Json | null
          sale_id?: number | null
          status?: string | null
          tag?: string | null
          updated_at?: string | null
          vehicle_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spaces_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: number | null
          created_at: string | null
          id: number
          material_id: number | null
          movement_type: string
          quantity: number
          reason: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          id?: never
          material_id?: number | null
          movement_type: string
          quantity: number
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          id?: never
          material_id?: number | null
          movement_type?: string
          quantity?: number
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: number | null
          color: string | null
          company_id: number | null
          created_at: string | null
          id: number
          name: string
          type: string
        }
        Insert: {
          category_id?: number | null
          color?: string | null
          company_id?: number | null
          created_at?: string | null
          id?: never
          name: string
          type: string
        }
        Update: {
          category_id?: number | null
          color?: string | null
          company_id?: number | null
          created_at?: string | null
          id?: never
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcategories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          company_id: number | null
          coupon_code: string | null
          created_at: string | null
          discount_amount: number | null
          expires_at: string | null
          final_price: number | null
          id: number
          payment_confirmed_at: string | null
          payment_method: string | null
          plan_name: string | null
          plan_price: number | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: number | null
          coupon_code?: string | null
          created_at?: string | null
          discount_amount?: number | null
          expires_at?: string | null
          final_price?: number | null
          id?: never
          payment_confirmed_at?: string | null
          payment_method?: string | null
          plan_name?: string | null
          plan_price?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: number | null
          coupon_code?: string | null
          created_at?: string | null
          discount_amount?: number | null
          expires_at?: string | null
          final_price?: number | null
          id?: never
          payment_confirmed_at?: string | null
          payment_method?: string | null
          plan_name?: string | null
          plan_price?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          account: string | null
          agency: string | null
          bank_name: string | null
          beneficiary_cnpj: string | null
          beneficiary_name: string | null
          created_at: string | null
          id: number
          monthly_price: number | null
          pix_key: string | null
          pix_qr_code_url: string | null
          updated_at: string | null
        }
        Insert: {
          account?: string | null
          agency?: string | null
          bank_name?: string | null
          beneficiary_cnpj?: string | null
          beneficiary_name?: string | null
          created_at?: string | null
          id?: number
          monthly_price?: number | null
          pix_key?: string | null
          pix_qr_code_url?: string | null
          updated_at?: string | null
        }
        Update: {
          account?: string | null
          agency?: string | null
          bank_name?: string | null
          beneficiary_cnpj?: string | null
          beneficiary_name?: string | null
          created_at?: string | null
          id?: number
          monthly_price?: number | null
          pix_key?: string | null
          pix_qr_code_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: number | null
          amount: number
          category_id: number | null
          company_id: number | null
          created_at: string | null
          description: string | null
          id: number
          is_paid: boolean | null
          name: string
          payment_method: string | null
          sale_id: number | null
          subcategory_id: number | null
          transaction_date: string
          type: string
          updated_at: string | null
        }
        Insert: {
          account_id?: number | null
          amount: number
          category_id?: number | null
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: never
          is_paid?: boolean | null
          name: string
          payment_method?: string | null
          sale_id?: number | null
          subcategory_id?: number | null
          transaction_date: string
          type: string
          updated_at?: string | null
        }
        Update: {
          account_id?: number | null
          amount?: number
          category_id?: number | null
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: never
          is_paid?: boolean | null
          name?: string
          payment_method?: string | null
          sale_id?: number | null
          subcategory_id?: number | null
          transaction_date?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          company_id: number | null
          created_at: string | null
          description: string | null
          from_account_id: number | null
          id: number
          to_account_id: number | null
          transfer_date: string
        }
        Insert: {
          amount: number
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          from_account_id?: number | null
          id?: never
          to_account_id?: number | null
          transfer_date: string
        }
        Update: {
          amount?: number
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          from_account_id?: number | null
          id?: never
          to_account_id?: number | null
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: never
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: never
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_regions: {
        Row: {
          category: string
          company_id: number
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          category: string
          company_id: number
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          company_id?: number
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_regions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          client_id: number | null
          color: string | null
          company_id: number | null
          created_at: string | null
          id: number
          model: string
          plate: string | null
          size: string | null
          year: number | null
        }
        Insert: {
          brand: string
          client_id?: number | null
          color?: string | null
          company_id?: number | null
          created_at?: string | null
          id?: never
          model: string
          plate?: string | null
          size?: string | null
          year?: number | null
        }
        Update: {
          brand?: string
          client_id?: number | null
          color?: string | null
          company_id?: number | null
          created_at?: string | null
          id?: never
          model?: string
          plate?: string | null
          size?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          client_id: number | null
          company_id: number | null
          created_at: string | null
          expiry_date: string
          id: number
          issue_date: string
          sale_id: number | null
          status: string | null
          vehicle_id: number | null
          warranty_text: string | null
          warranty_type: string
        }
        Insert: {
          client_id?: number | null
          company_id?: number | null
          created_at?: string | null
          expiry_date: string
          id?: never
          issue_date: string
          sale_id?: number | null
          status?: string | null
          vehicle_id?: number | null
          warranty_text?: string | null
          warranty_type: string
        }
        Update: {
          client_id?: number | null
          company_id?: number | null
          created_at?: string | null
          expiry_date?: string
          id?: never
          issue_date?: string
          sale_id?: number | null
          status?: string | null
          vehicle_id?: number | null
          warranty_text?: string | null
          warranty_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_services: {
        Row: {
          company_id: number
          created_at: string | null
          description: string | null
          id: number
          instructions: string | null
          is_active: boolean | null
          name: string
          updated_at: string | null
          warranty_template_id: number | null
        }
        Insert: {
          company_id: number
          created_at?: string | null
          description?: string | null
          id?: number
          instructions?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          warranty_template_id?: number | null
        }
        Update: {
          company_id?: number
          created_at?: string | null
          description?: string | null
          id?: number
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          warranty_template_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_services_warranty_template_id_fkey"
            columns: ["warranty_template_id"]
            isOneToOne: false
            referencedRelation: "warranty_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_templates: {
        Row: {
          company_id: number | null
          coverage: string | null
          created_at: string | null
          id: number
          name: string
          restrictions: string | null
          service_id: number | null
          terms: string | null
          updated_at: string | null
          validity_months: number
        }
        Insert: {
          company_id?: number | null
          coverage?: string | null
          created_at?: string | null
          id?: never
          name: string
          restrictions?: string | null
          service_id?: number | null
          terms?: string | null
          updated_at?: string | null
          validity_months: number
        }
        Update: {
          company_id?: number | null
          coverage?: string | null
          created_at?: string | null
          id?: never
          name?: string
          restrictions?: string | null
          service_id?: number | null
          terms?: string | null
          updated_at?: string | null
          validity_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "warranty_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          api_key: string | null
          company_id: number | null
          created_at: string | null
          id: number
          instance_id: string | null
          instance_name: string
          last_connected_at: string | null
          phone_name: string | null
          phone_number: string | null
          qr_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          company_id?: number | null
          created_at?: string | null
          id?: number
          instance_id?: string | null
          instance_name: string
          last_connected_at?: string | null
          phone_name?: string | null
          phone_number?: string | null
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          company_id?: number | null
          created_at?: string | null
          id?: number
          instance_id?: string | null
          instance_name?: string
          last_connected_at?: string | null
          phone_name?: string | null
          phone_number?: string | null
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          channel: string | null
          company_id: number | null
          content: string
          created_at: string | null
          error_message: string | null
          id: number
          instance_id: number | null
          related_client_id: number | null
          related_pipeline_item: number | null
          sent_at: string | null
          status: string | null
          template_name: string | null
          to_phone: string
        }
        Insert: {
          channel?: string | null
          company_id?: number | null
          content: string
          created_at?: string | null
          error_message?: string | null
          id?: number
          instance_id?: number | null
          related_client_id?: number | null
          related_pipeline_item?: number | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          to_phone: string
        }
        Update: {
          channel?: string | null
          company_id?: number | null
          content?: string
          created_at?: string | null
          error_message?: string | null
          id?: number
          instance_id?: number | null
          related_client_id?: number | null
          related_pipeline_item?: number | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          to_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_related_pipeline_item_fkey"
            columns: ["related_pipeline_item"]
            isOneToOne: false
            referencedRelation: "pipeline_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_coupon: {
        Args: {
          coupon_code_input: string
          p_discount_applied: number
          p_subscription_id: number
          p_user_id: string
        }
        Returns: undefined
      }
      approve_company_join_request: {
        Args: { request_id_input: number }
        Returns: undefined
      }
      count_company_members: {
        Args: { company_id_input: number }
        Returns: number
      }
      generate_company_code: { Args: never; Returns: string }
      get_company_by_code: {
        Args: { code_input: string }
        Returns: {
          company_name: string
          id: number
        }[]
      }
      get_subscription_status: { Args: { _user_id: string }; Returns: string }
      get_user_company_id: { Args: { _user_id: string }; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master_account: { Args: { _user_id: string }; Returns: boolean }
      master_change_expiry_date: {
        Args: {
          new_expiry_input: string
          reason_input: string
          subscription_id_input: number
        }
        Returns: undefined
      }
      master_change_member_limit: {
        Args: {
          company_id_input: number
          new_limit_input: number
          reason_input: string
        }
        Returns: undefined
      }
      master_change_subscription_price: {
        Args: {
          new_price_input: number
          reason_input: string
          subscription_id_input: number
        }
        Returns: undefined
      }
      master_toggle_subscription_status: {
        Args: {
          new_status_input: string
          reason_input: string
          subscription_id_input: number
        }
        Returns: undefined
      }
      reject_company_join_request: {
        Args: { reason_input?: string; request_id_input: number }
        Returns: undefined
      }
      validate_coupon: {
        Args: { coupon_code_input: string }
        Returns: {
          discount_type: string
          discount_value: number
          is_valid: boolean
          message: string
        }[]
      }
    }
    Enums: {
      app_role: "ADMIN" | "VENDEDOR" | "PRODUCAO" | "NENHUM"
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
      app_role: ["ADMIN", "VENDEDOR", "PRODUCAO", "NENHUM"],
    },
  },
} as const
