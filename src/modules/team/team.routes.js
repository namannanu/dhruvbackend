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

// Update team member permissions
router.patch('/access/:teamAccessId', teamController.updatePermissions);

// Revoke team access
router.delete('/access/:teamAccessId', teamController.revokeAccess);

// Check if I have access to manage data for a specific userId
router.get('/check-access/:managedUserId', teamController.checkAccess);

// Get comprehensive access report for a userId
router.get('/report/:managedUserId', teamController.getAccessReport);

module.exports = router;