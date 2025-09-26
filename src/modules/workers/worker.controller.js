const mongoose = require('mongoose');
const WorkerProfile = require('./workerProfile.model');
const WorkerEmployment = require('./workerEmployment.model');
const User = require('../users/user.model');
const Application = require('../applications/application.model');
const AttendanceRecord = require('../attendance/attendance.model');
const Shift = require('../shifts/shift.model');
const SwapRequest = require('../shifts/swapRequest.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');

// Helper function to convert legacy availability to new format
const convertLegacyAvailability = (legacyAvailability) => {
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const defaultAvailability = daysOfWeek.map(day => ({
    day,
    isAvailable: false,
    timeSlots: []
  }));

  if (!legacyAvailability || legacyAvailability.length === 0) {
    return defaultAvailability;
  }

  // Parse legacy format like "Weekdays: 9:00 AM - 5:00 PM" or "Monday: 8:00 AM - 6:00 PM"
  legacyAvailability.forEach(entry => {
    const [dayPart, timePart] = entry.split(':').map(part => part.trim());
    
    if (timePart) {
      const timeRange = timePart.trim();
      const [startTime, endTime] = timeRange.split('-').map(t => t.trim());
      
      if (startTime && endTime) {
        const convertedStart = convertTo24Hour(startTime);
        const convertedEnd = convertTo24Hour(endTime);
        
        if (convertedStart && convertedEnd) {
          const timeSlot = {
            startTime: convertedStart,
            endTime: convertedEnd
          };

          // Handle different day patterns
          if (dayPart.toLowerCase().includes('weekday')) {
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
              const dayAvailability = defaultAvailability.find(d => d.day === day);
              if (dayAvailability) {
                dayAvailability.isAvailable = true;
                dayAvailability.timeSlots.push(timeSlot);
              }
            });
          } else if (dayPart.toLowerCase().includes('weekend')) {
            ['saturday', 'sunday'].forEach(day => {
              const dayAvailability = defaultAvailability.find(d => d.day === day);
              if (dayAvailability) {
                dayAvailability.isAvailable = true;
                dayAvailability.timeSlots.push(timeSlot);
              }
            });
          } else {
            // Try to match specific day
            const day = daysOfWeek.find(d => dayPart.toLowerCase().includes(d));
            if (day) {
              const dayAvailability = defaultAvailability.find(d => d.day === day);
              if (dayAvailability) {
                dayAvailability.isAvailable = true;
                dayAvailability.timeSlots.push(timeSlot);
              }
            }
          }
        }
      }
    }
  });

  return defaultAvailability;
};

// Helper function to convert 12-hour format to 24-hour format
const convertTo24Hour = (time12h) => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier && modifier.toLowerCase() === 'pm') {
    hours = parseInt(hours, 10) + 12;
  }
  
  return `${hours.padStart(2, '0')}:${minutes || '00'}`;
};

// Helper function to format availability for display
const formatAvailabilityForDisplay = (availability) => {
  if (!availability || availability.length === 0) {
    return [];
  }

  return availability
    .filter(day => day.isAvailable && day.timeSlots && day.timeSlots.length > 0)
    .map(day => {
      const timeSlotStrings = day.timeSlots.map(slot => 
        `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`
      );
      return `${capitalize(day.day)}: ${timeSlotStrings.join(', ')}`;
    });
};

// Helper function to format time for display
const formatTime = (time24h) => {
  const [hours, minutes] = time24h.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Helper function to capitalize first letter
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

exports.getWorkerProfile = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  const user = await User.findById(workerId);
  if (!user || user.userType !== 'worker') {
    return next(new AppError('Worker not found', 404));
  }
  
  let profile = await WorkerProfile.findOne({ user: workerId });
  
  // Create profile if it doesn't exist
  if (!profile) {
    profile = await WorkerProfile.create({
      user: workerId,
      bio: '',
      skills: [],
      experience: '',
      languages: [],
      weeklyEarnings: 0,
      preferredRadiusMiles: 25,
      notificationsEnabled: true,
      isVerified: false
    });
  }

  // Handle migration from legacy availability format
  if (profile.legacyAvailability && profile.legacyAvailability.length > 0 && 
      (!profile.availability || profile.availability.length === 0)) {
    profile.availability = convertLegacyAvailability(profile.legacyAvailability);
    await profile.save();
  }

  // Ensure availability has all days of the week
  if (!profile.availability || profile.availability.length !== 7) {
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const existingDays = profile.availability ? profile.availability.map(d => d.day) : [];
    const missingDays = daysOfWeek.filter(day => !existingDays.includes(day));
    
    const newAvailability = [...(profile.availability || [])];
    missingDays.forEach(day => {
      newAvailability.push({ day, isAvailable: false, timeSlots: [] });
    });
    
    // Sort by day of week
    profile.availability = newAvailability.sort((a, b) => {
      return daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
    });
    await profile.save();
  }

  // Create enhanced profile response with computed fields
  const enhancedProfile = {
    ...profile.toObject(),
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User',
    email: user.email,
    // Add formatted availability for backwards compatibility
    formattedAvailability: formatAvailabilityForDisplay(profile.availability)
  };

  res.status(200).json({ 
    status: 'success', 
    data: { 
      user, 
      profile: enhancedProfile 
    } 
  });
});

