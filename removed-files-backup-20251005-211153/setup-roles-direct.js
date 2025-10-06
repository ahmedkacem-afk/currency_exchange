/**
 * Script to create roles table and add role management functionality
 * This script uses direct SQL queries to set up the roles system
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Set up PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'postgres',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting user roles migration...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // 1. Create roles table
    console.log('Creating roles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // 2. Insert default roles
    console.log('Inserting default roles...');
    await client.query(`
      INSERT INTO public.roles (name, description) 
      VALUES 
        ('manager', 'Has access to all system features and functionalities'),
        ('treasurer', 'Manages cash custody and treasury operations'),
        ('cashier', 'Handles currency exchange transactions and cash custody'),
        ('dealings_executioner', 'Executes currency dealings and operations')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    // 3. Add role_id to profiles table if it doesn't exist
    console.log('Adding role_id column to profiles table...');
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name = 'role_id';
    `);
    
    if (columnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE public.profiles 
        ADD COLUMN role_id UUID REFERENCES public.roles(id);
        
        CREATE INDEX profiles_role_id_idx ON public.profiles(role_id);
      `);
      console.log('Role_id column added to profiles table');
    } else {
      console.log('Role_id column already exists');
    }
    
    // 4. Set up Row Level Security for roles table
    console.log('Setting up Row Level Security...');
    await client.query(`
      ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS roles_select_policy ON public.roles;
      DROP POLICY IF EXISTS roles_insert_update_delete_policy ON public.roles;
      
      CREATE POLICY roles_select_policy ON public.roles 
        FOR SELECT USING (auth.uid() IN (
          SELECT profiles.user_id 
          FROM profiles 
          JOIN roles ON profiles.role_id = roles.id 
          WHERE roles.name = 'manager'
        ) OR auth.uid() IN (
          SELECT user_id FROM profiles
        ));
      
      CREATE POLICY roles_insert_update_delete_policy ON public.roles 
        USING (auth.uid() IN (
          SELECT profiles.user_id 
          FROM profiles 
          JOIN roles ON profiles.role_id = roles.id 
          WHERE roles.name = 'manager'
        ));
    `);
    
    // 5. Create get_user_role function
    console.log('Creating get_user_role function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
      RETURNS TEXT AS $$
      DECLARE
        user_role TEXT;
      BEGIN
        SELECT roles.name INTO user_role
        FROM profiles
        JOIN roles ON profiles.role_id = roles.id
        WHERE profiles.user_id = get_user_role.user_id;
        
        RETURN user_role;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    
    // 6. Set default role for existing users
    console.log('Setting default roles for existing users...');
    const managerRole = await client.query(`
      SELECT id FROM public.roles WHERE name = 'manager'
    `);
    
    if (managerRole.rows.length > 0) {
      await client.query(`
        UPDATE public.profiles
        SET role_id = $1
        WHERE role_id IS NULL
      `, [managerRole.rows[0].id]);
      console.log('Default roles set for existing users');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    // Release the client back to the pool
    client.release();
    pool.end();
  }
}

runMigration();