/**
 * Example of how to use permission middleware in routes
 * This shows how to protect API endpoints with the permission system
 */

const express = require('express');
const router = express.Router();
const { requirePermissions, autoCheckPermissions } = require('../../shared/middlewares/permissionMiddleware');
const authMiddleware = require('../../shared/middlewares/authMiddleware');

// Example: Protect job creation with specific permission
router.post('/jobs',
  authMiddleware.protect, // Authenticate user first
  requirePermissions('create_jobs'), // Require specific permission
  async (req, res, next) => {
    try {
      // Job creation logic here
      // User is guaranteed to have 'create_jobs' permission
      res.status(201).json({
        status: 'success',
        message: 'Job created successfully',
        data: { /* job data */ }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Example: Protect endpoint that requires multiple permissions (any one)
router.post('/applications/process',
  authMiddleware.protect,
  requirePermissions(['approve_applications', 'reject_applications']), // User needs ANY of these
  async (req, res, next) => {
    try {
      // Application processing logic here
      res.status(200).json({
        status: 'success',
        message: 'Application processed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Example: Protect endpoint that requires ALL specified permissions
router.post('/sensitive-operation',
  authMiddleware.protect,
  requirePermissions(['manage_payments', 'view_financial_reports'], { requireAll: true }),
  async (req, res, next) => {
    try {
      // Sensitive operation that requires both permissions
      res.status(200).json({
        status: 'success',
        message: 'Sensitive operation completed'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Example: Use auto-permission checking (automatically maps endpoint to permissions)
router.use('/auto-protected', authMiddleware.protect, autoCheckPermissions());

router.get('/auto-protected/businesses/analytics', async (req, res, next) => {
  try {
    // This will automatically require 'view_business_analytics' permission
    // based on the ENDPOINT_PERMISSIONS mapping
    res.status(200).json({
      status: 'success',
      data: { /* analytics data */ }
    });
  } catch (error) {
    next(error);
  }
});

// Example: Team management routes with various permission requirements
router.post('/team/invite',
  authMiddleware.protect,
  requirePermissions('invite_team_members'),
  async (req, res, next) => {
    try {
      const { email, role, permissions } = req.body;
      
      // Validate that the user can assign the permissions they're trying to give
      if (permissions && permissions.length > 0) {
        const hasManagePermissions = req.userPermissions.includes('manage_permissions');
        if (!hasManagePermissions) {
          return res.status(403).json({
            status: 'error',
            message: 'You do not have permission to assign permissions to team members'
          });
        }
      }
      
      // Team invitation logic here
      res.status(201).json({
        status: 'success',
        message: 'Team member invited successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put('/team/:memberId',
  authMiddleware.protect,
  requirePermissions('edit_team_members'),
  async (req, res, next) => {
    try {
      // Team member editing logic here
      res.status(200).json({
        status: 'success',
        message: 'Team member updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/team/:memberId',
  authMiddleware.protect,
  requirePermissions('remove_team_members'),
  async (req, res, next) => {
    try {
      // Team member removal logic here
      res.status(200).json({
        status: 'success',
        message: 'Team member removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Example: Attendance management with different permission levels
router.get('/attendance',
  authMiddleware.protect,
  requirePermissions('view_attendance'),
  async (req, res, next) => {
    try {
      // Can view attendance records
      res.status(200).json({
        status: 'success',
        data: { /* attendance data */ }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put('/attendance/:recordId',
  authMiddleware.protect,
  requirePermissions('manage_attendance'),
  async (req, res, next) => {
    try {
      // Can edit attendance records
      res.status(200).json({
        status: 'success',
        message: 'Attendance record updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/attendance/:recordId/approve',
  authMiddleware.protect,
  requirePermissions('approve_attendance'),
  async (req, res, next) => {
    try {
      // Can approve attendance records
      res.status(200).json({
        status: 'success',
        message: 'Attendance record approved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Example: Route that checks permissions dynamically in the controller
router.post('/dynamic-permission-check',
  authMiddleware.protect,
  async (req, res, next) => {
    try {
      const { action } = req.body;
      
      // Check different permissions based on the action
      let requiredPermission;
      switch (action) {
        case 'create_job':
          requiredPermission = 'create_jobs';
          break;
        case 'edit_job':
          requiredPermission = 'edit_jobs';
          break;
        case 'delete_job':
          requiredPermission = 'delete_jobs';
          break;
        default:
          return res.status(400).json({
            status: 'error',
            message: 'Invalid action'
          });
      }
      
      // Get user permissions (assuming we have middleware that adds this)
      const hasPermission = req.userPermissions?.includes(requiredPermission);
      
      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          message: `Insufficient permissions. Required: ${requiredPermission}`
        });
      }
      
      // Perform the action
      res.status(200).json({
        status: 'success',
        message: `${action} completed successfully`
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;