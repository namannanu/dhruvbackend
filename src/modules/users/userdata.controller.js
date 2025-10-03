const User = require('./user.model');
const Job = require('../jobs/job.model');
const Application = require('../applications/application.model');
const AttendanceRecord = require('../attendance/attendance.model');
const WorkerEmployment = require('../workers/workerEmployment.model');
const WorkerProfile = require('../workers/workerProfile.model');
const EmployerProfile = require('../employers/employerProfile.model');
const TeamAccess = require('../team/teamAccess.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

// Get all user data by userId - comprehensive data fetch (with team access support)
exports.getAllUserDataByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { 
    includeJobs = 'true', 
    includeApplications = 'true', 
    includeAttendance = 'true', 
    includeEmployment = 'true',
    startDate,
    endDate 
  } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'UserId parameter is required'
    });
  }

  // Find user by userId
  const user = await User.findOne({ userId }).select('_id firstName lastName email userType phone premium');
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found with the provided userId'
    });
  }

  // Check access permissions if this is an authenticated request
  let accessInfo = { hasAccess: true, isOwner: true, role: 'public' };
  
  if (req.user) {
    // This is an authenticated request, check team access
    if (req.user.userId !== userId) {
      const accessCheck = await TeamAccess.checkAccess(req.user._id, userId, 'canViewJobs');
      if (!accessCheck.hasAccess) {
        return res.status(403).json({
          status: 'error',
          message: accessCheck.reason || 'Access denied to this user data'
        });
      }
      accessInfo = {
        hasAccess: true,
        isOwner: false,
        role: accessCheck.role,
        permissions: accessCheck.permissions
      };
    }
  }

  const userData = {
    user: {
      userId: user.userId,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      userType: user.userType,
      phone: user.phone,
      premium: user.premium
    },
    accessInfo: accessInfo
  };

  // Get user profile
  if (user.userType === 'worker') {
    const workerProfile = await WorkerProfile.findOne({ user: user._id })
      .select('bio skills experience rating completedJobs totalEarnings');
    userData.profile = workerProfile;
  } else if (user.userType === 'employer') {
    const employerProfile = await EmployerProfile.findOne({ user: user._id })
      .select('companyName description rating totalJobsPosted totalHires');
    userData.profile = employerProfile;
  }

  // Build date filter for time-based queries
  const dateFilter = {};
  if (startDate || endDate) {
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      dateFilter.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
  }

  // Get Jobs data (with permission check)
  if (includeJobs === 'true' && (!req.user || accessInfo.isOwner || accessInfo.permissions?.canViewJobs)) {
    const jobFilter = {
      $or: [
        { employer: user._id },
        { hiredWorker: user._id }
      ]
    };
    
    if (Object.keys(dateFilter).length > 0) {
      jobFilter.createdAt = dateFilter;
    }

    const jobs = await Job.find(jobFilter)
      .populate('employer', 'userId firstName lastName email')
      .populate('hiredWorker', 'userId firstName lastName email')
      .populate('business', 'name address')
      .sort({ createdAt: -1 });

    userData.jobs = {
      postedJobs: jobs.filter(job => job.employer._id.toString() === user._id.toString()),
      hiredJobs: jobs.filter(job => job.hiredWorker && job.hiredWorker._id.toString() === user._id.toString()),
      total: jobs.length
    };
  }

  // Get Applications data (with permission check)
  if (includeApplications === 'true' && (!req.user || accessInfo.isOwner || accessInfo.permissions?.canViewApplications)) {
    // Worker applications
    const workerApplicationFilter = { worker: user._id };
    if (Object.keys(dateFilter).length > 0) {
      workerApplicationFilter.createdAt = dateFilter;
    }

    const workerApplications = await Application.find(workerApplicationFilter)
      .populate({
        path: 'job',
        select: 'title description hourlyRate status location',
        populate: {
          path: 'employer',
          select: 'userId firstName lastName email'
        }
      })
      .sort({ createdAt: -1 });

    // Applications to user's jobs (if employer)
    const employerApplicationFilter = {};
    if (Object.keys(dateFilter).length > 0) {
      employerApplicationFilter.createdAt = dateFilter;
    }

    const employerApplications = await Application.find(employerApplicationFilter)
      .populate({
        path: 'worker',
        select: 'userId firstName lastName email phone'
      })
      .populate({
        path: 'job',
        match: { employer: user._id },
        select: 'title description hourlyRate status'
      })
      .then(apps => apps.filter(app => app.job !== null))
      .sort({ createdAt: -1 });

    userData.applications = {
      workerApplications,
      employerApplications,
      total: workerApplications.length + employerApplications.length
    };
  }

  // Get Attendance data (with permission check)
  if (includeAttendance === 'true' && (!req.user || accessInfo.isOwner || accessInfo.permissions?.canViewAttendance)) {
    const attendanceFilter = {
      $or: [
        { worker: user._id },
        { employer: user._id }
      ]
    };

    if (Object.keys(dateFilter).length > 0) {
      attendanceFilter.scheduledStart = dateFilter;
    }

    const attendanceRecords = await AttendanceRecord.find(attendanceFilter)
      .populate('worker', 'userId firstName lastName email')
      .populate('employer', 'userId firstName lastName email')
      .populate('job', 'title description hourlyRate')
      .populate('business', 'name address')
      .sort({ scheduledStart: -1 });

    const workerAttendance = attendanceRecords.filter(record => 
      record.worker._id.toString() === user._id.toString()
    );
    
    const employerAttendance = attendanceRecords.filter(record => 
      record.employer && record.employer._id.toString() === user._id.toString()
    );

    userData.attendance = {
      workerAttendance,
      employerAttendance,
      total: attendanceRecords.length,
      stats: {
        workerStats: {
          totalHours: workerAttendance.reduce((sum, record) => sum + (record.totalHours || 0), 0),
          totalEarnings: workerAttendance.reduce((sum, record) => sum + (record.earnings || 0), 0),
          completedShifts: workerAttendance.filter(record => record.status === 'completed').length,
          missedShifts: workerAttendance.filter(record => record.status === 'missed').length
        },
        employerStats: {
          totalShiftsManaged: employerAttendance.length,
          completedShifts: employerAttendance.filter(record => record.status === 'completed').length,
          totalPayouts: employerAttendance.reduce((sum, record) => sum + (record.earnings || 0), 0)
        }
      }
    };
  }

  // Get Employment data (with permission check)
  if (includeEmployment === 'true' && (!req.user || accessInfo.isOwner || accessInfo.permissions?.canViewEmployment)) {
    const employmentFilter = {
      $or: [
        { worker: user._id },
        { employer: user._id }
      ]
    };

    if (Object.keys(dateFilter).length > 0) {
      employmentFilter.hireDate = dateFilter;
    }

    const employmentRecords = await WorkerEmployment.find(employmentFilter)
      .populate('worker', 'userId firstName lastName email')
      .populate('employer', 'userId firstName lastName email')
      .populate('business', 'name address')
      .populate('job', 'title description hourlyRate')
      .sort({ hireDate: -1 });

    const workerEmployment = employmentRecords.filter(record => 
      record.worker._id.toString() === user._id.toString()
    );
    
    const employerEmployment = employmentRecords.filter(record => 
      record.employer._id.toString() === user._id.toString()
    );

    userData.employment = {
      workerEmployment,
      employerEmployment,
      total: employmentRecords.length,
      stats: {
        activeEmployments: employmentRecords.filter(record => record.employmentStatus === 'active').length,
        totalEarnings: workerEmployment.reduce((sum, record) => sum + (record.totalEarnings || 0), 0),
        totalHires: employerEmployment.length
      }
    };
  }

  // Summary statistics
  userData.summary = {
    totalJobs: userData.jobs?.total || 0,
    totalApplications: userData.applications?.total || 0,
    totalAttendanceRecords: userData.attendance?.total || 0,
    totalEmploymentRecords: userData.employment?.total || 0,
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null
    },
    includedModules: {
      jobs: includeJobs === 'true',
      applications: includeApplications === 'true',
      attendance: includeAttendance === 'true',
      employment: includeEmployment === 'true'
    }
  };

  res.status(200).json({
    status: 'success',
    data: userData
  });
});

// Get user basic info by userId
exports.getUserByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'UserId parameter is required'
    });
  }

  const user = await User.findOne({ userId }).select('userId firstName lastName email userType phone premium');
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found with the provided userId'
    });
  }

  // Get user profile
  let profile = null;
  if (user.userType === 'worker') {
    profile = await WorkerProfile.findOne({ user: user._id })
      .select('bio skills experience rating completedJobs totalEarnings');
  } else if (user.userType === 'employer') {
    profile = await EmployerProfile.findOne({ user: user._id })
      .select('companyName description rating totalJobsPosted totalHires');
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        userId: user.userId,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType,
        phone: user.phone,
        premium: user.premium
      },
      profile
    }
  });
});