CREATE TABLE IF NOT EXISTS comprehension_results (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  story_id TEXT,
  title TEXT,
  text_hash TEXT NOT NULL,
  source_text TEXT NOT NULL,
  provider TEXT,
  status TEXT NOT NULL,
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  circuit_state TEXT NOT NULL,
  score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprehension_results_user_created
  ON comprehension_results (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comprehension_results_text_hash_created
  ON comprehension_results (text_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS comprehension_questions (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL REFERENCES comprehension_results(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options_json JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprehension_questions_result_order
  ON comprehension_questions (result_id, sort_order);

CREATE TABLE IF NOT EXISTS comprehension_answer_history (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL REFERENCES comprehension_results(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES comprehension_questions(id) ON DELETE CASCADE,
  user_id TEXT,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprehension_answer_history_user_submitted
  ON comprehension_answer_history (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_comprehension_answer_history_result_submitted
  ON comprehension_answer_history (result_id, submitted_at DESC);
