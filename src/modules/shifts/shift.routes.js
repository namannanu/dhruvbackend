const express = require('express');
const controller = require('./shift.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', controller.listSwaps);
router.post('/', controller.requestSwap);
router.patch('/:swapId', controller.updateSwap);

router.get('/shifts', controller.listShifts);
router.get('/swaps', controller.listSwaps);
router.post('/swaps', controller.requestSwap);
router.patch('/swaps/:swapId', controller.updateSwap);

module.exports = router;
