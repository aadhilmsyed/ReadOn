DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comprehension_results' AND column_name = 'source_text_hash'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comprehension_results' AND column_name = 'text_hash'
  ) THEN
    ALTER TABLE comprehension_results RENAME COLUMN source_text_hash TO text_hash;
  END IF;
END $$;

ALTER TABLE IF EXISTS comprehension_results
  ADD COLUMN IF NOT EXISTS text_hash TEXT,
  ADD COLUMN IF NOT EXISTS source_text TEXT,
  ADD COLUMN IF NOT EXISTS score INTEGER;

UPDATE comprehension_results
SET source_text = ''
WHERE source_text IS NULL;

ALTER TABLE IF EXISTS comprehension_results
  ALTER COLUMN text_hash SET NOT NULL,
  ALTER COLUMN source_text SET NOT NULL,
  ALTER COLUMN provider DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comprehension_questions' AND column_name = 'options'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comprehension_questions' AND column_name = 'options_json'
  ) THEN
    ALTER TABLE comprehension_questions RENAME COLUMN options TO options_json;
  END IF;
END $$;

ALTER TABLE IF EXISTS comprehension_questions
  ADD COLUMN IF NOT EXISTS question_type TEXT;

UPDATE comprehension_questions
SET question_type = 'multiple_choice'
WHERE question_type IS NULL;

ALTER TABLE IF EXISTS comprehension_questions
  ALTER COLUMN question_type SET NOT NULL,
  ALTER COLUMN explanation DROP NOT NULL;

CREATE TABLE IF NOT EXISTS comprehension_answer_history (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL REFERENCES comprehension_results(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES comprehension_questions(id) ON DELETE CASCADE,
  user_id TEXT,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'comprehension_answer_attempts'
  ) THEN
    INSERT INTO comprehension_answer_history (
      id,
      result_id,
      question_id,
      user_id,
      selected_answer,
      is_correct,
      submitted_at
    )
    SELECT
      id,
      result_id,
      question_id,
      user_id,
      selected_answer,
      is_correct,
      submitted_at
    FROM comprehension_answer_attempts
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comprehension_results_user_created
  ON comprehension_results (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comprehension_results_text_hash_created
  ON comprehension_results (text_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comprehension_questions_result_order
  ON comprehension_questions (result_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_comprehension_answer_history_user_submitted
  ON comprehension_answer_history (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_comprehension_answer_history_result_submitted
  ON comprehension_answer_history (result_id, submitted_at DESC);
