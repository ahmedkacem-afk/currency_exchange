-- SQL Fix for schema-manager.js functions

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION public.check_table_exists(p_table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object('table_name', t.table_name)::json INTO result
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_name = p_table_name;
  
  RETURN COALESCE(result, '{"table_name": null}'::json);
END;
$$;

-- Function to get table columns
CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'column_name', c.column_name,
      'data_type', c.data_type
    )
  )::json INTO result
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = p_table_name;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to execute SQL statements (for table creation and alteration)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN json_build_object('success', true)::json;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  )::json;
END;
$$;

-- Make functions accessible via RPC
GRANT EXECUTE ON FUNCTION public.check_table_exists TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_columns TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql TO authenticated;