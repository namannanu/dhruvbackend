const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

const User = require('./src/modules/users/user.model');
const Business = require('./src/modules/businesses/business.model');
const Job = require('./src/modules/jobs/job.model');
const TeamAccess = require('./src/modules/team/teamAccess.model');
const { getUserPermissions, getBusinessIdFromRequest } = require('./src/shared/middlewares/permissionMiddleware');

async function debugViewJobsPermission() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const jobId = '670205b44e069da6e0a4ba18';
    const userId = '68e2aeba7df47ac55d65a0af';

    // First, get the job and business ID
    const job = await Job.findById(jobId).select('business');
    console.log('Job found:', !!job);
    console.log('Job business ID:', job?.business?.toString());

    if (!job) {
      console.log('Job not found');
      return;
    }

    const businessId = job.business.toString();

    // Get user details
    const user = await User.findById(userId);
    console.log('User found:', !!user);
    console.log('User email:', user?.email);

    // Check TeamAccess record
    const teamAccess = await TeamAccess.findOne({
      userEmail: user.email.toLowerCase(),
      status: 'active'
    });

    console.log('TeamAccess found:', !!teamAccess);
    if (teamAccess) {
      console.log('TeamAccess details:');
      console.log('- Access scope:', teamAccess.accessScope);
      console.log('- Access level:', teamAccess.accessLevel);
      console.log('- Business context:', teamAccess.businessContext);
      console.log('- Permissions:', teamAccess.permissions);
      console.log('- canViewJobs:', teamAccess.permissions?.canViewJobs);
      console.log('- isAccessValid:', teamAccess.isAccessValid);
    }

    // Get user permissions for this business
    const permissions = await getUserPermissions(userId, businessId);
    console.log('User permissions for business:', permissions);
    console.log('Has view_jobs permission:', permissions.includes('view_jobs'));

    // Check if business belongs to the user that TeamAccess manages
    const business = await Business.findById(businessId);
    console.log('Business found:', !!business);
    console.log('Business owner:', business?.owner?.toString());
    console.log('TeamAccess original user:', teamAccess?.originalUser?.toString());
    console.log('Does business belong to managed user?:', 
      business?.owner?.toString() === teamAccess?.originalUser?.toString());

  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugViewJobsPermission();