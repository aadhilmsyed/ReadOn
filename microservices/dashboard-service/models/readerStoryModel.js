const { randomUUID } = require('crypto');
const { dashboardPool } = require('../db/pools');

let ensured = false;

async function ensureReaderStoriesTable() {
  if (ensured) return;
  const pool = dashboardPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reader_stories (
      story_id UUID PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      source_text TEXT NOT NULL,
      phonics_status TEXT NOT NULL DEFAULT 'pending',
      comprehension_status TEXT NOT NULL DEFAULT 'pending',
      visualization_status TEXT NOT NULL DEFAULT 'pending',
      audiobook_status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_reader_stories_user_created ON reader_stories (user_id, created_at DESC);
  `);
  await pool.query(`
    ALTER TABLE reader_stories ADD COLUMN IF NOT EXISTS comprehension_result_id TEXT;
    ALTER TABLE reader_stories ADD COLUMN IF NOT EXISTS audiobook_audio_base64 TEXT;
  `);
  ensured = true;
}

const STATUS = new Set(['pending', 'ready', 'failed', 'unavailable']);

function normalizeStatus(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  return STATUS.has(s) ? s : null;
}

/**
 * @param {{ user_id: string; title: string; source_text: string }} row
 * @returns {Promise<{ story_id: string }>}
 */
async function createReaderStory(row) {
  await ensureReaderStoriesTable();
  const story_id = randomUUID();
  const pool = dashboardPool();
  await pool.query(
    `INSERT INTO reader_stories (story_id, user_id, title, source_text)
     VALUES ($1, $2, $3, $4)`,
    [story_id, row.user_id, row.title, row.source_text],
  );
  return { story_id };
}

/**
 * Returns row only when story exists AND user_id matches (no large audiobook blob).
 * @returns {Promise<object | null>}
 */
async function getReaderStoryForUser(storyId, userId) {
  await ensureReaderStoriesTable();
  const pool = dashboardPool();
  const { rows } = await pool.query(
    `SELECT story_id, user_id, title, source_text,
            phonics_status, comprehension_status, visualization_status, audiobook_status,
            comprehension_result_id, created_at
     FROM reader_stories WHERE story_id = $1 AND user_id = $2`,
    [storyId, userId],
  );
  return rows[0] || null;
}

/**
 * @param {string} userId
 * @param {number} limit
 */
async function listReaderStoriesForUser(userId, limit) {
  await ensureReaderStoriesTable();
  const pool = dashboardPool();
  const lim = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const { rows } = await pool.query(
    `SELECT story_id, title, source_text, phonics_status, comprehension_status, visualization_status, audiobook_status, created_at
     FROM reader_stories WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, lim],
  );
  return rows;
}

/**
 * @param {string} storyId
 * @param {string} userId
 * @param {Record<string, string>} updates keys phonics_status etc.
 */
async function patchReaderStoryStatuses(storyId, userId, updates) {
  await ensureReaderStoriesTable();
  const allowed = ['phonics_status', 'comprehension_status', 'visualization_status', 'audiobook_status'];
  const sets = [];
  const vals = [];
  let i = 1;
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      const s = normalizeStatus(updates[key]);
      if (!s) continue;
      sets.push(`${key} = $${i}`);
      vals.push(s);
      i += 1;
    }
  }
  if (sets.length === 0) {
    return { updated: 0 };
  }
  vals.push(storyId, userId);
  const pool = dashboardPool();
  const q = `UPDATE reader_stories SET ${sets.join(', ')} WHERE story_id = $${i} AND user_id = $${i + 1}`;
  const { rowCount } = await pool.query(q, vals);
  return { updated: rowCount };
}

/**
 * @param {string} storyId
 * @param {string} userId
 * @param {{ comprehension_result_id?: string | null, audiobook_audio_base64?: string | null }} assets
 */
async function patchReaderStoryAssets(storyId, userId, assets) {
  await ensureReaderStoriesTable();
  const sets = [];
  const vals = [];
  let n = 1;
  if (assets.comprehension_result_id !== undefined) {
    sets.push(`comprehension_result_id = $${n}`);
    vals.push(assets.comprehension_result_id || null);
    n += 1;
  }
  if (assets.audiobook_audio_base64 !== undefined) {
    sets.push(`audiobook_audio_base64 = $${n}`);
    vals.push(assets.audiobook_audio_base64 || null);
    n += 1;
  }
  if (sets.length === 0) {
    return { updated: 0 };
  }
  vals.push(storyId, userId);
  const pool = dashboardPool();
  const q = `UPDATE reader_stories SET ${sets.join(', ')} WHERE story_id = $${n} AND user_id = $${n + 1}`;
  const { rowCount } = await pool.query(q, vals);
  return { updated: rowCount };
}

/**
 * @returns {Promise<string | null>} base64 audio or null
 */
async function getAudiobookAudioBase64ForUser(storyId, userId) {
  await ensureReaderStoriesTable();
  const pool = dashboardPool();
  const { rows } = await pool.query(
    `SELECT audiobook_audio_base64 FROM reader_stories WHERE story_id = $1 AND user_id = $2`,
    [storyId, userId],
  );
  const row = rows[0];
  if (!row || !row.audiobook_audio_base64) return null;
  return String(row.audiobook_audio_base64);
}

module.exports = {
  createReaderStory,
  getReaderStoryForUser,
  listReaderStoriesForUser,
  patchReaderStoryStatuses,
  patchReaderStoryAssets,
  getAudiobookAudioBase64ForUser,
};
