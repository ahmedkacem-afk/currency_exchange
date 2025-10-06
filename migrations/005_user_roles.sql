-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
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

-- Create Row Level Security for roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Only allow managers to modify roles
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

-- Add role information to the auth.users() function response
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