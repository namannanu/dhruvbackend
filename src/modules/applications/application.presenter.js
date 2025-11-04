const { resolveLocationLabel, buildLocationAddressString } = require('../../shared/utils/location');
const { minimizeForContext, minimizeProfileImages } = require('../../shared/utils/logoUrlMinimizer');

const toPlain = (value) => {
  if (!value) return null;
  if (typeof value.toObject === 'function') {
    return value.toObject({ virtuals: true });
  }
  return value;
};

const toStringId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (value.toHexString) return value.toHexString();
  if (value._id) return toStringId(value._id);
  if (value.id) return value.id;
  if (typeof value === 'number') return value.toString();
  return null;
};

const formatDateString = (value) => {
  if (!value) return null;
  const candidate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate.toISOString();
};

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const rounded = Math.round(numeric * 100) / 100;
  return `$${rounded.toFixed(rounded % 1 === 0 ? 0 : 2)}/hr`;
};

const formatWorkDays = (workDays) => {
  if (!Array.isArray(workDays) || !workDays.length) {
    return null;
  }
  return workDays.join(', ');
};

const formatTags = (tags) => {
  if (!Array.isArray(tags) || !tags.length) {
    return null;
  }
  return tags.join(', ');
};

const normalizeBooleanLabel = (value) => (value ? 'Yes' : 'No');

const resolveCompanyLogos = (business) => {
  if (!business) {
    return {
      base: null,
      small: null,
      large: null
    };
  }
  const { logoSmall, logoMedium, logo, logoUrl } = business;
  const base = logoSmall || logoMedium || logo || logoUrl || null;

  const small =
    logoSmall ||
    (logo ? minimizeForContext(logo, 'company-logo-small') : null) ||
    (logoMedium ? minimizeForContext(logoMedium, 'company-logo-small') : null) ||
    (logoUrl ? minimizeForContext(logoUrl, 'company-logo-small') : null);

  const large =
    logoMedium ||
    logo ||
    (logoSmall ? minimizeForContext(logoSmall, 'company-logo-large') : null) ||
    (logoUrl ? minimizeForContext(logoUrl, 'company-logo-large') : null);

  return {
    base,
    small: small || base,
    large: large || base
  };
};

const resolveJobLocationLabel = (job, business) => {
  const jobLocation = job?.location;
  const businessLocation = business?.location;
  return (
    resolveLocationLabel(jobLocation) ||
    buildLocationAddressString(jobLocation) ||
    resolveLocationLabel(businessLocation) ||
    buildLocationAddressString(businessLocation) ||
    null
  );
};

const buildJobDetailItems = (application, job, business) => {
  if (!job && !business) {
    return [];
  }

  const items = [];

  if (job?.title) {
    items.push({ key: 'jobTitle', label: 'Job Title', value: job.title });
  }
  if (business?.name) {
    items.push({ key: 'company', label: 'Company', value: business.name });
  }

  const locationLabel = resolveJobLocationLabel(job, business);
  if (locationLabel) {
    items.push({ key: 'location', label: 'Location', value: locationLabel });
  }

  if (job?.description) {
    items.push({ key: 'description', label: 'Description', value: job.description });
  }

  const hourly = formatCurrency(job?.hourlyRate);
  if (hourly) {
    items.push({ key: 'hourlyRate', label: 'Hourly Rate', value: hourly });
  }

  const tags = formatTags(job?.tags);
  if (tags) {
    items.push({ key: 'tags', label: 'Tags', value: tags });
  }

  if (job?.urgency) {
    items.push({ key: 'urgency', label: 'Urgency', value: job.urgency });
  }

  const schedule = job?.schedule || {};
  const scheduleStart = formatDateString(schedule.startDate);
  const scheduleEnd = formatDateString(schedule.endDate);
  const workDays = formatWorkDays(schedule.workDays);
  const times = [schedule.startTime, schedule.endTime].filter(Boolean).join(' - ');

  if (scheduleStart) {
    items.push({ key: 'scheduleStart', label: 'Start Date', value: scheduleStart });
  }
  if (scheduleEnd) {
    items.push({ key: 'scheduleEnd', label: 'End Date', value: scheduleEnd });
  }
  if (times) {
    items.push({ key: 'scheduleTime', label: 'Shift Time', value: times });
  }
  if (workDays) {
    items.push({ key: 'workDays', label: 'Work Days', value: workDays });
  }

  if (job?.overtime && typeof job.overtime.allowed === 'boolean') {
    const overtimeLabel = job.overtime.allowed
      ? `Allowed${job.overtime.rateMultiplier ? ` (x${job.overtime.rateMultiplier})` : ''}`
      : 'Not allowed';
    items.push({ key: 'overtime', label: 'Overtime', value: overtimeLabel });
  }

  if (typeof job?.verificationRequired === 'boolean') {
    items.push({
      key: 'verificationRequired',
      label: 'Verification Required',
      value: normalizeBooleanLabel(job.verificationRequired)
    });
  }

  if (typeof job?.premiumRequired === 'boolean') {
    items.push({
      key: 'premiumRequired',
      label: 'Premium Required',
      value: normalizeBooleanLabel(job.premiumRequired)
    });
  }

  if (typeof job?.applicantsCount === 'number') {
    items.push({
      key: 'applicantsCount',
      label: 'Applicants Count',
      value: job.applicantsCount
    });
  }

  if (application?.message) {
    items.push({
      key: 'applicationMessage',
      label: 'Application Message',
      value: application.message
    });
  }

  return items;
};

