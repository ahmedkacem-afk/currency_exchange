-- Migration to drop profiles table after migrating to using users table directly
-- This migration assumes all data from profiles has been migrated to the users table
-- and all application code has been updated to use the users table

-- Drop any existing functions or triggers that reference profiles table
DROP FUNCTION IF EXISTS public.get_user_role(UUID);

-- Drop all policies referencing the profiles table
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;

-- Drop RLS from the profiles table
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop indexes on the profiles table
DROP INDEX IF EXISTS profiles_user_id_idx;
DROP INDEX IF EXISTS profiles_role_id_idx;
DROP INDEX IF EXISTS idx_profiles_email;

-- Drop any foreign keys that reference profiles table
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_id_fkey;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Finally, drop the profiles table
DROP TABLE IF EXISTS public.profiles;

-- Create updated get_user_role function using users table
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.name
  FROM roles r
  JOIN users u ON r.id = u.role_id
  WHERE u.id = get_user_role.user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO service_role;

-- Log the migration
INSERT INTO public.migrations (name, executed_at)
VALUES ('drop_profiles_table', NOW());