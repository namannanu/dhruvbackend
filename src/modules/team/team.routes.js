const express = require('express');
const controller = require('./team.controller');
const { protect, restrictTo } = require('../../shared/middlewares/auth.middleware');
const Business = require('../businesses/business.model');
const AppError = require('../../shared/utils/appError');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Middleware to check if user can manage teams (either employer or business owner)
const canManageTeam = async (req, res, next) => {
  if (req.user.userType === 'employer') {
    return next();
  }
  
  // Check if user owns any businesses
  const businessCount = await Business.countDocuments({ owner: req.user._id });
  if (businessCount > 0) {
    return next();
  }
  
  // Check if user has team management permissions for the specific business in the request
  const businessId = req.body?.businessContext?.businessId;
  if (businessId) {
    const TeamAccess = require('./teamAccess.model');
    const access = await TeamAccess.findOne({
      employeeId: req.user._id,
      'businessContext.businessId': businessId,
      status: { $in: ['active', 'pending'] },
      $or: [
        { 'permissions.canManageTeam': true },
        { 'permissions.canGrantAccess': true },
        { accessLevel: 'full_access' }
      ]
    });
    
    if (access) {
      return next();
    }
  }
  
  return next(new AppError('Access denied. You must be an employer or business owner to manage teams.', 403));
};

router.post('/grant-access', canManageTeam, controller.grantAccess);
router.get('/my-team', canManageTeam, controller.listMyTeam);
router.get('/my-access', controller.listMyAccess);
router.get('/check-access/:email', controller.checkAccessByEmail);
router.patch('/access/:identifier', canManageTeam, controller.updateAccess);
router.delete('/access/:identifier', canManageTeam, controller.revokeAccess);
router.get('/notifications', controller.listTeamNotifications);
router.patch('/notifications/:notificationId/read', controller.markTeamNotificationRead);

module.exports = router;
