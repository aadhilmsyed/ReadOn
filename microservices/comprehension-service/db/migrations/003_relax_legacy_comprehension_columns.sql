DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comprehension_results' AND column_name = 'generation_source'
  ) THEN
    ALTER TABLE comprehension_results
      ALTER COLUMN generation_source DROP NOT NULL,
      ALTER COLUMN generation_source SET DEFAULT 'default_fallback';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comprehension_results' AND column_name = 'cached'
  ) THEN
    ALTER TABLE comprehension_results
      ALTER COLUMN cached SET DEFAULT false;
  END IF;
END $$;
