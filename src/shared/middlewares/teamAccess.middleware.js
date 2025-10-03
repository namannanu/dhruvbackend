const TeamAccess = require('../modules/team/teamAccess.model');
const User = require('../modules/users/user.model');
const AppError = require('../utils/appError');

// Middleware to check if user has team access to manage data for a specific userId
const checkTeamAccess = (requiredPermission = null) => {
  return async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return next(new AppError('UserId parameter is required', 400));
      }
      
      // Check if user is accessing their own data
      if (req.user.userId === userId) {
        req.teamAccess = {
          hasAccess: true,
          isOwner: true,
          role: 'owner',
          permissions: 'all'
        };
        return next();
      }
      
      // Check team access
      const accessCheck = await TeamAccess.checkAccess(
        req.user._id,
        userId,
        requiredPermission
      );
      
      if (!accessCheck.hasAccess) {
        return next(new AppError(accessCheck.reason || 'Access denied', 403));
      }
      
      // Attach access info to request for use in controllers
      req.teamAccess = {
        hasAccess: true,
        isOwner: false,
        role: accessCheck.role,
        permissions: accessCheck.permissions,
        access: accessCheck.access
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user can create data as another user (admin/manager level)
const checkCreateAccess = (entityType) => {
  return async (req, res, next) => {
    try {
      const { managedUserId } = req.body;
      
      if (!managedUserId) {
        return next(new AppError('managedUserId is required for team creation', 400));
      }
      
      // Check if user is creating for themselves
      if (req.user.userId === managedUserId) {
        req.teamAccess = {
          hasAccess: true,
          isOwner: true,
          managedUser: req.user
        };
        return next();
      }
      
      // Determine required permission based on entity type
      let requiredPermission;
      switch (entityType) {
        case 'job':
          requiredPermission = 'canCreateJobs';
          break;
        case 'attendance':
          requiredPermission = 'canCreateAttendance';
          break;
        default:
          requiredPermission = null;
      }
      
      // Check team access
      const accessCheck = await TeamAccess.checkAccess(
        req.user._id,
        managedUserId,
        requiredPermission
      );
      
      if (!accessCheck.hasAccess) {
        return next(new AppError(`Cannot create ${entityType}: ${accessCheck.reason}`, 403));
      }
      
      // Get the managed user info
      const managedUser = await User.findOne({ userId: managedUserId });
      if (!managedUser) {
        return next(new AppError('Managed user not found', 404));
      }
      
      // Attach access info to request
      req.teamAccess = {
        hasAccess: true,
        isOwner: false,
        role: accessCheck.role,
        permissions: accessCheck.permissions,
        managedUser,
        access: accessCheck.access
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to validate team access for data modification
const checkModifyAccess = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // This middleware is used for updating/deleting existing data
      // The entity should have an employerUserId or workerUserId field
      // We'll extract the userId from the populated entity
      
      // For now, we'll require the userId to be passed in params or body
      const { userId } = req.params;
      const { managedUserId } = req.body;
      const targetUserId = userId || managedUserId;
      
      if (!targetUserId) {
        return next(new AppError('UserId is required for team access validation', 400));
      }
      
      // Check if user is modifying their own data
      if (req.user.userId === targetUserId) {
        req.teamAccess = {
          hasAccess: true,
          isOwner: true
        };
        return next();
      }
      
      // Check team access
      const accessCheck = await TeamAccess.checkAccess(
        req.user._id,
        targetUserId,
        requiredPermission
      );
      
      if (!accessCheck.hasAccess) {
        return next(new AppError(accessCheck.reason || 'Modification access denied', 403));
      }
      
      req.teamAccess = {
        hasAccess: true,
        isOwner: false,
        role: accessCheck.role,
        permissions: accessCheck.permissions,
        access: accessCheck.access
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper function to get all accessible userIds for a user
const getAccessibleUserIds = async (userId) => {
  const managedAccess = await TeamAccess.getManagedUserIds(userId);
  const userIds = managedAccess.map(access => access.userId);
  
  // Add user's own userId
  const user = await User.findById(userId);
  if (user) {
    userIds.push(user.userId);
  }
  
  return userIds;
};

// Middleware to filter data based on team access
const filterByTeamAccess = () => {
  return async (req, res, next) => {
    try {
      // Get all userIds the current user can access
      const accessibleUserIds = await getAccessibleUserIds(req.user._id);
      
      // Attach to request for use in controllers
      req.accessibleUserIds = accessibleUserIds;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  checkTeamAccess,
  checkCreateAccess,
  checkModifyAccess,
  filterByTeamAccess,
  getAccessibleUserIds
};