exports.updateWorkerProfile = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  
  console.log('🔍 UpdateWorkerProfile Debug:', {
    paramsWorkerId: req.params.workerId,
    userIdFromToken: req.user._id?.toString(),
    finalWorkerId: workerId?.toString(),
    userType: req.user.userType,
    path: req.path,
    bodyKeys: Object.keys(req.body),
    bodyData: req.body
  });
  
  // For /workers/me route, workerId will be req.user._id (from token)
  // For /workers/:workerId route, check if user can update that specific worker
  if (req.params.workerId && req.user._id.toString() !== req.params.workerId.toString()) {
    return next(new AppError('You can only update your own profile', 403));
  }
  
  // Ensure user is a worker
  if (req.user.userType !== 'worker') {
    return next(new AppError('Only workers can update worker profiles', 403));
  }

  // Handle user fields - allow updating name by splitting it
  const allowedUserFields = ['firstName', 'lastName', 'phone'];
  
  // If 'name' is provided, split it into firstName and lastName
  if (req.body.name) {
    const nameParts = req.body.name.trim().split(/\s+/);
    req.body.firstName = nameParts[0] || '';
    req.body.lastName = nameParts.slice(1).join(' ') || '';
  }

  allowedUserFields.forEach((field) => {
    if (field in req.body) {
      req.user[field] = req.body[field];
    }
  });
  await req.user.save();

  // Handle profile fields
  const profileFields = [
    'bio', 'skills', 'experience', 'languages', 'availability',
    'preferredRadiusMiles', 'notificationsEnabled'
  ];
  
  const updateData = {};
  profileFields.forEach((field) => {
    if (field in req.body) {
      if (field === 'availability') {
        // Validate availability structure
        const availability = req.body[field];
        if (Array.isArray(availability)) {
          // Validate each day's availability
          const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const validatedAvailability = [];

          availability.forEach(dayAvailability => {
            if (dayAvailability.day && validDays.includes(dayAvailability.day.toLowerCase())) {
              const dayData = {
                day: dayAvailability.day.toLowerCase(),
                isAvailable: Boolean(dayAvailability.isAvailable),
                timeSlots: []
              };

              // Validate time slots
              if (dayAvailability.timeSlots && Array.isArray(dayAvailability.timeSlots)) {
                dayAvailability.timeSlots.forEach(slot => {
                  if (slot.startTime && slot.endTime) {
                    // Validate time format (HH:MM)
                    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                    if (timeRegex.test(slot.startTime) && timeRegex.test(slot.endTime)) {
                      dayData.timeSlots.push({
                        startTime: slot.startTime,
                        endTime: slot.endTime
                      });
                    }
                  }
                });
              }

              validatedAvailability.push(dayData);
            }
          });

          updateData[field] = validatedAvailability;
        }
      } else {
        updateData[field] = req.body[field];
      }
    }
  });

  const profile = await WorkerProfile.findOneAndUpdate(
    { user: workerId },
    updateData,
    { new: true, upsert: true }
  );

  // Create enhanced profile response with computed fields
  const enhancedProfile = {
    ...profile.toObject(),
    name: [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'User',
    email: req.user.email,
    formattedAvailability: formatAvailabilityForDisplay(profile.availability)
  };

  res.status(200).json({ 
    status: 'success', 
    data: { 
      user: req.user, 
      profile: enhancedProfile 
    } 
  });
});

exports.getWorkerApplications = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own applications', 403));
  }
  const applications = await Application.find({ worker: workerId })
    .populate({ path: 'job', populate: { path: 'business' } })
    .sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', results: applications.length, data: applications });
});

exports.getWorkerAttendance = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own attendance', 403));
  }
  const filter = { worker: workerId };
  if (req.query.date) {
    const targetDate = new Date(req.query.date);
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));
    filter.scheduledStart = { $gte: start, $lte: end };
  }
  const records = await AttendanceRecord.find(filter).sort({ scheduledStart: -1 });
  res.status(200).json({ status: 'success', results: records.length, data: records });
});