const buildApplicantDetailItems = (application, worker, workerProfile) => {
  if (!worker && !workerProfile) {
    return [];
  }

  const items = [];
  const fullName =
    worker?.fullName ||
    [worker?.firstName, worker?.lastName].filter(Boolean).join(' ') ||
    application?.snapshot?.name ||
    null;

  if (fullName) {
    items.push({ key: 'applicantName', label: 'Applicant', value: fullName });
  }

  const email = worker?.email || application?.snapshot?.email;
  if (email) {
    items.push({ key: 'applicantEmail', label: 'Email', value: email });
  }

  const phone = worker?.phone || application?.snapshot?.phone;
  if (phone) {
    items.push({ key: 'applicantPhone', label: 'Phone', value: phone });
  }

  if (Array.isArray(workerProfile?.skills) && workerProfile.skills.length) {
    items.push({
      key: 'applicantSkills',
      label: 'Skills',
      value: workerProfile.skills.join(', ')
    });
  } else if (Array.isArray(application?.snapshot?.skills) && application.snapshot.skills.length) {
    items.push({
      key: 'applicantSkills',
      label: 'Skills',
      value: application.snapshot.skills.join(', ')
    });
  }

  if (workerProfile?.experience || application?.snapshot?.experience) {
    items.push({
      key: 'applicantExperience',
      label: 'Experience',
      value: workerProfile?.experience || application.snapshot.experience
    });
  }

  if (Array.isArray(workerProfile?.languages) && workerProfile.languages.length) {
    items.push({
      key: 'applicantLanguages',
      label: 'Languages',
      value: workerProfile.languages.join(', ')
    });
  }

  if (workerProfile?.rating != null) {
    items.push({
      key: 'applicantRating',
      label: 'Rating',
      value: workerProfile.rating
    });
  }

  if (workerProfile?.completedJobs != null) {
    items.push({
      key: 'completedJobs',
      label: 'Completed Jobs',
      value: workerProfile.completedJobs
    });
  }

  if (workerProfile?.availability && workerProfile.availability.length) {
    items.push({
      key: 'availability',
      label: 'Availability',
      value: workerProfile.availability.join(', ')
    });
  }

  return items;
};

const buildApplicationPresenter = (applicationDoc, options = {}) => {
  const {
    workerProfile: rawWorkerProfile = null,
    includeApplicantDetails = true
  } = options;

  const application = toPlain(applicationDoc);
  const job = toPlain(application?.job);
  const worker = includeApplicantDetails ? toPlain(application?.worker) : null;
  const business = job ? toPlain(job.business) : null;

  const workerProfile = includeApplicantDetails
    ? minimizeProfileImages(rawWorkerProfile, 'worker')
    : null;

  const jobItems = buildJobDetailItems(application, job, business);
  const applicantItems = includeApplicantDetails
    ? buildApplicantDetailItems(application, worker, workerProfile)
    : [];

  const detailItems = [...jobItems, ...applicantItems];
  const detailText = detailItems.map((item) => `${item.label}: ${item.value}`).join('\n');

  const logos = resolveCompanyLogos(business);

  const response = {
    id: toStringId(application?._id),
    status: application?.status || 'pending',
    message: application?.message || '',
    createdAt: application?.createdAt || null,
    updatedAt: application?.updatedAt || null,
    hiredAt: application?.hiredAt || null,
    rejectedAt: application?.rejectedAt || null,
    withdrawnAt: application?.withdrawnAt || null,
    jobId: toStringId(job?._id),
    workerId: toStringId(application?.worker),
    detailItems,
    detailText,
    companyLogo: logos.base,
    companyLogoSmall: logos.small,
    companyLogoLarge: logos.large,
    job: job
      ? {
          id: toStringId(job._id),
          title: job.title,
          description: job.description,
          hourlyRate: job.hourlyRate,
          urgency: job.urgency,
          tags: job.tags,
          schedule: job.schedule,
          location: job.location,
          overtime: job.overtime,
          verificationRequired: job.verificationRequired,
          premiumRequired: job.premiumRequired,
          applicantsCount: job.applicantsCount,
          business: business
            ? {
                id: toStringId(business._id),
                name: business.name,
                description: business.description,
                location: business.location,
                logo: business.logo,
                logoSmall: business.logoSmall,
                logoMedium: business.logoMedium,
                logoUrl: business.logoUrl
              }
            : null
        }
      : null,
    snapshot: application?.snapshot || null
  };

  if (includeApplicantDetails && worker) {
    response.worker = {
      id: toStringId(worker._id),
      firstName: worker.firstName,
      lastName: worker.lastName,
      fullName:
        worker.fullName || [worker.firstName, worker.lastName].filter(Boolean).join(' ') || null,
      email: worker.email,
      phone: worker.phone,
      userType: worker.userType
    };
  }

  if (includeApplicantDetails && workerProfile) {
    response.workerProfile = {
      id: toStringId(workerProfile._id),
      bio: workerProfile.bio,
      experience: workerProfile.experience,
      skills: workerProfile.skills,
      languages: workerProfile.languages,
      rating: workerProfile.rating,
      completedJobs: workerProfile.completedJobs,
      totalEarnings: workerProfile.totalEarnings,
      availability: workerProfile.availability,
      profilePictureSmall: workerProfile.profilePictureSmall || null,
      profilePictureMedium: workerProfile.profilePictureMedium || null,
      portfolioThumbnails: workerProfile.portfolioThumbnails || [],
      portfolioPreviews: workerProfile.portfolioPreviews || []
    };
  }

  return response;
};

module.exports = {
  buildApplicationPresenter,
  resolveCompanyLogos,
  resolveJobLocationLabel
};
