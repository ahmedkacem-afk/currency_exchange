-- First, check if profiles table exists and create it if not
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            first_name VARCHAR,
            last_name VARCHAR,
            email VARCHAR,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index for faster lookups
        CREATE INDEX profiles_user_id_idx ON profiles(user_id);
    END IF;
END $$;

-- Now create the roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles (only these four roles as specified)
INSERT INTO public.roles (name, description) 
VALUES 
    ('manager', 'Has access to all system features and functionalities'),
    ('treasurer', 'Manages cash custody and treasury operations'),
    ('cashier', 'Handles currency exchange transactions and cash custody'),
    ('dealings_executioner', 'Executes currency dealings and operations')
ON CONFLICT (name) DO NOTHING;

-- Add role_id to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN role_id UUID REFERENCES public.roles(id);

        -- Create index for faster lookups
        CREATE INDEX profiles_role_id_idx ON public.profiles(role_id);
    END IF;
END $$;

-- Create Row Level Security for profiles and roles tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to view their own profiles
CREATE POLICY profiles_select_policy ON public.profiles 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            JOIN roles ON profiles.role_id = roles.id 
            WHERE roles.name = 'manager'
        )
    );

-- Only allow managers to modify other profiles
CREATE POLICY profiles_insert_policy ON public.profiles 
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            JOIN roles ON profiles.role_id = roles.id 
            WHERE roles.name = 'manager'
        )
    );

CREATE POLICY profiles_update_policy ON public.profiles 
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT profiles.user_id 
            FROM profiles 
            JOIN roles ON profiles.role_id = roles.id 
            WHERE roles.name = 'manager'
        )
    );

-- Only allow managers to view or modify roles
CREATE POLICY roles_select_policy ON public.roles 
    FOR SELECT USING (true);  -- Everyone can view roles

CREATE POLICY roles_insert_update_delete_policy ON public.roles 
    USING (auth.uid() IN (
        SELECT profiles.user_id 
        FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE roles.name = 'manager'
    ));

-- Add role information function
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

-- Create trigger function for auto-creating a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
    profile_count INTEGER;
BEGIN
    -- Count existing profiles
    SELECT COUNT(*) INTO profile_count FROM profiles;
    
    -- Get the manager role ID
    SELECT id INTO default_role_id FROM roles WHERE name = 'manager';
    
    -- Create a new profile for the user
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role_id)
    VALUES (
        NEW.id,
        NEW.email,
        '',  -- Default empty first name
        '',  -- Default empty last name
        CASE 
            -- If this is the first user, assign manager role
            WHEN profile_count = 0 AND default_role_id IS NOT NULL THEN default_role_id
            ELSE NULL  -- Otherwise no role (will be assigned by a manager)
        END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Update all existing users to have profiles if they don't already
DO $$
DECLARE
    user_record RECORD;
    manager_role_id UUID;
    profile_exists BOOLEAN;
BEGIN
    -- Get the manager role ID
    SELECT id INTO manager_role_id FROM roles WHERE name = 'manager';
    
    -- For each user in auth.users
    FOR user_record IN SELECT * FROM auth.users LOOP
        -- Check if profile exists
        SELECT EXISTS(
            SELECT 1 FROM profiles WHERE user_id = user_record.id
        ) INTO profile_exists;
        
        -- If no profile exists, create one
        IF NOT profile_exists THEN
            INSERT INTO public.profiles (user_id, email, role_id)
            VALUES (
                user_record.id,
                user_record.email,
                manager_role_id  -- Assign manager role to existing users
            );
        END IF;
    END LOOP;
END $$;