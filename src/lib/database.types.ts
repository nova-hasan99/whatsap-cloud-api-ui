// Database types matching the migration schema.
// Format compatible with @supabase/supabase-js v2.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          password_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          password_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          password_hash?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      whatsapp_numbers: {
        Row: {
          id: string;
          display_name: string;
          phone_number: string;
          phone_number_id: string;
          access_token: string;
          waba_id: string;
          webhook_verify_token: string;
          status: 'active' | 'inactive' | 'error';
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          display_name: string;
          phone_number: string;
          phone_number_id: string;
          access_token: string;
          waba_id: string;
          webhook_verify_token: string;
          status?: 'active' | 'inactive' | 'error';
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string;
          phone_number?: string;
          phone_number_id?: string;
          access_token?: string;
          waba_id?: string;
          webhook_verify_token?: string;
          status?: 'active' | 'inactive' | 'error';
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          whatsapp_number_id: string;
          customer_phone: string;
          customer_name: string | null;
          customer_profile_pic_url: string | null;
          last_message_at: string;
          last_message_preview: string | null;
          unread_count: number;
          status: 'active' | 'archived';
          window_expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          whatsapp_number_id: string;
          customer_phone: string;
          customer_name?: string | null;
          customer_profile_pic_url?: string | null;
          last_message_at?: string;
          last_message_preview?: string | null;
          unread_count?: number;
          status?: 'active' | 'archived';
          window_expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          whatsapp_number_id?: string;
          customer_phone?: string;
          customer_name?: string | null;
          customer_profile_pic_url?: string | null;
          last_message_at?: string;
          last_message_preview?: string | null;
          unread_count?: number;
          status?: 'active' | 'archived';
          window_expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_whatsapp_number_id_fkey';
            columns: ['whatsapp_number_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_numbers';
            referencedColumns: ['id'];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          whatsapp_number_id: string;
          wamid: string | null;
          direction: 'inbound' | 'outbound';
          type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'template';
          content: Json;
          status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          whatsapp_number_id: string;
          wamid?: string | null;
          direction: 'inbound' | 'outbound';
          type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'template';
          content: Json;
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          whatsapp_number_id?: string;
          wamid?: string | null;
          direction?: 'inbound' | 'outbound';
          type?: 'text' | 'image' | 'video' | 'document' | 'audio' | 'template';
          content?: Json;
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
          timestamp?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_whatsapp_number_id_fkey';
            columns: ['whatsapp_number_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_numbers';
            referencedColumns: ['id'];
          }
        ];
      };
      message_templates: {
        Row: {
          id: string;
          whatsapp_number_id: string;
          template_name: string;
          template_id: string;
          category: 'marketing' | 'utility' | 'authentication';
          language: string;
          status: 'approved' | 'pending' | 'rejected';
          components: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          whatsapp_number_id: string;
          template_name: string;
          template_id: string;
          category: 'marketing' | 'utility' | 'authentication';
          language: string;
          status?: 'approved' | 'pending' | 'rejected';
          components: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          whatsapp_number_id?: string;
          template_name?: string;
          template_id?: string;
          category?: 'marketing' | 'utility' | 'authentication';
          language?: string;
          status?: 'approved' | 'pending' | 'rejected';
          components?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_templates_whatsapp_number_id_fkey';
            columns: ['whatsapp_number_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_numbers';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience aliases
export type Admin = Database['public']['Tables']['admins']['Row'];
export type WhatsAppNumber = Database['public']['Tables']['whatsapp_numbers']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageTemplate = Database['public']['Tables']['message_templates']['Row'];

export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'template';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type TemplateCategory = 'marketing' | 'utility' | 'authentication';
export type TemplateStatus = 'approved' | 'pending' | 'rejected';
