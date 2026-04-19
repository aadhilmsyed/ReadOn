// Story model — three SQL operations against the `stories` table. The same
// SQL is reused per feature; the only thing that varies is which pool
// (database) we run it against.

const { poolFor } = require('../db/pools');

async function insert(feature, { title, source_text }) {
  const sql = `
    INSERT INTO stories (title, source_text)
    VALUES ($1, $2)
    RETURNING story_id, title, source_text, created_at
  `;
  const { rows } = await poolFor(feature).query(sql, [title, source_text]);
  return rows[0];
}

async function listRecent(feature, limit) {
  const sql = `
    SELECT story_id, title, created_at
    FROM stories
    ORDER BY created_at DESC
    LIMIT $1
  `;
  const { rows } = await poolFor(feature).query(sql, [limit]);
  return rows;
}

async function findById(feature, storyId) {
  const sql = `
    SELECT story_id, title, source_text, created_at
    FROM stories
    WHERE story_id = $1
  `;
  const { rows } = await poolFor(feature).query(sql, [storyId]);
  return rows[0] || null;
}

module.exports = { insert, listRecent, findById };