exports.getWorkerShifts = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own shifts', 403));
  }
  const shifts = await Shift.find({ worker: workerId }).sort({ scheduledStart: 1 });
  const swapRequests = await SwapRequest.find({
    $or: [{ fromWorker: workerId }, { toWorker: workerId }]
  })
    .populate('shift')
    .sort({ createdAt: -1 });

  res.status(200).json({ status: 'success', data: { shifts, swapRequests } });
});

exports.getWorkerDashboardMetrics = catchAsync(async (req, res, next) => {
  const workerId = req.params.workerId || req.user._id;
  
  // Authorization check
  if (req.user.userType === 'worker' && req.user._id.toString() !== workerId.toString()) {
    return next(new AppError('You can only view your own dashboard metrics', 403));
  }

  // Get user and profile data
  const user = await User.findById(workerId);
  if (!user || user.userType !== 'worker') {
    return next(new AppError('Worker not found', 404));
  }

  const profile = await WorkerProfile.findOne({ user: workerId });
  if (!profile) {
    return next(new AppError('Worker profile not found', 404));
  }

  // Calculate date ranges
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Get aggregated data
  const [
    totalApplications,
    weeklyApplications,
    monthlyApplications,
    totalShifts,
    weeklyShifts,
    monthlyShifts,
    totalAttendance,
    weeklyAttendance,
    monthlyAttendance
  ] = await Promise.all([
    // Applications
    Application.countDocuments({ worker: workerId }),
    Application.countDocuments({ 
      worker: workerId, 
      createdAt: { $gte: startOfWeek } 
    }),
    Application.countDocuments({ 
      worker: workerId, 
      createdAt: { $gte: startOfMonth } 
    }),
    
    // Shifts
    Shift.countDocuments({ worker: workerId }),
    Shift.countDocuments({ 
      worker: workerId, 
      scheduledStart: { $gte: startOfWeek } 
    }),
    Shift.countDocuments({ 
      worker: workerId, 
      scheduledStart: { $gte: startOfMonth } 
    }),

    // Attendance
    AttendanceRecord.countDocuments({ worker: workerId }),
    AttendanceRecord.countDocuments({ 
      worker: workerId, 
      scheduledStart: { $gte: startOfWeek } 
    }),
    AttendanceRecord.countDocuments({ 
      worker: workerId, 
      scheduledStart: { $gte: startOfMonth } 
    })
  ]);

  // Calculate attendance rate
  const attendanceRate = totalShifts > 0 ? (totalAttendance / totalShifts) * 100 : 0;
  const weeklyAttendanceRate = weeklyShifts > 0 ? (weeklyAttendance / weeklyShifts) * 100 : 0;

  // Get recent applications status breakdown
  const applicationStats = await Application.aggregate([
    { $match: { worker: new mongoose.Types.ObjectId(workerId) } },
    { 
      $group: { 
        _id: '$status', 
        count: { $sum: 1 } 
      } 
    }
  ]);

  const applicationStatusCounts = applicationStats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});

  // Calculate profile completeness
  let profileCompleteness = 0;
  const profileFields = [
    { field: 'bio', weight: 20 },
    { field: 'skills', weight: 20, isArray: true },
    { field: 'experience', weight: 15 },
    { field: 'languages', weight: 10, isArray: true },
    { field: 'availability', weight: 25, isArray: true },
    { field: 'phone', weight: 10, userField: true }
  ];

  profileFields.forEach(fieldConfig => {
    const value = fieldConfig.userField ? user[fieldConfig.field] : profile[fieldConfig.field];
    if (fieldConfig.isArray) {
      if (Array.isArray(value) && value.length > 0) {
        profileCompleteness += fieldConfig.weight;
      }
    } else {
      if (value && value.toString().trim().length > 0) {
        profileCompleteness += fieldConfig.weight;
      }
    }
  });

  // Free tier and premium data
  const freeTierData = {
    jobApplicationsUsed: user.freeApplicationsUsed || 0,
    jobApplicationsLimit: 5, // Default free tier limit
    remainingApplications: Math.max(0, 5 - (user.freeApplicationsUsed || 0))
  };

  const premiumData = {
    isActive: user.premium || false,
    features: user.premium ? [
      'Unlimited job applications',
      'Priority in search results',
      'Advanced analytics',
      'Direct messaging with employers'
    ] : [],
    benefits: user.premium ? {
      unlimitedApplications: true,
      priorityPlacement: true,
      advancedAnalytics: true,
      directMessaging: true
    } : {}
  };

  // Build metrics response
  const metrics = {
    // Profile metrics
    profile: {
      completeness: Math.round(profileCompleteness),
      rating: profile.rating || 0,
      totalEarnings: profile.totalEarnings || 0,
      weeklyEarnings: profile.weeklyEarnings || 0,
      completedJobs: profile.completedJobs || 0,
      isVerified: profile.isVerified || false,
      joinedDate: user.createdAt,
      lastActive: user.lastActiveAt || user.lastLoginAt
    },

    // Activity counts
    counts: {
      totalApplications,
      weeklyApplications,
      monthlyApplications,
      totalShifts,
      weeklyShifts,
      monthlyShifts,
      totalAttendance,
      weeklyAttendance,
      monthlyAttendance
    },

    // Application status breakdown
    applications: {
      total: totalApplications,
      byStatus: {
        pending: applicationStatusCounts.pending || 0,
        accepted: applicationStatusCounts.accepted || 0,
        rejected: applicationStatusCounts.rejected || 0,
        withdrawn: applicationStatusCounts.withdrawn || 0
      },
      successRate: totalApplications > 0 ? 
        Math.round(((applicationStatusCounts.accepted || 0) / totalApplications) * 100) : 0
    },

    // Performance metrics
    performance: {
      attendanceRate: Math.round(attendanceRate),
      weeklyAttendanceRate: Math.round(weeklyAttendanceRate),
      reliability: profile.rating >= 4 ? 'High' : profile.rating >= 3 ? 'Medium' : 'Low'
    },

    // Availability metrics
    availability: {
      totalDaysAvailable: profile.availability ? 
        profile.availability.filter(day => day.isAvailable).length : 0,
      hasFlexibleHours: profile.availability ? 
        profile.availability.some(day => day.timeSlots && day.timeSlots.length > 1) : false,
      preferredRadius: profile.preferredRadiusMiles || 25
    },

    // Free tier information
    freeTier: freeTierData,

    // Premium information
    premium: premiumData,

    // Notifications
    notifications: {
      enabled: profile.notificationsEnabled !== false
    }
  };

  res.status(200).json({ 
    status: 'success', 
    data: {
      metrics,
      // Include query parameter for compatibility
      include: req.query.include || 'freeTier,premium,counts'
    }
  });
});

