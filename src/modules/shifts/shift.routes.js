const express = require('express');
const controller = require('./shift.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', requirePermissions(['view_schedules']), controller.listSwaps);
router.post('/', requirePermissions(['create_schedules']), controller.requestSwap);
router.patch('/:swapId', requirePermissions(['manage_schedules']), controller.updateSwap);

router.get('/shifts', requirePermissions(['view_schedules']), controller.listShifts);
router.get('/swaps', requirePermissions(['view_schedules']), controller.listSwaps);
router.post('/swaps', requirePermissions(['create_schedules']), controller.requestSwap);
router.patch('/swaps/:swapId', requirePermissions(['manage_schedules']), controller.updateSwap);

module.exports = router;
