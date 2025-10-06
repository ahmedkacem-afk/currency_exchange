-- SQL to update the users table structure
-- This will modify the users table to store the necessary information

-- First, check if role_id column exists in users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'role_id') THEN
        -- Add role_id column if it doesn't exist
        ALTER TABLE public.users ADD COLUMN role_id uuid REFERENCES public.roles(id);
        
        -- Update existing users to map their text role to role_id
        UPDATE public.users u
        SET role_id = r.id
        FROM public.roles r
        WHERE u.role = r.name;
    END IF;
END$$;

-- Add first_name and last_name columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'first_name') THEN
        ALTER TABLE public.users ADD COLUMN first_name text;
        ALTER TABLE public.users ADD COLUMN last_name text;
        
        -- Update first_name and last_name from existing name values
        UPDATE public.users
        SET 
            first_name = SPLIT_PART(name, ' ', 1),
            last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1);
    END IF;
END$$;

-- Add phone column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'phone') THEN
        ALTER TABLE public.users ADD COLUMN phone text;
    END IF;
END$$;

-- Add is_email_verified column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'is_email_verified') THEN
        ALTER TABLE public.users ADD COLUMN is_email_verified boolean DEFAULT false;
    END IF;
END$$;

-- Add created_at and updated_at columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE public.users ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.users ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END$$;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger
DROP TRIGGER IF EXISTS update_users_timestamp ON public.users;
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Create a trigger to auto-verify email when a user is created through auth
CREATE OR REPLACE FUNCTION auto_verify_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_email_verified = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_verify_user_email ON public.users;
CREATE TRIGGER auto_verify_user_email
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION auto_verify_email();

-- Add custody-related columns if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'has_custody') THEN
        ALTER TABLE public.users ADD COLUMN has_custody boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'custody_id') THEN
        ALTER TABLE public.users ADD COLUMN custody_id uuid;
    END IF;
END$$;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);