const express = require('express');
const multer = require('multer');
const controller = require('./business.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');
const { requirePermissions } = require('../../shared/middlewares/permissionMiddleware');
const AppError = require('../../shared/utils/appError');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed', 400));
    }
    cb(null, true);
  }
});

router.use(protect);

// Business management routes - create business without permission barriers for own businesses
router.get('/', controller.listBusinesses); // No specific permission needed - users can see their businesses
router.post('/', restrictTo('employer'), controller.createBusiness); // Direct creation for own businesses - no permission check needed
router.patch('/:businessId', requirePermissions('edit_business'), controller.updateBusiness);
router.delete('/:businessId', requirePermissions('delete_business'), controller.deleteBusiness);
router.post('/:businessId/select', restrictTo('employer'), controller.selectBusiness); // No specific permission needed
router.post(
  '/:businessId/logo',
  requirePermissions('edit_business'),
  upload.single('logo'),
  controller.uploadBusinessLogo
);
router.get(
  '/:businessId/logo',
  requirePermissions('view_business_profile'),
  controller.getBusinessLogo
);

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
