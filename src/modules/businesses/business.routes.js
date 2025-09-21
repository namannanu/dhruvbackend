const express = require('express');
const controller = require('./business.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.get('/', controller.listBusinesses);
router.post('/', restrictTo('employer'), controller.createBusiness);
router.patch('/:businessId', restrictTo('employer'), controller.updateBusiness);
router.delete('/:businessId', restrictTo('employer'), controller.deleteBusiness);
router.post('/:businessId/select', restrictTo('employer'), controller.selectBusiness);

router.get('/:businessId/team-members', restrictTo('employer'), controller.manageTeamMember.list);
router.post('/:businessId/team-members', restrictTo('employer'), controller.manageTeamMember.create);
router.patch(
  '/:businessId/team-members/:memberId',
  restrictTo('employer'),
  controller.manageTeamMember.update
);
router.delete(
  '/:businessId/team-members/:memberId',
  restrictTo('employer'),
  controller.manageTeamMember.remove
);

module.exports = router;
