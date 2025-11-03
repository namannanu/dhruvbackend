const express = require('express');
const controller = require('./business.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');

const router = express.Router();

router.use(protect);

// Business management routes with permission protection
router.get('/', controller.listBusinesses); // No specific permission needed - users can see their businesses
router.post('/', restrictTo('employer'), requirePermissions('create_business'), controller.createBusiness);
router.patch('/:businessId', requirePermissions('edit_business'), controller.updateBusiness);
router.delete('/:businessId', requirePermissions('delete_business'), controller.deleteBusiness);
router.post('/:businessId/select', restrictTo('employer'), controller.selectBusiness); // No specific permission needed
router.get('/:businessId/address', controller.getBusinessAddress); // Get business address for job creation

// Team management routes with permission protection
router.get('/:businessId/team-members', requirePermissions(['view_team_members']), controller.manageTeamMember.list);
router.post('/:businessId/team-members', requirePermissions('invite_team_members'), controller.manageTeamMember.create);
router.patch(
  '/:businessId/team-members/:memberId',
  requirePermissions('edit_team_members'),
  controller.manageTeamMember.update
);
router.delete(
  '/:businessId/team-members/:memberId',
  requirePermissions('remove_team_members'),
  controller.manageTeamMember.remove
);

module.exports = router;
