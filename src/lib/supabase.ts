import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      prompt_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      prompt_versions: {
        Row: {
          id: string
          group_id: string
          name: string
          content: string
          status: 'draft' | 'current' | 'production'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          content: string
          status?: 'draft' | 'current' | 'production'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          content?: string
          status?: 'draft' | 'current' | 'production'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}