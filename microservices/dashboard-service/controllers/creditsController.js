const credits = require('../models/creditsModel');

function logErr(op, err) {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ level: 'ERROR', message: `credits_${op}_failed`, err: err.message }));
}

async function get(req, res) {
  try {
    const result = await credits.getBalance(req.params.userId);
    res.json(result);
  } catch (err) {
    if (err.code === 'INVALID_USER_ID') return res.status(400).json({ error: 'invalid_user_id' });
    logErr('get', err);
    res.status(500).json({ error: 'internal' });
  }
}

async function recharge(req, res) {
  try {
    const dollars = Number((req.body || {}).dollars);
    const result = await credits.recharge(req.params.userId, dollars);
    res.json(result);
  } catch (err) {
    if (err.code === 'INVALID_USER_ID') return res.status(400).json({ error: 'invalid_user_id' });
    if (err.code === 'INVALID_DOLLARS') return res.status(400).json({ error: 'invalid_dollars' });
    logErr('recharge', err);
    res.status(500).json({ error: 'internal' });
  }
}

async function charge(req, res) {
  try {
    const { amount, reason } = req.body || {};
    const result = await credits.charge(req.params.userId, Number(amount), reason);
    res.json(result);
  } catch (err) {
    if (err.code === 'INVALID_USER_ID')      return res.status(400).json({ error: 'invalid_user_id' });
    if (err.code === 'INVALID_AMOUNT')       return res.status(400).json({ error: 'invalid_amount' });
    if (err.code === 'INSUFFICIENT_CREDITS') return res.status(402).json({ error: 'insufficient_credits' });
    logErr('charge', err);
    res.status(500).json({ error: 'internal' });
  }
}

module.exports = { get, recharge, charge };
