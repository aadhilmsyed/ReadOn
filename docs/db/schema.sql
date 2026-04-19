-- ReadOn — canonical `stories` schema.
--
-- Run this once in EACH feature service's logical database on the shared
-- `readon-sql` Cloud SQL instance:
--
--   phonics
--   comprehension
--   images          -- visualization-service uses this database (legacy name)
--   audiobook
--
-- Each microservice owns the `stories` table inside its own logical DB.
-- The dashboard-service composes across them via API; nothing cross-DB joins.

CREATE TABLE IF NOT EXISTS stories (
  story_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(100) NOT NULL CHECK (char_length(title) > 0),
  source_text TEXT         NOT NULL CHECK (char_length(source_text) > 0),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stories_created_at_idx ON stories(created_at DESC);
