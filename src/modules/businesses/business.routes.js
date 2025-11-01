const express = require('express');
const multer = require('multer');
const controller = require('./business.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');
const dbHealthCheck = require('../../shared/middlewares/dbHealthCheck');
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

// Apply database health check to all routes
router.use(dbHealthCheck);
router.use(protect);

// Permission checks removed per user request
// Business management routes 
router.get('/', controller.listBusinesses);
router.post('/', restrictTo('employer'), controller.createBusiness);
router.patch('/:businessId', controller.updateBusiness);
router.delete('/:businessId', controller.deleteBusiness);
router.post('/:businessId/select', restrictTo('employer'), controller.selectBusiness);
router.post(
  '/:businessId/logo',
  upload.single('logo'),
  controller.uploadBusinessLogo
);
router.get(
  '/:businessId/logo',
  controller.getBusinessLogo
);

// Team management routes
router.get('/:businessId/team-members', controller.manageTeamMember.list);
router.post('/:businessId/team-members', controller.manageTeamMember.create);
router.patch(
  '/:businessId/team-members/:memberId',
  controller.manageTeamMember.update
);
router.delete(
  '/:businessId/team-members/:memberId',
  controller.manageTeamMember.remove
);

module.exports = router;
