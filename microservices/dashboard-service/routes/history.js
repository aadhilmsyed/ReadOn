const express = require('express');
const ctrl = require('../controllers/historyController');

const router = express.Router();

router.post('/:feature',           ctrl.create);
router.get('/:feature',            ctrl.list);
router.get('/:feature/:storyId',   ctrl.getById);

module.exports = router;
