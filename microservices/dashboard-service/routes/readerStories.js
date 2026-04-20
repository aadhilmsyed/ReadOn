const express = require('express');
const ctrl = require('../controllers/readerStoriesController');

const router = express.Router();

router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.get('/:storyId/audiobook', ctrl.getAudiobook);
router.patch('/:storyId/assets', ctrl.patchAssets);
router.get('/:storyId', ctrl.getOne);
router.patch('/:storyId', ctrl.patch);

module.exports = router;
