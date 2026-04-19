import type { Pool } from 'pg';

import { getCloudSqlPool } from '@/lib/cloudSqlPool';

export type TtsGenerationStatus = 'completed' | 'failed';

function quotedTableName(): string {
  const raw = (process.env.CLOUDSQL_TTS_GENERATIONS_TABLE ?? 'TTS_Generations').trim() || 'TTS_Generations';
  return `"${raw.replace(/"/g, '""')}"`;
}

function truncateMessage(message: string, maxLen: number): string {
  if (message.length <= maxLen) {
    return message;
  }
  return `${message.slice(0, maxLen - 1)}…`;
}

/**
 * Inserts one row into TTS_Generations. Swallows errors so TTS can still succeed if DB is down.
 * Expects a table compatible with:
 * Story_ID (nullable int), Location (text), Duration_Seconds (nullable), Status, Error_Message (nullable),
 * Created_At / Updated_At (defaults or set here). Generation_ID should be serial/identity.
 */
export async function insertTtsGenerationRow(params: {
  pool?: Pool | null;
  storyId: number | null;
  location: string;
  durationSeconds: number | null;
  status: TtsGenerationStatus;
  errorMessage: string | null;
}): Promise<void> {
  const pool = params.pool ?? getCloudSqlPool();
  if (!pool) {
    console.warn('[TTS_Generations] skip insert: no DB pool (set DATABASE_URL or CLOUDSQL_DB_USER + CLOUDSQL_DB_NAME).');
    return;
  }

  const table = quotedTableName();
  const sql = `
    INSERT INTO ${table} (
      "Story_ID",
      "Location",
      "Duration_Seconds",
      "Status",
      "Error_Message",
      "Created_At",
      "Updated_At"
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
  `;

  try {
    await pool.query(sql, [
      params.storyId,
      truncateMessage(params.location, 2048),
      params.durationSeconds,
      params.status,
      params.errorMessage ? truncateMessage(params.errorMessage, 4000) : null,
    ]);
  } catch (err) {
    console.error('[TTS_Generations] insert failed:', err instanceof Error ? err.message : err);
  }
}
