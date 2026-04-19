const express = require('express');
const ctrl = require('../controllers/creditsController');

const router = express.Router();

router.get('/:userId',           ctrl.get);
router.post('/:userId/recharge', ctrl.recharge);
router.post('/:userId/charge',   ctrl.charge);

module.exports = router;
