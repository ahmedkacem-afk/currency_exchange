-- Migration: Add name column to custody table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'custody' AND column_name = 'name'
    ) THEN
        ALTER TABLE public.custody ADD COLUMN name text;
    END IF;
END $$;

-- Populate name for existing custodies using wallet name
UPDATE public.custody c
SET name = w.name
FROM public.wallets w
WHERE c.wallet_id = w.id AND (c.name IS NULL OR c.name = '');
