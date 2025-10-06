-- Migration to update users with role_id but no direct role string
-- This ensures all users have a role field set for direct access

-- First, make sure all users have either a role or role_id column
CREATE OR REPLACE FUNCTION public.populate_direct_roles()
RETURNS void AS $$
BEGIN
  -- Update users that have a role_id but no role
  UPDATE users 
  SET role = roles.name
  FROM roles
  WHERE users.role_id = roles.id AND users.role IS NULL;
  
  -- Set default role for any users without any role
  UPDATE users
  SET role = 'user'
  WHERE role IS NULL AND role_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT populate_direct_roles();

-- Drop the function as it's only needed once
DROP FUNCTION IF EXISTS public.populate_direct_roles();

-- Log the migration
INSERT INTO public.migrations (name, executed_at)
VALUES ('update_users_direct_roles', NOW());