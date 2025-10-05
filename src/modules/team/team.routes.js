const express = require('express');
const teamController = require('./team.controller');
const { protect } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Grant team access - allow someone to manage your data
router.post('/grant-access', teamController.grantAccess);

// List team members who have access to my data
router.get('/my-team', teamController.listMyTeamMembers);

// List access I have been granted to manage other users' data
router.get('/my-access', teamController.listManagedAccess);

// Update team member permissions by email
router.patch('/access/:userEmail', teamController.updatePermissionsByEmail);

// Revoke team access by email
router.delete('/access/:userEmail', teamController.revokeAccessByEmail);

// Legacy routes (keeping for backward compatibility)
// Update team member permissions (by teamAccessId) - DEPRECATED
router.patch('/access-by-id/:teamAccessId', teamController.updatePermissions);

// Revoke team access (by teamAccessId) - DEPRECATED  
router.delete('/access-by-id/:teamAccessId', teamController.revokeAccess);

// Additional convenience routes
router.patch('/update-permissions/:userEmail', teamController.updatePermissionsByEmail);
router.delete('/revoke-access/:userEmail', teamController.revokeAccessByEmail);

// Check if I have access to manage data for a specific employee (by ObjectId)
router.get('/check-access/:employeeId', teamController.checkAccess);

// Check if I have access to manage data for a specific employee (by email)
router.get('/check-access-by-email/:userEmail', teamController.checkAccessByEmail);

// Get comprehensive access report for an employee
router.get('/report/:employeeId', teamController.getAccessReport);

module.exports = router;