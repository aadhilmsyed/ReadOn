-- Destructive reset: drops phonics tables (run via npm run phonics:db:reset).
-- Story_Phonics_Words first (FK), then Phonics_Words.

DROP TABLE IF EXISTS "Story_Phonics_Words" CASCADE;
DROP TABLE IF EXISTS "Phonics_Words" CASCADE;
