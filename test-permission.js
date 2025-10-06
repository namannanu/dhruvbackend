const catchAsync = require('./src/shared/utils/catchAsync');
const jwt = require('jsonwebtoken');

// Test the permission middleware logic directly
async function testPermissionCheck() {
  try {
    // Import after potential mongoose setup
    const { getUserPermissions, getBusinessIdFromRequest } = require('./src/shared/middlewares/permissionMiddleware');
    
    // Simulate the request object for GET /jobs/:jobId
    const mockReq = {
      params: {
        jobId: '670205b44e069da6e0a4ba18'  // Original job ID from your request
      },
      body: {},
      query: {},
      headers: {},
      path: '/jobs/68e2ec8aacb76ebec3d8ceb0',
      user: {
        id: '68e2aeba7df47ac55d65a0af',
        _id: '68e2aeba7df47ac55d65a0af',
        userType: 'employer',
        email: 'jjjgmail.com' // Correct email from database
      }
    };

    console.log('Testing permission check for GET /jobs/:jobId');
    console.log('User ID:', mockReq.user.id);
    console.log('Job ID:', mockReq.params.jobId);

    // Step 1: Get business ID from job
    console.log('\n--- Step 1: Getting business ID ---');
    const businessId = await getBusinessIdFromRequest(mockReq);
    console.log('Business ID extracted:', businessId);

    if (!businessId) {
      console.log('ERROR: No business ID found');
      return;
    }

    // Step 2: Get user permissions
    console.log('\n--- Step 2: Getting user permissions ---');
    const userPermissions = await getUserPermissions(mockReq.user.id, businessId);
    console.log('User permissions:', userPermissions);

    // Step 3: Check specific permission
    console.log('\n--- Step 3: Checking view_jobs permission ---');
    const hasViewJobs = userPermissions.includes('view_jobs');
    console.log('Has view_jobs permission:', hasViewJobs);

    if (!hasViewJobs) {
      console.log('PERMISSION DENIED: User does not have view_jobs permission');
    } else {
      console.log('PERMISSION GRANTED: User has view_jobs permission');
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Setup mongoose connection
const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return testPermissionCheck();
  })
  .then(() => {
    console.log('Test completed');
    return mongoose.disconnect();
  })
  .catch((error) => {
    console.error('Error:', error);
    mongoose.disconnect();
  });