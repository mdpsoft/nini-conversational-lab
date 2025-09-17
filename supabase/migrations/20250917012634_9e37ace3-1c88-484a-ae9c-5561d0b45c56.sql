-- Add audit columns to userai_profiles table
-- created_at (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'userai_profiles'
      AND column_name = 'created_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.userai_profiles ADD COLUMN created_at timestamptz DEFAULT now()';
  END IF;
END$$;

-- updated_at (if not exists) 
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'userai_profiles'
      AND column_name = 'updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.userai_profiles ADD COLUMN updated_at timestamptz DEFAULT now()';
  END IF;
END$$;

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION public.set_userai_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_userai_profiles_updated_at ON public.userai_profiles;

-- Create trigger for automatic updated_at maintenance
CREATE TRIGGER trg_userai_profiles_updated_at
BEFORE UPDATE ON public.userai_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_userai_profiles_updated_at();