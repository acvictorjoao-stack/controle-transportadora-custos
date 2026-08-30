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
      branches: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_headquarters: boolean
          metadata: Json
          name: string
          notes: string | null
          phone: string | null
          responsible_name: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tax_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_headquarters?: boolean
          metadata?: Json
          name: string
          notes?: string | null
          phone?: string | null
          responsible_name?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_headquarters?: boolean
          metadata?: Json
          name?: string
          notes?: string | null
          phone?: string | null
          responsible_name?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_country: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          legal_name: string
          logo_url: string | null
          municipal_registration: string | null
          phone: string | null
          provision_error: string | null
          provision_status: Database["public"]["Enums"]["provision_status"]
          provisioned_at: string | null
          settings: Json
          slug: string
          state_registration: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tax_id: string
          trade_name: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          legal_name: string
          logo_url?: string | null
          municipal_registration?: string | null
          phone?: string | null
          provision_error?: string | null
          provision_status?: Database["public"]["Enums"]["provision_status"]
          provisioned_at?: string | null
          settings?: Json
          slug: string
          state_registration?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id: string
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          legal_name?: string
          logo_url?: string | null
          municipal_registration?: string | null
          phone?: string | null
          provision_error?: string | null
          provision_status?: Database["public"]["Enums"]["provision_status"]
          provisioned_at?: string | null
          settings?: Json
          slug?: string
          state_registration?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          default_branch_id: string | null
          deleted_at: string | null
          id: string
          invited_at: string | null
          notes: string | null
          profile_id: string
          role_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          default_branch_id?: string | null
          deleted_at?: string | null
          id?: string
          invited_at?: string | null
          notes?: string | null
          profile_id: string
          role_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_branch_id?: string | null
          deleted_at?: string | null
          id?: string
          invited_at?: string | null
          notes?: string | null
          profile_id?: string
          role_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_default_branch_id_fkey"
            columns: ["default_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_system: boolean
          metadata: Json
          name: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          metadata?: Json
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          metadata?: Json
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_type: Database["public"]["Enums"]["customer_address_type"]
          branch_id: string | null
          city: string | null
          company_id: string
          complement: string | null
          country: string
          created_at: string
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          id: string
          is_primary: boolean
          label: string | null
          metadata: Json
          neighborhood: string | null
          number: string | null
          state: string | null
          status: Database["public"]["Enums"]["entity_status"]
          street: string | null
          updated_at: string
          updated_by: string | null
          zip_code: string | null
        }
        Insert: {
          address_type?: Database["public"]["Enums"]["customer_address_type"]
          branch_id?: string | null
          city?: string | null
          company_id: string
          complement?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          metadata?: Json
          neighborhood?: string | null
          number?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          street?: string | null
          updated_at?: string
          updated_by?: string | null
          zip_code?: string | null
        }
        Update: {
          address_type?: Database["public"]["Enums"]["customer_address_type"]
          branch_id?: string | null
          city?: string | null
          company_id?: string
          complement?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          metadata?: Json
          neighborhood?: string | null
          number?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          street?: string | null
          updated_at?: string
          updated_by?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          email: string | null
          id: string
          is_primary: boolean
          job_title: string | null
          metadata: Json
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          metadata?: Json
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          metadata?: Json
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contract_items: {
        Row: {
          additional_value: number | null
          branch_id: string | null
          company_id: string
          contract_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_days: number | null
          destination: string | null
          freight_value: number | null
          gris_percent: number | null
          id: string
          insurance_percent: number | null
          metadata: Json
          minimum_value: number | null
          origin: string | null
          status: Database["public"]["Enums"]["entity_status"]
          toll_included: boolean
          updated_at: string
          updated_by: string | null
          volume_m3: number | null
          weight_kg: number | null
        }
        Insert: {
          additional_value?: number | null
          branch_id?: string | null
          company_id: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_days?: number | null
          destination?: string | null
          freight_value?: number | null
          gris_percent?: number | null
          id?: string
          insurance_percent?: number | null
          metadata?: Json
          minimum_value?: number | null
          origin?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          toll_included?: boolean
          updated_at?: string
          updated_by?: string | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Update: {
          additional_value?: number | null
          branch_id?: string | null
          company_id?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_days?: number | null
          destination?: string | null
          freight_value?: number | null
          gris_percent?: number | null
          id?: string
          insurance_percent?: number | null
          metadata?: Json
          minimum_value?: number | null
          origin?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          toll_included?: boolean
          updated_at?: string
          updated_by?: string | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contract_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contract_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "customer_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contract_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contract_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contracts: {
        Row: {
          branch_id: string | null
          company_id: string
          contract_number: string
          contract_status: Database["public"]["Enums"]["customer_contract_status"]
          contract_type: Database["public"]["Enums"]["customer_contract_type"]
          contracted_revenue: number
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          deleted_at: string | null
          ends_at: string | null
          external_id: string | null
          freight_table: string | null
          id: string
          integration_source: string | null
          metadata: Json
          notes: string | null
          readjustment_index: Database["public"]["Enums"]["customer_readjustment_index"]
          readjustment_notes: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          contract_number: string
          contract_status?: Database["public"]["Enums"]["customer_contract_status"]
          contract_type?: Database["public"]["Enums"]["customer_contract_type"]
          contracted_revenue?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          deleted_at?: string | null
          ends_at?: string | null
          external_id?: string | null
          freight_table?: string | null
          id?: string
          integration_source?: string | null
          metadata?: Json
          notes?: string | null
          readjustment_index?: Database["public"]["Enums"]["customer_readjustment_index"]
          readjustment_notes?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          contract_number?: string
          contract_status?: Database["public"]["Enums"]["customer_contract_status"]
          contract_type?: Database["public"]["Enums"]["customer_contract_type"]
          contracted_revenue?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          deleted_at?: string | null
          ends_at?: string | null
          external_id?: string | null
          freight_table?: string | null
          id?: string
          integration_source?: string | null
          metadata?: Json
          notes?: string | null
          readjustment_index?: Database["public"]["Enums"]["customer_readjustment_index"]
          readjustment_notes?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contracts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contracts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          branch_id: string | null
          company_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["customer_document_type"]
          file_size: number | null
          file_url: string
          id: string
          metadata: Json
          mime_type: string | null
          name: string
          status: Database["public"]["Enums"]["entity_status"]
          storage_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["customer_document_type"]
          file_size?: number | null
          file_url: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["customer_document_type"]
          file_size?: number | null
          file_url?: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
          storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "customer_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_history: {
        Row: {
          action: string
          branch_id: string | null
          changes: Json
          company_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          id: string
          metadata: Json
          new_contract_status:
            | Database["public"]["Enums"]["customer_contract_status"]
            | null
          new_customer_status:
            | Database["public"]["Enums"]["customer_status"]
            | null
          previous_contract_status:
            | Database["public"]["Enums"]["customer_contract_status"]
            | null
          previous_customer_status:
            | Database["public"]["Enums"]["customer_status"]
            | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action: string
          branch_id?: string | null
          changes?: Json
          company_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          new_contract_status?:
            | Database["public"]["Enums"]["customer_contract_status"]
            | null
          new_customer_status?:
            | Database["public"]["Enums"]["customer_status"]
            | null
          previous_contract_status?:
            | Database["public"]["Enums"]["customer_contract_status"]
            | null
          previous_customer_status?:
            | Database["public"]["Enums"]["customer_status"]
            | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action?: string
          branch_id?: string | null
          changes?: Json
          company_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          new_contract_status?:
            | Database["public"]["Enums"]["customer_contract_status"]
            | null
          new_customer_status?:
            | Database["public"]["Enums"]["customer_status"]
            | null
          previous_contract_status?:
            | Database["public"]["Enums"]["customer_contract_status"]
            | null
          previous_customer_status?:
            | Database["public"]["Enums"]["customer_status"]
            | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "customer_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_history_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          credit_limit: number | null
          customer_status: Database["public"]["Enums"]["customer_status"]
          deleted_at: string | null
          email: string | null
          external_id: string | null
          id: string
          integration_source: string | null
          legal_name: string
          metadata: Json
          municipal_registration: string | null
          notes: string | null
          payment_term_days: number | null
          phone: string | null
          sales_representative: string | null
          segment: Database["public"]["Enums"]["customer_segment"] | null
          state_registration: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tax_id: string | null
          trade_name: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          customer_status?: Database["public"]["Enums"]["customer_status"]
          deleted_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          integration_source?: string | null
          legal_name: string
          metadata?: Json
          municipal_registration?: string | null
          notes?: string | null
          payment_term_days?: number | null
          phone?: string | null
          sales_representative?: string | null
          segment?: Database["public"]["Enums"]["customer_segment"] | null
          state_registration?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          customer_status?: Database["public"]["Enums"]["customer_status"]
          deleted_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          integration_source?: string | null
          legal_name?: string
          metadata?: Json
          municipal_registration?: string | null
          notes?: string | null
          payment_term_days?: number | null
          phone?: string | null
          sales_representative?: string | null
          segment?: Database["public"]["Enums"]["customer_segment"] | null
          state_registration?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_documents: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["driver_document_type"]
          driver_id: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          name: string
          storage_path: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["driver_document_type"]
          driver_id: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          name: string
          storage_path?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["driver_document_type"]
          driver_id?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          name?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_history: {
        Row: {
          action: string
          changes: Json
          company_id: string
          created_at: string
          created_by: string | null
          driver_id: string
          id: string
          new_operational_status:
            | Database["public"]["Enums"]["driver_operational_status"]
            | null
          previous_operational_status:
            | Database["public"]["Enums"]["driver_operational_status"]
            | null
        }
        Insert: {
          action: string
          changes?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          driver_id: string
          id?: string
          new_operational_status?:
            | Database["public"]["Enums"]["driver_operational_status"]
            | null
          previous_operational_status?:
            | Database["public"]["Enums"]["driver_operational_status"]
            | null
        }
        Update: {
          action?: string
          changes?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          driver_id?: string
          id?: string
          new_operational_status?:
            | Database["public"]["Enums"]["driver_operational_status"]
            | null
          previous_operational_status?:
            | Database["public"]["Enums"]["driver_operational_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address: string | null
          birth_date: string | null
          branch_id: string | null
          city: string | null
          cnh_number: string
          company_id: string
          contract_type:
            | Database["public"]["Enums"]["driver_contract_type"]
            | null
          cpf: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          ear: boolean
          email: string | null
          emergency_contact: string | null
          external_id: string | null
          hired_at: string | null
          id: string
          integration_source: string | null
          license_category: Database["public"]["Enums"]["driver_license_category"]
          license_expires_at: string | null
          license_issued_at: string | null
          metadata: Json
          name: string
          notes: string | null
          operational_status: Database["public"]["Enums"]["driver_operational_status"]
          phone: string | null
          photo_storage_path: string | null
          photo_url: string | null
          rg: string | null
          state: string | null
          status: Database["public"]["Enums"]["entity_status"]
          terminated_at: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          branch_id?: string | null
          city?: string | null
          cnh_number: string
          company_id: string
          contract_type?:
            | Database["public"]["Enums"]["driver_contract_type"]
            | null
          cpf: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ear?: boolean
          email?: string | null
          emergency_contact?: string | null
          external_id?: string | null
          hired_at?: string | null
          id?: string
          integration_source?: string | null
          license_category: Database["public"]["Enums"]["driver_license_category"]
          license_expires_at?: string | null
          license_issued_at?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          operational_status?: Database["public"]["Enums"]["driver_operational_status"]
          phone?: string | null
          photo_storage_path?: string | null
          photo_url?: string | null
          rg?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          terminated_at?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          branch_id?: string | null
          city?: string | null
          cnh_number?: string
          company_id?: string
          contract_type?:
            | Database["public"]["Enums"]["driver_contract_type"]
            | null
          cpf?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ear?: boolean
          email?: string | null
          emergency_contact?: string | null
          external_id?: string | null
          hired_at?: string | null
          id?: string
          integration_source?: string | null
          license_category?: Database["public"]["Enums"]["driver_license_category"]
          license_expires_at?: string | null
          license_issued_at?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          operational_status?: Database["public"]["Enums"]["driver_operational_status"]
          phone?: string | null
          photo_storage_path?: string | null
          photo_url?: string | null
          rg?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          terminated_at?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_branch_company_fkey"
            columns: ["company_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          branch_id: string | null
          company_id: string
          contract_type:
            | Database["public"]["Enums"]["employee_contract_type"]
            | null
          cost_center_id: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          hired_at: string | null
          id: string
          metadata: Json
          name: string
          notes: string | null
          phone: string | null
          position_id: string | null
          registration_number: string | null
          status: Database["public"]["Enums"]["entity_status"]
          terminated_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          contract_type?:
            | Database["public"]["Enums"]["employee_contract_type"]
            | null
          cost_center_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          hired_at?: string | null
          id?: string
          metadata?: Json
          name: string
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          registration_number?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          terminated_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          contract_type?:
            | Database["public"]["Enums"]["employee_contract_type"]
            | null
          cost_center_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          hired_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          registration_number?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          terminated_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_company_fkey"
            columns: ["company_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_cost_center_company_fkey"
            columns: ["company_id", "cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_company_fkey"
            columns: ["company_id", "position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "employees_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          driver_id: string | null
          fuel_record_id: string | null
          id: string
          is_system: boolean
          maintenance_record_id: string | null
          metadata: Json
          name: string
          slug: Database["public"]["Enums"]["financial_category_slug"] | null
          status: Database["public"]["Enums"]["entity_status"]
          tire_id: string | null
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          driver_id?: string | null
          fuel_record_id?: string | null
          id?: string
          is_system?: boolean
          maintenance_record_id?: string | null
          metadata?: Json
          name: string
          slug?: Database["public"]["Enums"]["financial_category_slug"] | null
          status?: Database["public"]["Enums"]["entity_status"]
          tire_id?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          driver_id?: string | null
          fuel_record_id?: string | null
          id?: string
          is_system?: boolean
          maintenance_record_id?: string | null
          metadata?: Json
          name?: string
          slug?: Database["public"]["Enums"]["financial_category_slug"] | null
          status?: Database["public"]["Enums"]["entity_status"]
          tire_id?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_fuel_record_id_fkey"
            columns: ["fuel_record_id"]
            isOneToOne: false
            referencedRelation: "fuel_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_cost_centers: {
        Row: {
          branch_id: string | null
          center_type: Database["public"]["Enums"]["financial_cost_center_type"]
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          driver_id: string | null
          fuel_record_id: string | null
          id: string
          is_system: boolean
          maintenance_record_id: string | null
          metadata: Json
          name: string
          reference_id: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tire_id: string | null
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          branch_id?: string | null
          center_type: Database["public"]["Enums"]["financial_cost_center_type"]
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          driver_id?: string | null
          fuel_record_id?: string | null
          id?: string
          is_system?: boolean
          maintenance_record_id?: string | null
          metadata?: Json
          name: string
          reference_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tire_id?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          branch_id?: string | null
          center_type?: Database["public"]["Enums"]["financial_cost_center_type"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          driver_id?: string | null
          fuel_record_id?: string | null
          id?: string
          is_system?: boolean
          maintenance_record_id?: string | null
          metadata?: Json
          name?: string
          reference_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tire_id?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_cost_centers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_fuel_record_id_fkey"
            columns: ["fuel_record_id"]
            isOneToOne: false
            referencedRelation: "fuel_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cost_centers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_documents: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["financial_document_type"]
          driver_id: string | null
          file_size: number | null
          file_url: string
          financial_entry_id: string
          fuel_record_id: string | null
          id: string
          maintenance_record_id: string | null
          metadata: Json
          mime_type: string | null
          name: string
          storage_path: string | null
          tire_id: string | null
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["financial_document_type"]
          driver_id?: string | null
          file_size?: number | null
          file_url: string
          financial_entry_id: string
          fuel_record_id?: string | null
          id?: string
          maintenance_record_id?: string | null
          metadata?: Json
          mime_type?: string | null
          name: string
          storage_path?: string | null
          tire_id?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["financial_document_type"]
          driver_id?: string | null
          file_size?: number | null
          file_url?: string
          financial_entry_id?: string
          fuel_record_id?: string | null
          id?: string
          maintenance_record_id?: string | null
          metadata?: Json
          mime_type?: string | null
          name?: string
          storage_path?: string | null
          tire_id?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_fuel_record_id_fkey"
            columns: ["fuel_record_id"]
            isOneToOne: false
            referencedRelation: "fuel_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount: number
          analytical_center_id: string | null
          branch_id: string | null
          category_id: string | null
          client: string | null
          company_id: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_contract_id: string | null
          customer_id: string | null
          deleted_at: string | null
          description: string | null
          driver_id: string | null
          due_date: string | null
          entry_date: string
          entry_status: Database["public"]["Enums"]["financial_entry_status"]
          entry_type: Database["public"]["Enums"]["financial_entry_type"]
          external_id: string | null
          fuel_record_id: string | null
          id: string
          installment_number: number | null
          installment_total: number | null
          integration_source: string | null
          is_system_generated: boolean
          maintenance_record_id: string | null
          metadata: Json
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          reference_number: string | null
          reversed_entry_id: string | null
          source_id: string | null
          source_module: string | null
          status: Database["public"]["Enums"]["entity_status"]
          supplier: string | null
          supplier_id: string | null
          tire_id: string | null
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          analytical_center_id?: string | null
          branch_id?: string | null
          category_id?: string | null
          client?: string | null
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_contract_id?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          description?: string | null
          driver_id?: string | null
          due_date?: string | null
          entry_date?: string
          entry_status?: Database["public"]["Enums"]["financial_entry_status"]
          entry_type: Database["public"]["Enums"]["financial_entry_type"]
          external_id?: string | null
          fuel_record_id?: string | null
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          integration_source?: string | null
          is_system_generated?: boolean
          maintenance_record_id?: string | null
          metadata?: Json
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          reference_number?: string | null
          reversed_entry_id?: string | null
          source_id?: string | null
          source_module?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          supplier?: string | null
          supplier_id?: string | null
          tire_id?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          analytical_center_id?: string | null
          branch_id?: string | null
          category_id?: string | null
          client?: string | null
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_contract_id?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          description?: string | null
          driver_id?: string | null
          due_date?: string | null
          entry_date?: string
          entry_status?: Database["public"]["Enums"]["financial_entry_status"]
          entry_type?: Database["public"]["Enums"]["financial_entry_type"]
          external_id?: string | null
          fuel_record_id?: string | null
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          integration_source?: string | null
          is_system_generated?: boolean
          maintenance_record_id?: string | null
          metadata?: Json
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          reference_number?: string | null
          reversed_entry_id?: string | null
          source_id?: string | null
          source_module?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          supplier?: string | null
          supplier_id?: string | null
          tire_id?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_analytical_center_id_fkey"
            columns: ["analytical_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_customer_contract_id_fkey"
            columns: ["customer_contract_id"]
            isOneToOne: false
            referencedRelation: "customer_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_fuel_record_id_fkey"
            columns: ["fuel_record_id"]
            isOneToOne: false
            referencedRelation: "fuel_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_reversed_entry_id_fkey"
            columns: ["reversed_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_history: {
        Row: {
          action: string
          branch_id: string | null
          changes: Json
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          driver_id: string | null
          financial_entry_id: string
          fuel_record_id: string | null
          id: string
          maintenance_record_id: string | null
          tire_id: string | null
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          action: string
          branch_id?: string | null
          changes?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          financial_entry_id: string
          fuel_record_id?: string | null
          id?: string
          maintenance_record_id?: string | null
          tire_id?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          action?: string
          branch_id?: string | null
          changes?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          financial_entry_id?: string
          fuel_record_id?: string | null
          id?: string
          maintenance_record_id?: string | null
          tire_id?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_fuel_record_id_fkey"
            columns: ["fuel_record_id"]
            isOneToOne: false
            referencedRelation: "fuel_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_documents: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["fuel_document_type"]
          driver_id: string | null
          file_size: number | null
          file_url: string
          fuel_record_id: string
          id: string
          mime_type: string | null
          name: string
          storage_path: string | null
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["fuel_document_type"]
          driver_id?: string | null
          file_size?: number | null
          file_url: string
          fuel_record_id: string
          id?: string
          mime_type?: string | null
          name: string
          storage_path?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["fuel_document_type"]
          driver_id?: string | null
          file_size?: number | null
          file_url?: string
          fuel_record_id?: string
          id?: string
          mime_type?: string | null
          name?: string
          storage_path?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_documents_fuel_record_id_fkey"
            columns: ["fuel_record_id"]
            isOneToOne: false
            referencedRelation: "fuel_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_history: {
        Row: {
          action: string
          branch_id: string | null
          changes: Json
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          driver_id: string | null
          fuel_record_id: string
          id: string
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          action: string
          branch_id?: string | null
          changes?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          fuel_record_id: string
          id?: string
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          action?: string
          branch_id?: string | null
          changes?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          fuel_record_id?: string
          id?: string
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_history_fuel_record_id_fkey"
            columns: ["fuel_record_id"]
            isOneToOne: false
            referencedRelation: "fuel_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_history_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_records: {
        Row: {
          autonomy_km: number | null
          branch_id: string | null
          city: string | null
          company_id: string
          consumption_l_per_100km: number | null
          cost_per_km: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          driver_id: string
          external_id: string | null
          fuel_type: Database["public"]["Enums"]["vehicle_fuel_type"]
          fueled_at: string
          hour_meter: number | null
          id: string
          inconsistency_flags: Database["public"]["Enums"]["fuel_inconsistency_flag"][]
          installment_count: number
          installment_interval_days: number
          integration_source: string | null
          is_inconsistent: boolean
          km_per_liter: number | null
          km_traveled: number | null
          metadata: Json
          notes: string | null
          odometer_km: number | null
          payment_due_date: string | null
          payment_type: string
          price_per_liter: number
          quantity_liters: number
          responsible: string | null
          state: string | null
          station_brand: string | null
          station_name: string | null
          status: Database["public"]["Enums"]["entity_status"]
          supplier_id: string | null
          total_amount: number
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string
        }
        Insert: {
          autonomy_km?: number | null
          branch_id?: string | null
          city?: string | null
          company_id: string
          consumption_l_per_100km?: number | null
          cost_per_km?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id: string
          external_id?: string | null
          fuel_type: Database["public"]["Enums"]["vehicle_fuel_type"]
          fueled_at?: string
          hour_meter?: number | null
          id?: string
          inconsistency_flags?: Database["public"]["Enums"]["fuel_inconsistency_flag"][]
          installment_count?: number
          installment_interval_days?: number
          integration_source?: string | null
          is_inconsistent?: boolean
          km_per_liter?: number | null
          km_traveled?: number | null
          metadata?: Json
          notes?: string | null
          odometer_km?: number | null
          payment_due_date?: string | null
          payment_type?: string
          price_per_liter: number
          quantity_liters: number
          responsible?: string | null
          state?: string | null
          station_brand?: string | null
          station_name?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          supplier_id?: string | null
          total_amount: number
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id: string
        }
        Update: {
          autonomy_km?: number | null
          branch_id?: string | null
          city?: string | null
          company_id?: string
          consumption_l_per_100km?: number | null
          cost_per_km?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string
          external_id?: string | null
          fuel_type?: Database["public"]["Enums"]["vehicle_fuel_type"]
          fueled_at?: string
          hour_meter?: number | null
          id?: string
          inconsistency_flags?: Database["public"]["Enums"]["fuel_inconsistency_flag"][]
          installment_count?: number
          installment_interval_days?: number
          integration_source?: string | null
          is_inconsistent?: boolean
          km_per_liter?: number | null
          km_traveled?: number | null
          metadata?: Json
          notes?: string | null
          odometer_km?: number | null
          payment_due_date?: string | null
          payment_type?: string
          price_per_liter?: number
          quantity_liters?: number
          responsible?: string | null
          state?: string | null
          station_brand?: string | null
          station_name?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          supplier_id?: string | null
          total_amount?: number
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_records_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_records_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_documents: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["maintenance_document_type"]
          driver_id: string | null
          file_size: number | null
          file_url: string
          id: string
          maintenance_record_id: string
          mime_type: string | null
          name: string
          storage_path: string | null
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["maintenance_document_type"]
          driver_id?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          maintenance_record_id: string
          mime_type?: string | null
          name: string
          storage_path?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["maintenance_document_type"]
          driver_id?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          maintenance_record_id?: string
          mime_type?: string | null
          name?: string
          storage_path?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_documents_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_history: {
        Row: {
          action: string
          branch_id: string | null
          changes: Json
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          driver_id: string | null
          id: string
          maintenance_record_id: string
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          action: string
          branch_id?: string | null
          changes?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          id?: string
          maintenance_record_id: string
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          action?: string
          branch_id?: string | null
          changes?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          id?: string
          maintenance_record_id?: string
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_parts: {
        Row: {
          branch_id: string | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          driver_id: string | null
          id: string
          maintenance_record_id: string
          name: string
          quantity: number
          supplier: string | null
          total_price: number
          trip_id: string | null
          unit_price: number
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
          warranty_until: string | null
        }
        Insert: {
          branch_id?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          id?: string
          maintenance_record_id: string
          name: string
          quantity?: number
          supplier?: string | null
          total_price?: number
          trip_id?: string | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          warranty_until?: string | null
        }
        Update: {
          branch_id?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          id?: string
          maintenance_record_id?: string
          name?: string
          quantity?: number
          supplier?: string | null
          total_price?: number
          trip_id?: string | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_parts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          branch_id: string | null
          company_id: string
          completed_at: string | null
          cost_per_km: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          diagnosis: string | null
          downtime_hours: number | null
          driver_id: string | null
          estimated_amount: number | null
          external_id: string | null
          final_amount: number | null
          hour_meter: number | null
          id: string
          installment_count: number
          installment_interval_days: number
          integration_source: string | null
          maintenance_status: Database["public"]["Enums"]["maintenance_status"]
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          metadata: Json
          notes: string | null
          odometer_km: number | null
          opened_at: string
          parts_total: number
          payment_due_date: string | null
          payment_type: string
          priority: Database["public"]["Enums"]["maintenance_priority"]
          responsible: string | null
          services_total: number
          solution: string | null
          status: Database["public"]["Enums"]["entity_status"]
          supplier: string | null
          supplier_id: string | null
          total_cost: number
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string
          workshop: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          completed_at?: string | null
          cost_per_km?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          diagnosis?: string | null
          downtime_hours?: number | null
          driver_id?: string | null
          estimated_amount?: number | null
          external_id?: string | null
          final_amount?: number | null
          hour_meter?: number | null
          id?: string
          installment_count?: number
          installment_interval_days?: number
          integration_source?: string | null
          maintenance_status?: Database["public"]["Enums"]["maintenance_status"]
          maintenance_type: Database["public"]["Enums"]["maintenance_type"]
          metadata?: Json
          notes?: string | null
          odometer_km?: number | null
          opened_at?: string
          parts_total?: number
          payment_due_date?: string | null
          payment_type?: string
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          responsible?: string | null
          services_total?: number
          solution?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          supplier?: string | null
          supplier_id?: string | null
          total_cost?: number
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id: string
          workshop?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          completed_at?: string | null
          cost_per_km?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          diagnosis?: string | null
          downtime_hours?: number | null
          driver_id?: string | null
          estimated_amount?: number | null
          external_id?: string | null
          final_amount?: number | null
          hour_meter?: number | null
          id?: string
          installment_count?: number
          installment_interval_days?: number
          integration_source?: string | null
          maintenance_status?: Database["public"]["Enums"]["maintenance_status"]
          maintenance_type?: Database["public"]["Enums"]["maintenance_type"]
          metadata?: Json
          notes?: string | null
          odometer_km?: number | null
          opened_at?: string
          parts_total?: number
          payment_due_date?: string | null
          payment_type?: string
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          responsible?: string | null
          services_total?: number
          solution?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          supplier?: string | null
          supplier_id?: string | null
          total_cost?: number
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string
          workshop?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          alert_date: string | null
          alert_hour_meter: number | null
          alert_km: number | null
          alert_type: Database["public"]["Enums"]["maintenance_alert_type"]
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          driver_id: string | null
          id: string
          is_active: boolean
          last_done_at: string | null
          last_hour_meter: number | null
          last_odometer_km: number | null
          metadata: Json
          next_due_at: string | null
          notes: string | null
          schedule_type: Database["public"]["Enums"]["maintenance_schedule_type"]
          status: Database["public"]["Enums"]["entity_status"]
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string
        }
        Insert: {
          alert_date?: string | null
          alert_hour_meter?: number | null
          alert_km?: number | null
          alert_type: Database["public"]["Enums"]["maintenance_alert_type"]
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          id?: string
          is_active?: boolean
          last_done_at?: string | null
          last_hour_meter?: number | null
          last_odometer_km?: number | null
          metadata?: Json
          next_due_at?: string | null
          notes?: string | null
          schedule_type: Database["public"]["Enums"]["maintenance_schedule_type"]
          status?: Database["public"]["Enums"]["entity_status"]
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id: string
        }
        Update: {
          alert_date?: string | null
          alert_hour_meter?: number | null
          alert_km?: number | null
          alert_type?: Database["public"]["Enums"]["maintenance_alert_type"]
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          id?: string
          is_active?: boolean
          last_done_at?: string | null
          last_hour_meter?: number | null
          last_odometer_km?: number | null
          metadata?: Json
          next_due_at?: string | null
          notes?: string | null
          schedule_type?: Database["public"]["Enums"]["maintenance_schedule_type"]
          status?: Database["public"]["Enums"]["entity_status"]
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_services: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          driver_id: string | null
          hours: number | null
          id: string
          maintenance_record_id: string
          responsible: string | null
          trip_id: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          driver_id?: string | null
          hours?: number | null
          id?: string
          maintenance_record_id: string
          responsible?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          driver_id?: string | null
          hours?: number | null
          id?: string
          maintenance_record_id?: string
          responsible?: string | null
          trip_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_services_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_services_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_services_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_services_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_services_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_expenses: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string
          competence: string
          cost_center_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          driver_id: string | null
          due_date: string | null
          employee_id: string | null
          expense_status: Database["public"]["Enums"]["payroll_expense_status"]
          expense_type: Database["public"]["Enums"]["payroll_expense_type"]
          id: string
          metadata: Json
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          position_id: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          company_id: string
          competence: string
          cost_center_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          due_date?: string | null
          employee_id?: string | null
          expense_status?: Database["public"]["Enums"]["payroll_expense_status"]
          expense_type: Database["public"]["Enums"]["payroll_expense_type"]
          id?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          position_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string
          competence?: string
          cost_center_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          driver_id?: string | null
          due_date?: string | null
          employee_id?: string | null
          expense_status?: Database["public"]["Enums"]["payroll_expense_status"]
          expense_type?: Database["public"]["Enums"]["payroll_expense_type"]
          id?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          position_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_expenses_branch_company_fkey"
            columns: ["company_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "payroll_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_expenses_cost_center_company_fkey"
            columns: ["company_id", "cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "payroll_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_expenses_driver_company_fkey"
            columns: ["company_id", "driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "payroll_expenses_employee_company_fkey"
            columns: ["company_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "payroll_expenses_position_company_fkey"
            columns: ["company_id", "position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "payroll_expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string
          description: string | null
          id: string
          resource: string
          updated_at: string
        }
        Insert: {
          action: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          resource: string
          updated_at?: string
        }
        Update: {
          action?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          resource?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          favicon_url: string | null
          feature_flags: Json
          id: string
          integrations: Json
          logo_url: string | null
          max_upload_mb: number
          password_policy: Json
          platform_name: string
          public_url: string | null
          sender_email: string | null
          session_timeout_minutes: number
          smtp_config: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          favicon_url?: string | null
          feature_flags?: Json
          id?: string
          integrations?: Json
          logo_url?: string | null
          max_upload_mb?: number
          password_policy?: Json
          platform_name?: string
          public_url?: string | null
          sender_email?: string | null
          session_timeout_minutes?: number
          smtp_config?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          favicon_url?: string | null
          feature_flags?: Json
          id?: string
          integrations?: Json
          logo_url?: string | null
          max_upload_mb?: number
          password_policy?: Json
          platform_name?: string
          public_url?: string | null
          sender_email?: string | null
          session_timeout_minutes?: number
          smtp_config?: Json
          updated_at?: string
        }
        Relationships: []
      }
      portal_acting_companies: {
        Row: {
          company_id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_acting_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_acting_companies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["portal_audit_action"]
          actor_email: string | null
          actor_profile_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          target_id: string | null
          target_label: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["portal_audit_action"]
          actor_email?: string | null
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["portal_audit_action"]
          actor_email?: string | null
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_users: {
        Row: {
          active: boolean
          created_at: string
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["portal_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          profile_id: string
          role: Database["public"]["Enums"]["portal_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["portal_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_users_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_system: boolean
          metadata: Json
          name: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          metadata?: Json
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          metadata?: Json
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          phone: string | null
          preferences: Json
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          last_login_at?: string | null
          phone?: string | null
          preferences?: Json
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          preferences?: Json
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          permission_id: string
          role_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          permission_id: string
          role_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_documents: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["route_document_type"]
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          name: string
          route_id: string
          storage_path: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["route_document_type"]
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          name: string
          route_id: string
          storage_path?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["route_document_type"]
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          name?: string
          route_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_documents_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_history: {
        Row: {
          action: string
          changes: Json
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          new_operational_status:
            | Database["public"]["Enums"]["route_operational_status"]
            | null
          previous_operational_status:
            | Database["public"]["Enums"]["route_operational_status"]
            | null
          route_id: string
        }
        Insert: {
          action: string
          changes?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_operational_status?:
            | Database["public"]["Enums"]["route_operational_status"]
            | null
          previous_operational_status?:
            | Database["public"]["Enums"]["route_operational_status"]
            | null
          route_id: string
        }
        Update: {
          action?: string
          changes?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_operational_status?:
            | Database["public"]["Enums"]["route_operational_status"]
            | null
          previous_operational_status?:
            | Database["public"]["Enums"]["route_operational_status"]
            | null
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_history_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          branch_id: string | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          destination: string
          external_id: string | null
          id: string
          integration_source: string | null
          lead_time_days: number | null
          lead_time_minutes: number | null
          metadata: Json
          name: string
          notes: string | null
          operational_status: Database["public"]["Enums"]["route_operational_status"]
          origin: string
          planned_distance_km: number | null
          route_type: Database["public"]["Enums"]["route_type"]
          status: Database["public"]["Enums"]["entity_status"]
          unload_time_minutes: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          destination: string
          external_id?: string | null
          id?: string
          integration_source?: string | null
          lead_time_days?: number | null
          lead_time_minutes?: number | null
          metadata?: Json
          name: string
          notes?: string | null
          operational_status?: Database["public"]["Enums"]["route_operational_status"]
          origin: string
          planned_distance_km?: number | null
          route_type?: Database["public"]["Enums"]["route_type"]
          status?: Database["public"]["Enums"]["entity_status"]
          unload_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          destination?: string
          external_id?: string | null
          id?: string
          integration_source?: string | null
          lead_time_days?: number | null
          lead_time_minutes?: number | null
          metadata?: Json
          name?: string
          notes?: string | null
          operational_status?: Database["public"]["Enums"]["route_operational_status"]
          origin?: string
          planned_distance_km?: number | null
          route_type?: Database["public"]["Enums"]["route_type"]
          status?: Database["public"]["Enums"]["entity_status"]
          unload_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          categories: Database["public"]["Enums"]["supplier_category"][]
          city: string | null
          company_id: string
          contact_name: string | null
          corporate_name: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          district: string | null
          document: string | null
          document_type:
            | Database["public"]["Enums"]["supplier_document_type"]
            | null
          email: string | null
          id: string
          metadata: Json
          notes: string | null
          number: string | null
          phone: string | null
          state: string | null
          status: Database["public"]["Enums"]["entity_status"]
          trade_name: string | null
          updated_at: string
          updated_by: string | null
          zip_code: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          categories?: Database["public"]["Enums"]["supplier_category"][]
          city?: string | null
          company_id: string
          contact_name?: string | null
          corporate_name: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district?: string | null
          document?: string | null
          document_type?:
            | Database["public"]["Enums"]["supplier_document_type"]
            | null
          email?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
          zip_code?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          categories?: Database["public"]["Enums"]["supplier_category"][]
          city?: string | null
          company_id?: string
          contact_name?: string | null
          corporate_name?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district?: string | null
          document?: string | null
          document_type?:
            | Database["public"]["Enums"]["supplier_document_type"]
            | null
          email?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          trade_name?: string | null
          updated_at?: string
          updated_by?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_documents: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["tire_document_type"]
          file_size: number | null
          file_url: string
          id: string
          maintenance_record_id: string | null
          mime_type: string | null
          name: string
          storage_path: string | null
          tire_id: string
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["tire_document_type"]
          file_size?: number | null
          file_url: string
          id?: string
          maintenance_record_id?: string | null
          mime_type?: string | null
          name: string
          storage_path?: string | null
          tire_id: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["tire_document_type"]
          file_size?: number | null
          file_url?: string
          id?: string
          maintenance_record_id?: string | null
          mime_type?: string | null
          name?: string
          storage_path?: string | null
          tire_id?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tire_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_documents_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_documents_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_history: {
        Row: {
          action: string
          branch_id: string | null
          changes: Json
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          maintenance_record_id: string | null
          tire_id: string
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          action: string
          branch_id?: string | null
          changes?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          maintenance_record_id?: string | null
          tire_id: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          action?: string
          branch_id?: string | null
          changes?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          maintenance_record_id?: string | null
          tire_id?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tire_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_history_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_history_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_history_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_inspections: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          inspected_at: string
          maintenance_record_id: string | null
          notes: string | null
          pressure_psi: number | null
          responsible: string | null
          tire_id: string
          tread_depth_mm: number | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
          wear_level: Database["public"]["Enums"]["tire_wear_level"] | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          inspected_at?: string
          maintenance_record_id?: string | null
          notes?: string | null
          pressure_psi?: number | null
          responsible?: string | null
          tire_id: string
          tread_depth_mm?: number | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          wear_level?: Database["public"]["Enums"]["tire_wear_level"] | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          inspected_at?: string
          maintenance_record_id?: string | null
          notes?: string | null
          pressure_psi?: number | null
          responsible?: string | null
          tire_id?: string
          tread_depth_mm?: number | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          wear_level?: Database["public"]["Enums"]["tire_wear_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "tire_inspections_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_inspections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_inspections_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_inspections_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_inspections_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_movements: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          installed_at: string | null
          maintenance_record_id: string | null
          movement_type: Database["public"]["Enums"]["tire_movement_type"]
          notes: string | null
          odometer_km: number | null
          position: Database["public"]["Enums"]["tire_position"] | null
          reason: string | null
          removed_at: string | null
          responsible: string | null
          tire_id: string
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          installed_at?: string | null
          maintenance_record_id?: string | null
          movement_type: Database["public"]["Enums"]["tire_movement_type"]
          notes?: string | null
          odometer_km?: number | null
          position?: Database["public"]["Enums"]["tire_position"] | null
          reason?: string | null
          removed_at?: string | null
          responsible?: string | null
          tire_id: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          installed_at?: string | null
          maintenance_record_id?: string | null
          movement_type?: Database["public"]["Enums"]["tire_movement_type"]
          notes?: string | null
          odometer_km?: number | null
          position?: Database["public"]["Enums"]["tire_position"] | null
          reason?: string | null
          removed_at?: string | null
          responsible?: string | null
          tire_id?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tire_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_movements_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_movements_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_movements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_movements_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_recaps: {
        Row: {
          amount: number | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          maintenance_record_id: string | null
          notes: string | null
          odometer_km: number | null
          recap_number: string | null
          recapped_at: string
          supplier: string | null
          supplier_id: string | null
          tire_id: string
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
          warranty: string | null
        }
        Insert: {
          amount?: number | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          maintenance_record_id?: string | null
          notes?: string | null
          odometer_km?: number | null
          recap_number?: string | null
          recapped_at?: string
          supplier?: string | null
          supplier_id?: string | null
          tire_id: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          warranty?: string | null
        }
        Update: {
          amount?: number | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          maintenance_record_id?: string | null
          notes?: string | null
          odometer_km?: number | null
          recap_number?: string | null
          recapped_at?: string
          supplier?: string | null
          supplier_id?: string | null
          tire_id?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tire_recaps_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_recaps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_recaps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_recaps_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_recaps_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_recaps_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_recaps_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_recaps_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tires: {
        Row: {
          accumulated_km: number
          asset_number: string | null
          branch_id: string | null
          brand: string | null
          company_id: string
          cost_per_km: number | null
          created_at: string
          created_by: string | null
          current_km: number
          current_position: Database["public"]["Enums"]["tire_position"] | null
          deleted_at: string | null
          dot_number: string | null
          expected_life_km: number | null
          external_id: string | null
          fire_number: string | null
          id: string
          installment_count: number
          installment_interval_days: number
          integration_source: string | null
          internal_code: string | null
          last_tread_depth_mm: number | null
          maintenance_record_id: string | null
          manufacturer: string | null
          metadata: Json
          model: string | null
          notes: string | null
          payment_due_date: string | null
          payment_type: string
          purchase_date: string | null
          purchase_value: number | null
          recap_count: number
          remaining_life_km: number | null
          serial_number: string | null
          status: Database["public"]["Enums"]["entity_status"]
          supplier: string | null
          supplier_id: string | null
          tire_size: string | null
          tire_status: Database["public"]["Enums"]["tire_status"]
          total_recap_cost: number
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
          warranty: string | null
        }
        Insert: {
          accumulated_km?: number
          asset_number?: string | null
          branch_id?: string | null
          brand?: string | null
          company_id: string
          cost_per_km?: number | null
          created_at?: string
          created_by?: string | null
          current_km?: number
          current_position?: Database["public"]["Enums"]["tire_position"] | null
          deleted_at?: string | null
          dot_number?: string | null
          expected_life_km?: number | null
          external_id?: string | null
          fire_number?: string | null
          id?: string
          installment_count?: number
          installment_interval_days?: number
          integration_source?: string | null
          internal_code?: string | null
          last_tread_depth_mm?: number | null
          maintenance_record_id?: string | null
          manufacturer?: string | null
          metadata?: Json
          model?: string | null
          notes?: string | null
          payment_due_date?: string | null
          payment_type?: string
          purchase_date?: string | null
          purchase_value?: number | null
          recap_count?: number
          remaining_life_km?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          supplier?: string | null
          supplier_id?: string | null
          tire_size?: string | null
          tire_status?: Database["public"]["Enums"]["tire_status"]
          total_recap_cost?: number
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          warranty?: string | null
        }
        Update: {
          accumulated_km?: number
          asset_number?: string | null
          branch_id?: string | null
          brand?: string | null
          company_id?: string
          cost_per_km?: number | null
          created_at?: string
          created_by?: string | null
          current_km?: number
          current_position?: Database["public"]["Enums"]["tire_position"] | null
          deleted_at?: string | null
          dot_number?: string | null
          expected_life_km?: number | null
          external_id?: string | null
          fire_number?: string | null
          id?: string
          installment_count?: number
          installment_interval_days?: number
          integration_source?: string | null
          internal_code?: string | null
          last_tread_depth_mm?: number | null
          maintenance_record_id?: string | null
          manufacturer?: string | null
          metadata?: Json
          model?: string | null
          notes?: string | null
          payment_due_date?: string | null
          payment_type?: string
          purchase_date?: string | null
          purchase_value?: number | null
          recap_count?: number
          remaining_life_km?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          supplier?: string | null
          supplier_id?: string | null
          tire_size?: string | null
          tire_status?: Database["public"]["Enums"]["tire_status"]
          total_recap_cost?: number
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tires_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tires_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tires_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tires_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tires_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tires_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tires_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_checklists: {
        Row: {
          brakes_ok: boolean | null
          branch_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          documentation_ok: boolean | null
          fuel_ok: boolean | null
          headlights_ok: boolean | null
          hour_meter_reading: number | null
          id: string
          notes: string | null
          odometer_reading: number | null
          photo_urls: Json
          signature_url: string | null
          tires_ok: boolean | null
          trip_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brakes_ok?: boolean | null
          branch_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          documentation_ok?: boolean | null
          fuel_ok?: boolean | null
          headlights_ok?: boolean | null
          hour_meter_reading?: number | null
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          photo_urls?: Json
          signature_url?: string | null
          tires_ok?: boolean | null
          trip_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brakes_ok?: boolean | null
          branch_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          documentation_ok?: boolean | null
          fuel_ok?: boolean | null
          headlights_ok?: boolean | null
          hour_meter_reading?: number | null
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          photo_urls?: Json
          signature_url?: string | null
          tires_ok?: boolean | null
          trip_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_checklists_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_checklists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_checklists_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_checklists_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_documents: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["trip_document_type"]
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          name: string
          storage_path: string | null
          trip_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["trip_document_type"]
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          name: string
          storage_path?: string | null
          trip_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["trip_document_type"]
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          name?: string
          storage_path?: string | null
          trip_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_expenses: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          expense_date: string
          expense_type: Database["public"]["Enums"]["trip_expense_type"]
          id: string
          notes: string | null
          receipt_url: string | null
          trip_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          expense_type: Database["public"]["Enums"]["trip_expense_type"]
          id?: string
          notes?: string | null
          receipt_url?: string | null
          trip_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: Database["public"]["Enums"]["trip_expense_type"]
          id?: string
          notes?: string | null
          receipt_url?: string | null
          trip_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_history: {
        Row: {
          action: string
          branch_id: string | null
          changes: Json
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          new_trip_status: Database["public"]["Enums"]["trip_status"] | null
          previous_trip_status:
            | Database["public"]["Enums"]["trip_status"]
            | null
          trip_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action: string
          branch_id?: string | null
          changes?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          new_trip_status?: Database["public"]["Enums"]["trip_status"] | null
          previous_trip_status?:
            | Database["public"]["Enums"]["trip_status"]
            | null
          trip_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action?: string
          branch_id?: string | null
          changes?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          new_trip_status?: Database["public"]["Enums"]["trip_status"] | null
          previous_trip_status?:
            | Database["public"]["Enums"]["trip_status"]
            | null
          trip_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_history_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_locations: {
        Row: {
          accuracy_m: number | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          speed_kmh: number | null
          trip_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accuracy_m?: number | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          speed_kmh?: number | null
          trip_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accuracy_m?: number | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed_kmh?: number | null
          trip_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_locations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_occurrences: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          occurred_at: string
          occurrence_type: Database["public"]["Enums"]["trip_occurrence_type"]
          trip_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          occurred_at?: string
          occurrence_type: Database["public"]["Enums"]["trip_occurrence_type"]
          trip_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          occurred_at?: string
          occurrence_type?: Database["public"]["Enums"]["trip_occurrence_type"]
          trip_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_occurrences_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_occurrences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_occurrences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_occurrences_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_occurrences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_stops: {
        Row: {
          branch_id: string | null
          client_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          stop_date: string | null
          stop_time: string | null
          stopped_minutes: number | null
          trip_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          client_name?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          stop_date?: string | null
          stop_time?: string | null
          stopped_minutes?: number | null
          trip_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          client_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          stop_date?: string | null
          stop_time?: string | null
          stopped_minutes?: number | null
          trip_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_stops_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_stops_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_stops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_stops_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_stops_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          actual_freight_value: number | null
          arrived_at: string | null
          branch_id: string | null
          cancellation_notes: string | null
          cancelled_at: string | null
          cargo_type: string | null
          client_name: string | null
          company_id: string
          completed_at: string | null
          contract_reference: string | null
          contracted_freight_value: number | null
          created_at: string
          created_by: string | null
          customer_contract_id: string | null
          customer_id: string | null
          deleted_at: string | null
          departed_at: string | null
          destination: string | null
          driver_id: string | null
          external_id: string | null
          final_hour_meter: number | null
          final_odometer_km: number | null
          freight_margin: number | null
          freight_table: string | null
          id: string
          initial_hour_meter: number | null
          initial_odometer_km: number | null
          integration_source: string | null
          lead_time_minutes: number | null
          metadata: Json
          notes: string | null
          origin: string | null
          planned_arrival_at: string | null
          planned_completion_at: string | null
          planned_departure_at: string | null
          planned_distance_km: number | null
          responsible: string | null
          route: string | null
          route_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["entity_status"]
          trip_number: string
          trip_status: Database["public"]["Enums"]["trip_status"]
          unload_time_minutes: number | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
          volume_m3: number | null
          weight_kg: number | null
        }
        Insert: {
          actual_freight_value?: number | null
          arrived_at?: string | null
          branch_id?: string | null
          cancellation_notes?: string | null
          cancelled_at?: string | null
          cargo_type?: string | null
          client_name?: string | null
          company_id: string
          completed_at?: string | null
          contract_reference?: string | null
          contracted_freight_value?: number | null
          created_at?: string
          created_by?: string | null
          customer_contract_id?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          departed_at?: string | null
          destination?: string | null
          driver_id?: string | null
          external_id?: string | null
          final_hour_meter?: number | null
          final_odometer_km?: number | null
          freight_margin?: number | null
          freight_table?: string | null
          id?: string
          initial_hour_meter?: number | null
          initial_odometer_km?: number | null
          integration_source?: string | null
          lead_time_minutes?: number | null
          metadata?: Json
          notes?: string | null
          origin?: string | null
          planned_arrival_at?: string | null
          planned_completion_at?: string | null
          planned_departure_at?: string | null
          planned_distance_km?: number | null
          responsible?: string | null
          route?: string | null
          route_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          trip_number: string
          trip_status?: Database["public"]["Enums"]["trip_status"]
          unload_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Update: {
          actual_freight_value?: number | null
          arrived_at?: string | null
          branch_id?: string | null
          cancellation_notes?: string | null
          cancelled_at?: string | null
          cargo_type?: string | null
          client_name?: string | null
          company_id?: string
          completed_at?: string | null
          contract_reference?: string | null
          contracted_freight_value?: number | null
          created_at?: string
          created_by?: string | null
          customer_contract_id?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          departed_at?: string | null
          destination?: string | null
          driver_id?: string | null
          external_id?: string | null
          final_hour_meter?: number | null
          final_odometer_km?: number | null
          freight_margin?: number | null
          freight_table?: string | null
          id?: string
          initial_hour_meter?: number | null
          initial_odometer_km?: number | null
          integration_source?: string | null
          lead_time_minutes?: number | null
          metadata?: Json
          notes?: string | null
          origin?: string | null
          planned_arrival_at?: string | null
          planned_completion_at?: string | null
          planned_departure_at?: string | null
          planned_distance_km?: number | null
          responsible?: string | null
          route?: string | null
          route_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          trip_number?: string
          trip_status?: Database["public"]["Enums"]["trip_status"]
          unload_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_customer_contract_id_fkey"
            columns: ["customer_contract_id"]
            isOneToOne: false
            referencedRelation: "customer_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          name: string
          storage_path: string | null
          vehicle_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          name: string
          storage_path?: string | null
          vehicle_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          name?: string
          storage_path?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_history: {
        Row: {
          action: string
          changes: Json
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          new_asset_status:
            | Database["public"]["Enums"]["vehicle_asset_status"]
            | null
          previous_asset_status:
            | Database["public"]["Enums"]["vehicle_asset_status"]
            | null
          vehicle_id: string
        }
        Insert: {
          action: string
          changes?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_asset_status?:
            | Database["public"]["Enums"]["vehicle_asset_status"]
            | null
          previous_asset_status?:
            | Database["public"]["Enums"]["vehicle_asset_status"]
            | null
          vehicle_id: string
        }
        Update: {
          action?: string
          changes?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_asset_status?:
            | Database["public"]["Enums"]["vehicle_asset_status"]
            | null
          previous_asset_status?:
            | Database["public"]["Enums"]["vehicle_asset_status"]
            | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          asset_status: Database["public"]["Enums"]["vehicle_asset_status"]
          axles: number | null
          body_type: string | null
          branch_id: string | null
          brand: string | null
          chassis: string | null
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          crlv_storage_path: string | null
          crlv_url: string | null
          current_odometer_km: number
          deleted_at: string | null
          external_id: string | null
          fleet_number: string | null
          fuel_type: Database["public"]["Enums"]["vehicle_fuel_type"] | null
          gross_weight_kg: number | null
          hour_meter: number | null
          id: string
          initial_odometer_km: number
          integration_source: string | null
          load_capacity_kg: number | null
          metadata: Json
          model: string | null
          notes: string | null
          photo_storage_path: string | null
          photo_url: string | null
          plate: string
          renavam: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tare_kg: number | null
          updated_at: string
          updated_by: string | null
          vehicle_type: string
          year: number | null
        }
        Insert: {
          asset_status?: Database["public"]["Enums"]["vehicle_asset_status"]
          axles?: number | null
          body_type?: string | null
          branch_id?: string | null
          brand?: string | null
          chassis?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          crlv_storage_path?: string | null
          crlv_url?: string | null
          current_odometer_km?: number
          deleted_at?: string | null
          external_id?: string | null
          fleet_number?: string | null
          fuel_type?: Database["public"]["Enums"]["vehicle_fuel_type"] | null
          gross_weight_kg?: number | null
          hour_meter?: number | null
          id?: string
          initial_odometer_km?: number
          integration_source?: string | null
          load_capacity_kg?: number | null
          metadata?: Json
          model?: string | null
          notes?: string | null
          photo_storage_path?: string | null
          photo_url?: string | null
          plate: string
          renavam?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tare_kg?: number | null
          updated_at?: string
          updated_by?: string | null
          vehicle_type: string
          year?: number | null
        }
        Update: {
          asset_status?: Database["public"]["Enums"]["vehicle_asset_status"]
          axles?: number | null
          body_type?: string | null
          branch_id?: string | null
          brand?: string | null
          chassis?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          crlv_storage_path?: string | null
          crlv_url?: string | null
          current_odometer_km?: number
          deleted_at?: string | null
          external_id?: string | null
          fleet_number?: string | null
          fuel_type?: Database["public"]["Enums"]["vehicle_fuel_type"] | null
          gross_weight_kg?: number | null
          hour_meter?: number | null
          id?: string
          initial_odometer_km?: number
          integration_source?: string | null
          load_capacity_kg?: number | null
          metadata?: Json
          model?: string | null
          notes?: string | null
          photo_storage_path?: string | null
          photo_url?: string | null
          plate?: string
          renavam?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tare_kg?: number | null
          updated_at?: string
          updated_by?: string | null
          vehicle_type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_providers: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["kind"]
          metadata: Json
          model: string | null
          name: string
          notes: string | null
          provider_name: Database["public"]["Enums"]["provider_name"]
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          kind: Database["public"]["Enums"]["kind"]
          metadata?: Json
          model?: string | null
          name: string
          notes?: string | null
          provider_name: Database["public"]["Enums"]["provider_name"]
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["kind"]
          metadata?: Json
          model?: string | null
          name?: string
          notes?: string | null
          provider_name?: Database["public"]["Enums"]["provider_name"]
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_providers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vision_providers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vision_providers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      payroll_people: {
        Row: {
          active: boolean | null
          branch_id: string | null
          company_id: string | null
          cost_center_id: string | null
          cpf: string | null
          id: string | null
          name: string | null
          person_kind: string | null
          position_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      company_has_active_members: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      complete_company_provisioning: {
        Args: { p_company_id: string; p_profile_id: string }
        Returns: string
      }
      count_active_super_admins: {
        Args: { p_company_id: string }
        Returns: number
      }
      generate_trip_number: { Args: { p_company_id: string }; Returns: string }
      get_customer_stats: { Args: { p_company_id: string }; Returns: Json }
      get_driver_stats: { Args: { p_company_id: string }; Returns: Json }
      get_financial_stats: { Args: { p_company_id: string }; Returns: Json }
      get_fuel_stats: { Args: { p_company_id: string }; Returns: Json }
      get_maintenance_stats: { Args: { p_company_id: string }; Returns: Json }
      get_my_company_ids: { Args: never; Returns: string[] }
      get_my_portal_role: {
        Args: never
        Returns: Database["public"]["Enums"]["portal_role"]
      }
      get_plan_catalog: { Args: never; Returns: Json }
      get_portal_acting_company_id: { Args: never; Returns: string }
      get_supplier_analytics_placeholders: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_supplier_stats: {
        Args: { p_company_id: string; p_supplier_id: string }
        Returns: Json
      }
      get_tire_stats: { Args: { p_company_id: string }; Returns: Json }
      get_trip_stats: { Args: { p_company_id: string }; Returns: Json }
      get_vehicle_stats: { Args: { p_company_id: string }; Returns: Json }
      has_company_permission: {
        Args: { p_company_id: string; p_permission_code: string }
        Returns: boolean
      }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      is_company_super_admin: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      is_portal_owner: { Args: never; Returns: boolean }
      is_portal_owner_acting_for: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      is_portal_user: { Args: never; Returns: boolean }
      migrate_free_text_suppliers: { Args: never; Returns: undefined }
      refresh_tire_metrics: { Args: { p_tire_id: string }; Returns: undefined }
      seed_cost_centers_for_company: {
        Args: { p_company_id: string; p_created_by?: string }
        Returns: undefined
      }
      seed_default_roles_for_company: {
        Args: { p_company_id: string; p_created_by?: string }
        Returns: undefined
      }
      seed_financial_defaults_for_company: {
        Args: { p_company_id: string; p_created_by?: string }
        Returns: undefined
      }
      seed_positions_for_company: {
        Args: { p_company_id: string; p_created_by?: string }
        Returns: undefined
      }
      update_company_provision_status: {
        Args: {
          p_company_id: string
          p_error?: string
          p_status: Database["public"]["Enums"]["provision_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      customer_address_type:
        | "delivery"
        | "pickup"
        | "billing"
        | "headquarters"
        | "branch"
      customer_contract_status:
        | "draft"
        | "active"
        | "suspended"
        | "expired"
        | "cancelled"
        | "renewed"
      customer_contract_type:
        | "spot"
        | "dedicated"
        | "distribution"
        | "milk_run"
        | "other"
      customer_document_type:
        | "contract"
        | "addendum"
        | "power_of_attorney"
        | "documentation"
        | "other"
      customer_readjustment_index:
        | "none"
        | "ipca"
        | "igpm"
        | "inpc"
        | "diesel"
        | "custom"
      customer_segment:
        | "industrial"
        | "commercial"
        | "retail"
        | "services"
        | "agribusiness"
        | "other"
      customer_status: "active" | "inactive" | "prospect" | "blocked"
      driver_contract_type: "clt" | "pj" | "autonomo" | "agregado" | "terceiro"
      driver_document_type:
        | "photo"
        | "cnh_front"
        | "cnh_back"
        | "proof"
        | "aso"
        | "document"
      driver_license_category:
        | "A"
        | "B"
        | "C"
        | "D"
        | "E"
        | "AB"
        | "AC"
        | "AD"
        | "AE"
      driver_operational_status: "active" | "inactive"
      employee_contract_type:
        | "clt"
        | "pj"
        | "autonomo"
        | "estagio"
        | "temporario"
        | "outros"
      entity_status: "active" | "inactive" | "blocked" | "archived"
      financial_category_slug:
        | "combustivel"
        | "pedagio"
        | "manutencao"
        | "pneus"
        | "salarios"
        | "diarias"
        | "hospedagem"
        | "alimentacao"
        | "impostos"
        | "seguros"
        | "multas"
        | "fretes"
        | "receitas"
        | "outros"
      financial_cost_center_type:
        | "company"
        | "branch"
        | "vehicle"
        | "driver"
        | "trip"
        | "client"
        | "contract"
        | "custom"
      financial_document_type:
        | "invoice"
        | "boleto"
        | "receipt"
        | "proof"
        | "other"
      financial_entry_status:
        | "pending"
        | "paid"
        | "cancelled"
        | "reversed"
        | "overdue"
      financial_entry_type:
        | "revenue"
        | "expense"
        | "transfer"
        | "reimbursement"
        | "advance"
        | "reversal"
        | "adjustment"
      fuel_document_type:
        | "invoice"
        | "receipt"
        | "proof"
        | "pump_photo"
        | "other"
      fuel_inconsistency_flag:
        | "odometer_decrease"
        | "odometer_missing"
        | "amount_mismatch"
        | "consumption_outlier"
        | "future_date"
        | "duplicate_same_day"
      kind:
        | "ocr"
        | "image_analysis"
        | "document_vision"
        | "object_detection"
        | "multimodal"
        | "custom"
      maintenance_alert_type: "km" | "date" | "hour_meter"
      maintenance_document_type:
        | "budget"
        | "invoice"
        | "photo"
        | "service_order"
        | "report"
        | "other"
      maintenance_priority: "low" | "medium" | "high" | "critical"
      maintenance_schedule_type: "oil_change" | "review" | "preventive"
      maintenance_status:
        | "open"
        | "in_progress"
        | "waiting_parts"
        | "completed"
        | "cancelled"
      maintenance_type:
        | "preventive"
        | "corrective"
        | "emergency"
        | "warranty"
        | "review"
        | "oil_change"
        | "brakes"
        | "suspension"
        | "engine"
        | "electrical"
        | "cooling"
        | "transmission"
        | "tires"
        | "other"
      payroll_expense_status: "pending" | "paid" | "cancelled"
      payroll_expense_type:
        | "salario"
        | "hora_extra"
        | "adicional"
        | "beneficios"
        | "vale_alimentacao"
        | "vale_transporte"
        | "encargos"
        | "ferias"
        | "decimo_terceiro"
        | "rescisao"
        | "outros"
      portal_audit_action:
        | "login"
        | "logout"
        | "company_create"
        | "company_update"
        | "company_provision"
        | "company_delete"
        | "password_reset"
        | "user_create"
        | "user_update"
        | "user_role_change"
        | "user_activate"
        | "user_deactivate"
        | "plan_change"
        | "company_suspend"
        | "company_reactivate"
        | "settings_update"
        | "company_access"
      portal_role: "OWNER" | "SUPPORT" | "FINANCE"
      provider_name:
        | "openai"
        | "google"
        | "azure"
        | "aws"
        | "anthropic"
        | "custom"
      provision_status: "pending" | "in_progress" | "completed" | "error"
      route_document_type: "document" | "map" | "other"
      route_operational_status: "active" | "inactive"
      route_type: "delivery" | "pickup" | "transfer" | "distribution" | "other"
      supplier_category:
        | "posto"
        | "oficina"
        | "auto_pecas"
        | "pneus"
        | "borracharia"
        | "guincho"
        | "lavagem"
        | "eletrica"
        | "mecanica"
        | "lanternagem"
        | "administrativo"
        | "outros"
      supplier_document_type: "cnpj" | "cpf"
      tire_document_type: "invoice" | "warranty" | "photo" | "report" | "other"
      tire_movement_type: "install" | "remove" | "position_change" | "rotation"
      tire_position:
        | "front_left"
        | "front_right"
        | "rear_left_outer"
        | "rear_left_inner"
        | "rear_right_outer"
        | "rear_right_inner"
        | "spare"
        | "other"
      tire_status:
        | "in_stock"
        | "installed"
        | "in_retread"
        | "discarded"
        | "warranty"
      tire_wear_level: "good" | "warning" | "critical"
      trip_document_type:
        | "cte"
        | "mdfe"
        | "nfe"
        | "canhoto"
        | "photo"
        | "receipt"
        | "checklist"
        | "other"
      trip_expense_type:
        | "toll"
        | "food"
        | "lodging"
        | "tire_shop"
        | "maintenance"
        | "other"
        | "parking"
        | "ferry"
        | "wash"
        | "advance"
        | "fine"
      trip_occurrence_type:
        | "delay"
        | "breakdown"
        | "accident"
        | "fine"
        | "redelivery"
        | "return"
        | "missing_document"
        | "other"
      trip_status:
        | "planned"
        | "scheduled"
        | "loading"
        | "in_progress"
        | "delivering"
        | "waiting"
        | "completed"
        | "cancelled"
        | "returned"
      vehicle_asset_status: "active" | "maintenance" | "inactive" | "sold"
      vehicle_fuel_type:
        | "diesel"
        | "gasoline"
        | "ethanol"
        | "flex"
        | "gnv"
        | "electric"
        | "hybrid"
        | "other"
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
      customer_address_type: [
        "delivery",
        "pickup",
        "billing",
        "headquarters",
        "branch",
      ],
      customer_contract_status: [
        "draft",
        "active",
        "suspended",
        "expired",
        "cancelled",
        "renewed",
      ],
      customer_contract_type: [
        "spot",
        "dedicated",
        "distribution",
        "milk_run",
        "other",
      ],
      customer_document_type: [
        "contract",
        "addendum",
        "power_of_attorney",
        "documentation",
        "other",
      ],
      customer_readjustment_index: [
        "none",
        "ipca",
        "igpm",
        "inpc",
        "diesel",
        "custom",
      ],
      customer_segment: [
        "industrial",
        "commercial",
        "retail",
        "services",
        "agribusiness",
        "other",
      ],
      customer_status: ["active", "inactive", "prospect", "blocked"],
      driver_contract_type: ["clt", "pj", "autonomo", "agregado", "terceiro"],
      driver_document_type: [
        "photo",
        "cnh_front",
        "cnh_back",
        "proof",
        "aso",
        "document",
      ],
      driver_license_category: [
        "A",
        "B",
        "C",
        "D",
        "E",
        "AB",
        "AC",
        "AD",
        "AE",
      ],
      driver_operational_status: ["active", "inactive"],
      employee_contract_type: [
        "clt",
        "pj",
        "autonomo",
        "estagio",
        "temporario",
        "outros",
      ],
      entity_status: ["active", "inactive", "blocked", "archived"],
      financial_category_slug: [
        "combustivel",
        "pedagio",
        "manutencao",
        "pneus",
        "salarios",
        "diarias",
        "hospedagem",
        "alimentacao",
        "impostos",
        "seguros",
        "multas",
        "fretes",
        "receitas",
        "outros",
      ],
      financial_cost_center_type: [
        "company",
        "branch",
        "vehicle",
        "driver",
        "trip",
        "client",
        "contract",
        "custom",
      ],
      financial_document_type: [
        "invoice",
        "boleto",
        "receipt",
        "proof",
        "other",
      ],
      financial_entry_status: [
        "pending",
        "paid",
        "cancelled",
        "reversed",
        "overdue",
      ],
      financial_entry_type: [
        "revenue",
        "expense",
        "transfer",
        "reimbursement",
        "advance",
        "reversal",
        "adjustment",
      ],
      fuel_document_type: [
        "invoice",
        "receipt",
        "proof",
        "pump_photo",
        "other",
      ],
      fuel_inconsistency_flag: [
        "odometer_decrease",
        "odometer_missing",
        "amount_mismatch",
        "consumption_outlier",
        "future_date",
        "duplicate_same_day",
      ],
      kind: [
        "ocr",
        "image_analysis",
        "document_vision",
        "object_detection",
        "multimodal",
        "custom",
      ],
      maintenance_alert_type: ["km", "date", "hour_meter"],
      maintenance_document_type: [
        "budget",
        "invoice",
        "photo",
        "service_order",
        "report",
        "other",
      ],
      maintenance_priority: ["low", "medium", "high", "critical"],
      maintenance_schedule_type: ["oil_change", "review", "preventive"],
      maintenance_status: [
        "open",
        "in_progress",
        "waiting_parts",
        "completed",
        "cancelled",
      ],
      maintenance_type: [
        "preventive",
        "corrective",
        "emergency",
        "warranty",
        "review",
        "oil_change",
        "brakes",
        "suspension",
        "engine",
        "electrical",
        "cooling",
        "transmission",
        "tires",
        "other",
      ],
      payroll_expense_status: ["pending", "paid", "cancelled"],
      payroll_expense_type: [
        "salario",
        "hora_extra",
        "adicional",
        "beneficios",
        "vale_alimentacao",
        "vale_transporte",
        "encargos",
        "ferias",
        "decimo_terceiro",
        "rescisao",
        "outros",
      ],
      portal_audit_action: [
        "login",
        "logout",
        "company_create",
        "company_update",
        "company_provision",
        "company_delete",
        "password_reset",
        "user_create",
        "user_update",
        "user_role_change",
        "user_activate",
        "user_deactivate",
        "plan_change",
        "company_suspend",
        "company_reactivate",
        "settings_update",
        "company_access",
      ],
      portal_role: ["OWNER", "SUPPORT", "FINANCE"],
      provider_name: [
        "openai",
        "google",
        "azure",
        "aws",
        "anthropic",
        "custom",
      ],
      provision_status: ["pending", "in_progress", "completed", "error"],
      route_document_type: ["document", "map", "other"],
      route_operational_status: ["active", "inactive"],
      route_type: ["delivery", "pickup", "transfer", "distribution", "other"],
      supplier_category: [
        "posto",
        "oficina",
        "auto_pecas",
        "pneus",
        "borracharia",
        "guincho",
        "lavagem",
        "eletrica",
        "mecanica",
        "lanternagem",
        "administrativo",
        "outros",
      ],
      supplier_document_type: ["cnpj", "cpf"],
      tire_document_type: ["invoice", "warranty", "photo", "report", "other"],
      tire_movement_type: ["install", "remove", "position_change", "rotation"],
      tire_position: [
        "front_left",
        "front_right",
        "rear_left_outer",
        "rear_left_inner",
        "rear_right_outer",
        "rear_right_inner",
        "spare",
        "other",
      ],
      tire_status: [
        "in_stock",
        "installed",
        "in_retread",
        "discarded",
        "warranty",
      ],
      tire_wear_level: ["good", "warning", "critical"],
      trip_document_type: [
        "cte",
        "mdfe",
        "nfe",
        "canhoto",
        "photo",
        "receipt",
        "checklist",
        "other",
      ],
      trip_expense_type: [
        "toll",
        "food",
        "lodging",
        "tire_shop",
        "maintenance",
        "other",
        "parking",
        "ferry",
        "wash",
        "advance",
        "fine",
      ],
      trip_occurrence_type: [
        "delay",
        "breakdown",
        "accident",
        "fine",
        "redelivery",
        "return",
        "missing_document",
        "other",
      ],
      trip_status: [
        "planned",
        "scheduled",
        "loading",
        "in_progress",
        "delivering",
        "waiting",
        "completed",
        "cancelled",
        "returned",
      ],
      vehicle_asset_status: ["active", "maintenance", "inactive", "sold"],
      vehicle_fuel_type: [
        "diesel",
        "gasoline",
        "ethanol",
        "flex",
        "gnv",
        "electric",
        "hybrid",
        "other",
      ],
    },
  },
} as const
