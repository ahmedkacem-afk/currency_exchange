-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on the roles table
DROP TRIGGER IF EXISTS update_roles_updated_at ON public.roles;
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles if they don't exist
INSERT INTO public.roles (name, description, permissions)
VALUES 
  ('manager', 'Manager with full access', '{"all": true, "manage_users": true, "manage_wallets": true, "view_reports": true}'),
  ('cashier', 'Cashier with transaction operations', '{"create_transactions": true, "view_own_transactions": true}'),
  ('treasurer', 'Treasurer with cash custody operations', '{"manage_treasury": true, "view_custody": true}'),
  ('validator', 'Transaction validator', '{"validate_transactions": true, "view_transactions": true}')
ON CONFLICT (name) DO NOTHING;

-- Record this migration
INSERT INTO public.migrations (name, executed_at)
VALUES ('007_create_roles_table', NOW())
ON CONFLICT (name) DO NOTHING;