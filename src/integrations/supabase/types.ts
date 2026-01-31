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
        Relationships: []
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