// Get worker's employment history
exports.getMyEmploymentHistory = catchAsync(async (req, res, next) => {
  const employmentHistory = await WorkerEmployment.getWorkerHistory(req.user._id);

  res.status(200).json({
    status: 'success',
    results: employmentHistory.length,
    data: employmentHistory
  });
});

// Get worker's scheduled dates based on employment history
exports.getMyScheduledDates = catchAsync(async (req, res, next) => {
  const { startDate, endDate, employmentId } = req.query;
  
  // Build filter for employment records
  const employmentFilter = { worker: req.user._id };
  if (employmentId) {
    employmentFilter._id = employmentId;
  }

  // Get employment records
  const employmentRecords = await WorkerEmployment.find(employmentFilter)
    .populate('job', 'title startDate endDate workDays workingHours');

  // Extract scheduled dates from employment records
  const scheduledDates = [];
  
  employmentRecords.forEach(employment => {
    if (employment.job) {
      const schedule = {
        employmentId: employment._id,
        employer: employment.employer,
        business: employment.business,
        position: employment.position,
        hireDate: employment.hireDate,
        jobStartDate: employment.job.startDate,
        jobEndDate: employment.job.endDate,
        workDays: employment.job.workDays,
        workingHours: employment.job.workingHours,
        hourlyRate: employment.hourlyRate
      };

      // Filter by date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (employment.job.startDate <= end && 
            (!employment.job.endDate || employment.job.endDate >= start)) {
          scheduledDates.push(schedule);
        }
      } else {
        scheduledDates.push(schedule);
      }
    }
  });

  res.status(200).json({
    status: 'success',
    results: scheduledDates.length,
    data: scheduledDates
  });
});

// Get current employment status
exports.getCurrentEmployment = catchAsync(async (req, res, next) => {
  const currentEmployment = await WorkerEmployment.findOne({
    worker: req.user._id,
    employmentStatus: 'active'
  })
    .populate('employer', 'firstName lastName email phone')
    .populate('business', 'name address contactInfo')
    .populate('job', 'title description hourlyRate workDays workingHours');

  if (!currentEmployment) {
    return res.status(200).json({
      status: 'success',
      data: null,
      message: 'No active employment found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: currentEmployment
  });
});

// End current employment (for workers to quit)
exports.endMyEmployment = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const currentEmployment = await WorkerEmployment.findOne({
    worker: req.user._id,
    employmentStatus: 'active'
  });

  if (!currentEmployment) {
    return next(new AppError('No active employment found', 404));
  }

  // End the employment
  await currentEmployment.endEmployment(reason || 'Worker resignation');

  res.status(200).json({
    status: 'success',
    message: 'Employment ended successfully',
    data: currentEmployment
  });
});
