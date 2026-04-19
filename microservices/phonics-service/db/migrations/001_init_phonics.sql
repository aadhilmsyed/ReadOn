-- Phonics microservice schema (PostgreSQL). One row per Normalized_Word (global cache).
-- Idempotent: safe for ensurePhonicsSchema on empty DB. If upgrading from an old schema, run reset first.

CREATE TABLE IF NOT EXISTS "Phonics_Words" (
  "Word_ID" BIGSERIAL PRIMARY KEY,
  "Word" TEXT NOT NULL,
  "Normalized_Word" TEXT NOT NULL UNIQUE,
  "Word_Type" TEXT NOT NULL CHECK ("Word_Type" IN ('acronym', 'noun', 'verb', 'adjective', 'adverb', 'unknown')),
  "Meaning" TEXT NOT NULL,
  "Breakdown" TEXT,
  "Audio_URL" TEXT,
  "Created_At" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "Updated_At" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_phonics_words_normalized"
  ON "Phonics_Words" ("Normalized_Word");

CREATE TABLE IF NOT EXISTS "Story_Phonics_Words" (
  "Story_Phonics_Word_ID" BIGSERIAL PRIMARY KEY,
  "Story_ID" TEXT NOT NULL,
  "Word_ID" BIGINT NOT NULL REFERENCES "Phonics_Words" ("Word_ID") ON DELETE CASCADE,
  "Display_Order" INT NOT NULL,
  "Created_At" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("Story_ID", "Word_ID")
);

CREATE INDEX IF NOT EXISTS "idx_story_phonics_words_story_id"
  ON "Story_Phonics_Words" ("Story_ID");
