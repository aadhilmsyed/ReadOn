// HTTP-level controller. Validates feature key + payload, delegates to model,
// converts errors to status codes. The validation here is defense-in-depth on
// top of the orchestrator's validation and the DB CHECK constraints.

const storyModel = require('../models/storyModel');
const { FEATURE_KEYS } = require('../db/pools');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidFeature(feature) {
  return FEATURE_KEYS.includes(feature);
}

async function create(req, res) {
  const { feature } = req.params;
  if (!isValidFeature(feature)) return res.status(400).json({ error: 'invalid_feature' });

  const { title, source_text } = req.body || {};
  if (typeof title !== 'string' || title.length === 0 || title.length > 100) {
    return res.status(400).json({ error: 'invalid_title' });
  }
  if (typeof source_text !== 'string' || source_text.length === 0) {
    return res.status(400).json({ error: 'invalid_source_text' });
  }

  try {
    const story = await storyModel.insert(feature, { title, source_text });
    res.status(201).json({ feature, ...story });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'ERROR', message: 'history_create_failed', feature, err: err.message }));
    res.status(500).json({ error: 'internal' });
  }
}

async function list(req, res) {
  const { feature } = req.params;
  if (!isValidFeature(feature)) return res.status(400).json({ error: 'invalid_feature' });

  const requested = Number(req.query.limit);
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 100) : 10;

  try {
    const rows = await storyModel.listRecent(feature, limit);
    res.json({ feature, items: rows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'ERROR', message: 'history_list_failed', feature, err: err.message }));
    res.status(500).json({ error: 'internal' });
  }
}

async function getById(req, res) {
  const { feature, storyId } = req.params;
  if (!isValidFeature(feature)) return res.status(400).json({ error: 'invalid_feature' });
  if (!UUID_RE.test(storyId)) return res.status(400).json({ error: 'invalid_story_id' });

  try {
    const row = await storyModel.findById(feature, storyId);
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json({ feature, ...row });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'ERROR', message: 'history_get_failed', feature, err: err.message }));
    res.status(500).json({ error: 'internal' });
  }
}

module.exports = { create, list, getById };
