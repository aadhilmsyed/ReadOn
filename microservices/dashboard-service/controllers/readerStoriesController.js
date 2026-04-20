const model = require('../models/readerStoryModel');

function badRequest(res, code, message) {
  return res.status(400).json({ error: code, message });
}

function notFound(res) {
  return res.status(404).json({ error: 'not_found' });
}

exports.create = async function create(req, res) {
  try {
    const body = req.body || {};
    const user_id = typeof body.user_id === 'string' ? body.user_id.trim().toLowerCase() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const source_text = typeof body.source_text === 'string' ? body.source_text : '';
    if (!user_id) return badRequest(res, 'invalid_user', 'user_id is required');
    if (!title) return badRequest(res, 'invalid_title', 'title is required');
    if (!source_text.trim()) return badRequest(res, 'invalid_source', 'source_text is required');
    const row = await model.createReaderStory({ user_id, title, source_text: source_text.trim() });
    return res.status(201).json(row);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'ERROR', message: 'reader_stories_create_failed', err: String(err && err.message) }));
    return res.status(500).json({ error: 'create_failed', message: String(err && err.message) });
  }
};

exports.getOne = async function getOne(req, res) {
  try {
    const storyId = req.params.storyId;
    const userId = (typeof req.query.user_id === 'string' ? req.query.user_id : '').trim().toLowerCase();
    if (!userId) return badRequest(res, 'invalid_user', 'user_id query is required');
    const row = await model.getReaderStoryForUser(storyId, userId);
    if (!row) return notFound(res);
    return res.json(row);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'ERROR', message: 'reader_stories_get_failed', err: String(err && err.message) }));
    return res.status(500).json({ error: 'get_failed', message: String(err && err.message) });
  }
};

exports.list = async function list(req, res) {
  try {
    const userId = (typeof req.query.user_id === 'string' ? req.query.user_id : '').trim().toLowerCase();
    if (!userId) return badRequest(res, 'invalid_user', 'user_id query is required');
    const limit = Number(req.query.limit);
    const rows = await model.listReaderStoriesForUser(userId, limit);
    return res.json({ stories: rows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'ERROR', message: 'reader_stories_list_failed', err: String(err && err.message) }));
    return res.status(500).json({ error: 'list_failed', message: String(err && err.message) });
  }
};

exports.patchAssets = async function patchAssets(req, res) {
  try {
    const storyId = req.params.storyId;
    const body = req.body || {};
    const userId = typeof body.user_id === 'string' ? body.user_id.trim().toLowerCase() : '';
    if (!userId) return badRequest(res, 'invalid_user', 'user_id is required');
    const payload = {};
    if (body.comprehension_result_id !== undefined) {
      payload.comprehension_result_id =
        typeof body.comprehension_result_id === 'string' ? body.comprehension_result_id.trim() : null;
    }
    if (body.audiobook_audio_base64 !== undefined) {
      payload.audiobook_audio_base64 =
        typeof body.audiobook_audio_base64 === 'string' ? body.audiobook_audio_base64 : null;
    }
    const { updated } = await model.patchReaderStoryAssets(storyId, userId, payload);
    if (!updated) return notFound(res);
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'ERROR', message: 'reader_stories_patch_assets_failed', err: String(err && err.message) }));
    return res.status(500).json({ error: 'patch_assets_failed', message: String(err && err.message) });
  }
};

exports.getAudiobook = async function getAudiobook(req, res) {
  try {
    const storyId = req.params.storyId;
    const userId = (typeof req.query.user_id === 'string' ? req.query.user_id : '').trim().toLowerCase();
    if (!userId) return badRequest(res, 'invalid_user', 'user_id query is required');
    const b64 = await model.getAudiobookAudioBase64ForUser(storyId, userId);
    if (!b64) return notFound(res);
    return res.json({ mimeType: 'audio/mpeg', audioBase64: b64 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'ERROR', message: 'reader_stories_audiobook_get_failed', err: String(err && err.message) }));
    return res.status(500).json({ error: 'get_failed', message: String(err && err.message) });
  }
};

exports.patch = async function patch(req, res) {
  try {
    const storyId = req.params.storyId;
    const body = req.body || {};
    const userId = typeof body.user_id === 'string' ? body.user_id.trim().toLowerCase() : '';
    if (!userId) return badRequest(res, 'invalid_user', 'user_id is required');
    const updates = {
      phonics_status: body.phonics_status,
      comprehension_status: body.comprehension_status,
      visualization_status: body.visualization_status,
      audiobook_status: body.audiobook_status,
    };
    const { updated } = await model.patchReaderStoryStatuses(storyId, userId, updates);
    if (!updated) return notFound(res);
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'ERROR', message: 'reader_stories_patch_failed', err: String(err && err.message) }));
    return res.status(500).json({ error: 'patch_failed', message: String(err && err.message) });
  }
};
