import { readFileSync } from 'node:fs';
import type { PhonicsFlashcardDto, PhonicsWordRow, ResolvedPhonicsEntry } from '@phonics/types';
import { getPhonicsPool } from '@phonics/models/db';
import { pathToInitMigrationSql } from '@phonics/utils/phonicsPaths';

let schemaReady = false;

export function loadInitMigrationSql(): string {
  return readFileSync(pathToInitMigrationSql(), 'utf-8');
}

/**
 * Applies idempotent DDL (CREATE IF NOT EXISTS). If the DB still has a pre-v2 schema,
 * run `npm run phonics:db:reset` once.
 */
export async function ensurePhonicsSchema(): Promise<void> {
  if (schemaReady) return;
  const sql = loadInitMigrationSql();
  const pool = getPhonicsPool();
  await pool.query(sql);
  schemaReady = true;
}

export async function deleteStoryLinks(storyId: string): Promise<void> {
  const pool = getPhonicsPool();
  await pool.query(`DELETE FROM "Story_Phonics_Words" WHERE "Story_ID" = $1`, [storyId]);
}

/** At most one row per Normalized_Word (global cache). */
export async function findWordByNormalized(normalizedWord: string): Promise<PhonicsWordRow | null> {
  const pool = getPhonicsPool();
  const res = await pool.query<PhonicsWordRow>(
    `SELECT * FROM "Phonics_Words" WHERE "Normalized_Word" = $1 LIMIT 1`,
    [normalizedWord],
  );
  return res.rows[0] ?? null;
}

export async function upsertPhonicsWord(entry: ResolvedPhonicsEntry): Promise<number> {
  const pool = getPhonicsPool();
  const res = await pool.query<{ Word_ID: string }>(
    `
    INSERT INTO "Phonics_Words" (
      "Word", "Normalized_Word", "Word_Type", "Meaning", "Breakdown", "Audio_URL"
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT ("Normalized_Word") DO UPDATE SET
      "Word" = EXCLUDED."Word",
      "Word_Type" = EXCLUDED."Word_Type",
      "Meaning" = EXCLUDED."Meaning",
      "Breakdown" = EXCLUDED."Breakdown",
      "Audio_URL" = EXCLUDED."Audio_URL",
      "Updated_At" = NOW()
    RETURNING "Word_ID"
    `,
    [
      entry.displayWord,
      entry.normalizedWord,
      entry.wordType,
      entry.meaning,
      entry.breakdown,
      entry.audioUrl,
    ],
  );
  return Number(res.rows[0]!.Word_ID);
}

export async function insertStoryWordLink(storyId: string, wordId: number, displayOrder: number): Promise<void> {
  const pool = getPhonicsPool();
  await pool.query(
    `
    INSERT INTO "Story_Phonics_Words" ("Story_ID", "Word_ID", "Display_Order")
    VALUES ($1, $2, $3)
    ON CONFLICT ("Story_ID", "Word_ID") DO UPDATE SET
      "Display_Order" = EXCLUDED."Display_Order"
    `,
    [storyId, wordId, displayOrder],
  );
}

export async function fetchStoryFlashcards(storyId: string): Promise<PhonicsFlashcardDto[]> {
  const pool = getPhonicsPool();
  const res = await pool.query<
    PhonicsWordRow & { Display_Order: number }
  >(
    `
    SELECT w.*, l."Display_Order"
    FROM "Story_Phonics_Words" l
    JOIN "Phonics_Words" w ON w."Word_ID" = l."Word_ID"
    WHERE l."Story_ID" = $1
    ORDER BY l."Display_Order" ASC
    `,
    [storyId],
  );

  return res.rows.map((r) => ({
    wordId: Number(r.Word_ID),
    word: r.Word,
    meaning: r.Meaning,
    breakdown: r.Breakdown,
    audioUrl: r.Audio_URL,
    displayOrder: r.Display_Order,
    wordType: r.Word_Type,
  }));
}

export async function storyHasLinks(storyId: string): Promise<boolean> {
  const pool = getPhonicsPool();
  const res = await pool.query(`SELECT 1 FROM "Story_Phonics_Words" WHERE "Story_ID" = $1 LIMIT 1`, [
    storyId,
  ]);
  return res.rowCount !== null && res.rowCount > 0;
}
