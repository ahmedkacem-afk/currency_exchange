/**
 * Supabase Database Types
 * 
 * This file contains TypeScript type definitions for your Supabase database.
 * It helps with type checking when working with database operations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      wallets: {
        Row: {
          id: string
          name: string
          usd: number
          lyd: number
          created_at: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          usd?: number
          lyd?: number
          created_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          usd?: number
          lyd?: number
          created_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          type: 'buy' | 'sell'
          usd_amount: number
          lyd_amount: number
          dinar_price: number
          wallet_id: string
          entity_id: string | null
          notes: string | null
          created_at: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          type: 'buy' | 'sell'
          usd_amount: number
          lyd_amount: number
          dinar_price: number
          wallet_id: string
          entity_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          type?: 'buy' | 'sell'
          usd_amount?: number
          lyd_amount?: number
          dinar_price?: number
          wallet_id?: string
          entity_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
      }
      entities: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
    }
    Views: {
      wallets_summary: {
        Row: {
          total_usd: number | null
          total_lyd: number | null
        }
      }
    }
    Functions: {
      wallets_summary: {
        Args: Record<PropertyKey, never>
        Returns: { total_usd: number; total_lyd: number }
      }
    }
  }
}
