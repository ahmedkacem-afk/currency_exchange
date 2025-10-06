-- Add auth_linked column to users table
ALTER TABLE IF EXISTS public.users
ADD COLUMN IF NOT EXISTS auth_linked boolean DEFAULT true;

-- Add an index on email for faster lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Add a function to handle automatic user creation that ensures name isn't null
CREATE OR REPLACE FUNCTION public.handle_auth_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user record doesn't exist but we have an auth user, create the user record
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    INSERT INTO public.users (id, email, name, role, is_email_verified, auth_linked)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Use email as name if full_name is null
      'user', 
      true, 
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to handle new auth users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_creation();