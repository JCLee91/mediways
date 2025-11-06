-- Fix incorrect CHECK constraint on generations.type
-- Ensures allowed values: 'blog', 'sns', 'youtube', 'copywriting'

DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find existing CHECK constraint on the type column
  SELECT conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE t.relname = 'generations'
    AND n.nspname = 'public'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%CHECK%type%IN%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.generations DROP CONSTRAINT %I', constraint_name);
  END IF;

  -- Recreate the correct CHECK constraint
  ALTER TABLE public.generations
  ADD CONSTRAINT generations_type_check
    CHECK (type IN ('blog', 'sns', 'youtube', 'copywriting'));
END $$;


