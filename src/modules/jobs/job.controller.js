const mongoose = require('mongoose');
const Job = require('./job.model');
const Application = require('../applications/application.model');
const Business = require('../businesses/business.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const { haversine } = require('../../shared/utils/distance');
const {
  DEFAULT_ALLOWED_RADIUS_METERS,
  buildLocationLabel
} = require('../../shared/utils/location');
const {
  ensureBusinessAccess,
  getAccessibleBusinessIds,
} = require('../../shared/utils/businessAccess');

const JOB_FREE_QUOTA = 2;
const JOB_PUBLISH_STATUS = Object.freeze({
  PAYMENT_REQUIRED: 'payment_required',
  READY_TO_PUBLISH: 'ready_to_publish',
  PUBLISHED: 'published',
});
const BUSINESS_RESPONSE_FIELDS =
  'businessName name logoUrl logo location address businessAddress formattedAddress';
const parsePublishToggle = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }
  return undefined;
};

const toPlainObject = (value) => {
  if (!value) return null;
  if (typeof value.toObject === 'function') {
    return value.toObject();
  }
  return value;
};

const normalizeString = (value) => {
  if (value == null) {
    return undefined;
  }
  const str = value.toString().trim();
  return str.length ? str : undefined;
};

const normalizeAddressObject = (addr) => {
  const plain = toPlainObject(addr);
  if (!plain || typeof plain !== 'object') {
    return {};
  }
  return {
    line1:
      normalizeString(plain.line1) ||
      normalizeString(plain.street) ||
      normalizeString(plain.street1) ||
      normalizeString(plain.address1),
    line2:
      normalizeString(plain.line2) ||
      normalizeString(plain.street2) ||
      normalizeString(plain.address2),
    city: normalizeString(plain.city),
    state: normalizeString(plain.state),
    postalCode:
      normalizeString(plain.postalCode) ||
      normalizeString(plain.zip) ||
      normalizeString(plain.postal_code),
    country:
      normalizeString(plain.country) ||
      normalizeString(plain.countryCode) ||
      normalizeString(plain.country_name),
  };
};

const buildAddressChain = ({
  line1,
  city,
  state,
  postalCode,
  country,
}) => {
  const parts = [];
  const seen = new Set();
  const addPart = (value) => {
    const normalized = normalizeString(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(normalized);
  };

  addPart(line1);
  addPart(city);
  addPart(state);
  addPart(postalCode);
  addPart(country);

  return parts.length ? parts.join(', ') : null;
};

const buildLocationAddressString = (location) => {
  const plain = toPlainObject(location);
  if (!plain || typeof plain !== 'object') {
    return null;
  }

  const addressObj = normalizeAddressObject(plain.address);

  return buildAddressChain({
    line1:
      normalizeString(plain.line1) ||
      normalizeString(plain.address) ||
      addressObj.line1,
    city: normalizeString(plain.city) || addressObj.city,
    state: normalizeString(plain.state) || addressObj.state,
    postalCode: normalizeString(plain.postalCode) || addressObj.postalCode,
    country: normalizeString(plain.country) || addressObj.country,
  });
};

const resolveLocationLabel = (location) => {
  const fullAddress = buildLocationAddressString(location);
  if (fullAddress) {
    return fullAddress;
  }

  const plain = toPlainObject(location);
  if (!plain || typeof plain !== 'object') {
    return null;
  }

  const addressObj = normalizeAddressObject(plain.address);
  const parts = {
    label: normalizeString(plain.label) || normalizeString(plain.name),
    address:
      normalizeString(plain.address) ||
      addressObj.line1 ||
      normalizeString(plain.line1) ||
      normalizeString(plain.street) ||
      normalizeString(plain.line2) ||
      null,
    city: normalizeString(plain.city) || addressObj.city,
    state: normalizeString(plain.state) || addressObj.state,
    postalCode:
      normalizeString(plain.postalCode) ||
      normalizeString(plain.zip) ||
      addressObj.postalCode,
  };

  return buildLocationLabel(parts);
};

const resolveAddressValue = (address) => {
  if (!address) {
    return null;
  }
  if (typeof address === 'string') {
    const trimmed = address.trim();
    return trimmed.length ? trimmed : null;
  }

  const plain = toPlainObject(address);
  if (!plain) {
    return null;
  }
  if (typeof plain === 'string') {
    const trimmed = plain.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof plain !== 'object') {
    return null;
  }

  const normalized = normalizeAddressObject(plain);
  const formatted = buildAddressChain({
    line1:
      normalizeString(plain.line1) ||
      normalized.line1,
    city: normalizeString(plain.city) || normalized.city,
    state: normalizeString(plain.state) || normalized.state,
    postalCode: normalizeString(plain.postalCode) || normalized.postalCode,
    country: normalizeString(plain.country) || normalized.country,
  });

  if (formatted) {
    return formatted;
  }

  const parts = [];
  if (normalized.line1) parts.push(normalized.line1);
  if (normalized.line2) parts.push(normalized.line2);

  const cityState = [normalized.city, normalized.state]
    .filter(Boolean)
    .join(', ');
  if (cityState) {
    parts.push(
      normalized.postalCode ? `${cityState} ${normalized.postalCode}` : cityState
    );
  } else if (normalized.postalCode) {
    parts.push(normalized.postalCode);
  }
  if (normalized.country) {
    parts.push(normalized.country);
  }

  const joined = parts.join(', ').trim();
  return joined.length ? joined : null;
};

const deriveBusinessAddress = ({ providedAddress, location, business }) => {
  const trimmed =
    typeof providedAddress === 'string'
      ? providedAddress.trim()
      : undefined;
  
  // Priority 1: If employer provided a custom address, use it exactly as-is
  if (trimmed && trimmed.length > 0) {
    console.log(`📝 Using employer's exact address: "${trimmed}"`);
    return trimmed;
  }
  
  const businessObj = business ? toPlainObject(business) : null;
  const businessLocation = businessObj && businessObj.location
    ? toPlainObject(businessObj.location)
    : null;
  const primaryLocation = location || businessLocation;

  // Priority 2: Build full address from location components only if no employer override
  if (primaryLocation) {
    const plain = toPlainObject(primaryLocation);
    
    // Build full address from all components: line1 + city + state + postalCode + country
    const addressParts = [];
    
    if (plain.line1 && plain.line1.trim()) {
      addressParts.push(plain.line1.trim());
    }
    if (plain.city && plain.city.trim()) {
      addressParts.push(plain.city.trim());
    }
    if (plain.state && plain.state.trim()) {
      addressParts.push(plain.state.trim());
    }
    if (plain.postalCode && plain.postalCode.trim()) {
      addressParts.push(plain.postalCode.trim());
    }
    if (plain.country && plain.country.trim()) {
      addressParts.push(plain.country.trim());
    }
    
    if (addressParts.length > 0) {
      console.log(`🏢 Using business location components: "${addressParts.join(', ')}"`);
      return addressParts.join(', ');
    }
  }

  // Fallback: if no primary location, try to build from business data directly
  if (businessObj) {
    const addressObj = normalizeAddressObject(businessObj.address);
    const businessFormatted = buildAddressChain({
      line1:
        trimmed ||
        normalizeString(businessObj.line1) ||
        normalizeString(businessObj.addressLine1) ||
        addressObj.line1,
      city: normalizeString(businessObj.city) || addressObj.city,
      state: normalizeString(businessObj.state) || addressObj.state,
      postalCode:
        normalizeString(businessObj.postalCode) || addressObj.postalCode,
      country: normalizeString(businessObj.country) || addressObj.country,
    });

    if (businessFormatted) {
      return businessFormatted;
    }

    const fromAddress =
      resolveAddressValue(businessObj.address) ||
      resolveAddressValue(businessLocation ? businessLocation.address : null);
    if (fromAddress) {
      return fromAddress;
    }
  }

  return null;
};

const buildJobResponse = async (job, currentUser) => {
  const jobObj = job.toObject();
  const requiresPaymentForEmployer = Boolean(job.premiumRequired);
  const isPublished = Boolean(job.isPublished);

  if (currentUser && currentUser.userType === 'worker') {
    const hasApplied = await Application.exists({ job: job._id, worker: currentUser._id });
    jobObj.hasApplied = Boolean(hasApplied);
    jobObj.premiumRequired =
      !currentUser.premium && currentUser.freeApplicationsUsed >= 3;
  }

  if (jobObj.employer && typeof jobObj.employer === 'object' && jobObj.employer._id) {
    jobObj.employerDetails = jobObj.employer;
    jobObj.employerId = jobObj.employer._id.toString();
    if (!currentUser || currentUser.userType !== 'employer') {
      jobObj.employer = jobObj.employer._id.toString();
    }
  }

  if (jobObj.createdBy && typeof jobObj.createdBy === 'object' && jobObj.createdBy._id) {
    jobObj.createdByDetails = jobObj.createdBy;
    jobObj.createdById = jobObj.createdBy._id.toString();
    if (!currentUser || currentUser.userType !== 'employer') {
      jobObj.createdBy = jobObj.createdBy._id.toString();
    }
  } else if (jobObj.createdBy) {
    jobObj.createdById = jobObj.createdBy.toString();
    jobObj.createdBy = jobObj.createdById;
  } else {
    jobObj.createdById = null;
  }

  if (jobObj.business && typeof jobObj.business === 'object' && jobObj.business._id) {
    jobObj.businessDetails = jobObj.business;
    jobObj.businessId = jobObj.business._id.toString();
    jobObj.businessName =
      jobObj.business.businessName ||
      jobObj.business.name ||
      jobObj.businessName ||
      null;
    const resolvedLogoUrl =
      jobObj.business.logo?.square?.url ||
      jobObj.business.logo?.original?.url ||
      jobObj.business.logoUrl ||
      jobObj.businessLogoUrl ||
      null;
    jobObj.businessLogoUrl = resolvedLogoUrl;
    if (!jobObj.businessLogo && jobObj.business.logo) {
      jobObj.businessLogo = jobObj.business.logo;
    }
    if (!currentUser || currentUser.userType !== 'employer') {
      jobObj.business = jobObj.business._id.toString();
    }
  } else {
    if (!jobObj.businessLogoUrl && jobObj.businessDetails?.logo?.square?.url) {
      jobObj.businessLogoUrl = jobObj.businessDetails.logo.square.url;
    } else if (!jobObj.businessLogoUrl && jobObj.businessDetails?.logo?.original?.url) {
      jobObj.businessLogoUrl = jobObj.businessDetails.logo.original.url;
    } else if (!jobObj.businessLogoUrl && jobObj.businessDetails?.logoUrl) {
      jobObj.businessLogoUrl = jobObj.businessDetails.logoUrl;
    }
    if (!jobObj.businessLogo && jobObj.businessDetails?.logo) {
      jobObj.businessLogo = jobObj.businessDetails.logo;
    }
  }

  if (
    (!jobObj.businessDetails || Object.keys(jobObj.businessDetails).length === 0) &&
    jobObj.businessId &&
    typeof jobObj.businessId === 'object' &&
    jobObj.businessId._id
  ) {
    jobObj.businessDetails = jobObj.businessId;
    jobObj.businessId = jobObj.businessId._id.toString();
    if (!jobObj.businessName) {
      jobObj.businessName =
        jobObj.businessDetails.businessName ||
        jobObj.businessDetails.name ||
        null;
    }
    if (!jobObj.businessLogoUrl) {
      jobObj.businessLogoUrl =
        jobObj.businessDetails.logo?.square?.url ||
        jobObj.businessDetails.logo?.original?.url ||
        jobObj.businessDetails.logoUrl ||
        null;
    }
  }

  if (!jobObj.businessAddress) {
    const locationSources = [
      jobObj.location,
      jobObj.business?.location,
      jobObj.businessDetails?.location,
    ];

    for (const source of locationSources) {
      const label = buildLocationAddressString(source);
      if (label) {
        jobObj.businessAddress = label;
        break;
      }
    }
  }

  if (!jobObj.businessAddress) {
    const addressSources = [
      jobObj.business?.address,
      jobObj.businessDetails?.address,
      jobObj.businessId?.address,
    ];
    for (const source of addressSources) {
      const label = resolveAddressValue(source);
      if (label) {
        jobObj.businessAddress = label;
        break;
      }
    }
  }

  if (!jobObj.location && jobObj.businessDetails?.location) {
    jobObj.location = jobObj.businessDetails.location;
  }

  if (jobObj.publishedBy && typeof jobObj.publishedBy === 'object' && jobObj.publishedBy._id) {
    jobObj.publishedByDetails = jobObj.publishedBy;
    jobObj.publishedBy = jobObj.publishedBy._id.toString();
  } else if (jobObj.publishedBy) {
    jobObj.publishedBy = jobObj.publishedBy.toString();
  }

  jobObj.isPublished = isPublished;
  jobObj.publishStatus = isPublished
    ? JOB_PUBLISH_STATUS.PUBLISHED
    : requiresPaymentForEmployer
      ? JOB_PUBLISH_STATUS.PAYMENT_REQUIRED
      : JOB_PUBLISH_STATUS.READY_TO_PUBLISH;
  jobObj.publishActionRequired =
    jobObj.publishStatus === JOB_PUBLISH_STATUS.READY_TO_PUBLISH &&
    jobObj.status === 'active';

  if (currentUser && currentUser.userType === 'employer') {
    const ownershipTag = resolveOwnershipTag(
      currentUser,
      jobObj.employer,
      jobObj.business?.owner
    );
    if (ownershipTag) {
      jobObj.createdByTag = ownershipTag;
    }
  }

  return jobObj;
};

// API for workers to fetch available jobs
// Worker jobs listing API
exports.listJobsForWorker = catchAsync(async (req, res) => {
  try {
    const filter = {
      status: 'active',
      employer: { $ne: req.user._id }, // Exclude jobs posted by the worker themselves
      isPublished: true
    };

    const accessContext = {
      userType: 'worker',
      userId: req.user._id,
      userEmail: req.user.email,
      accessSource: 'public_worker_access',
      jobsFrom: 'all_public_jobs'
    };

    const latitude = req.query.lat != null ? parseFloat(req.query.lat) : NaN;
    const longitude = req.query.lng != null ? parseFloat(req.query.lng) : NaN;
    const radiusFromQuery =
      req.query.radius != null ? parseFloat(req.query.radius) : NaN;
    const locationFilterEnabled = !Number.isNaN(latitude) && !Number.isNaN(longitude);
    const maxDistanceMeters = Number.isNaN(radiusFromQuery)
      ? DEFAULT_ALLOWED_RADIUS_METERS
      : Math.max(radiusFromQuery, 0);
    const maxDistanceKm = maxDistanceMeters / 1000;

    if (locationFilterEnabled) {
      accessContext.locationFilter = {
        latitude,
        longitude,
        radiusMeters: maxDistanceMeters
      };
    }

    const jobs = await Job.find(filter)
      .populate('business', BUSINESS_RESPONSE_FIELDS)
      .populate('employer', 'firstName lastName email')
      .sort({ createdAt: -1 });

    const resolveCoordinates = (jobDoc) => {
      const candidates = [
        jobDoc.location,
        jobDoc.location?.coordinates,
        jobDoc.business?.location,
        jobDoc.business?.location?.coordinates
      ];

      for (const source of candidates) {
        if (!source) continue;

        const latitudeCandidate = [source.latitude, source.lat, source.y]
          .find((value) => typeof value === 'number' && !Number.isNaN(value));
        const longitudeCandidate = [source.longitude, source.lng, source.x]
          .find((value) => typeof value === 'number' && !Number.isNaN(value));

        if (
          typeof latitudeCandidate === 'number' &&
          typeof longitudeCandidate === 'number'
        ) {
          return {
            latitude: latitudeCandidate,
            longitude: longitudeCandidate
          };
        }

        if (
          Array.isArray(source.coordinates) &&
          source.coordinates.length === 2 &&
          source.coordinates.every(
            (value) => typeof value === 'number' && !Number.isNaN(value)
          )
        ) {
          return {
            longitude: source.coordinates[0],
            latitude: source.coordinates[1]
          };
        }
      }

      return null;
    };

    const jobsWithDistance = [];
    for (const job of jobs) {
      let distanceKm = null;

      if (locationFilterEnabled) {
        const coords = resolveCoordinates(job);
        if (!coords) {
          // Skip jobs without coordinates when filtering by location
          continue;
        }

        distanceKm = haversine({
          lat1: latitude,
          lon1: longitude,
          lat2: coords.latitude,
          lon2: coords.longitude
        });

        if (
          distanceKm === null ||
          Number.isNaN(distanceKm) ||
          distanceKm * 1000 > maxDistanceMeters
        ) {
          continue;
        }
      }

      const jobResponse = await buildJobResponse(job, req.user);
      if (locationFilterEnabled && typeof distanceKm === 'number') {
        jobResponse.distance = distanceKm;
      }
      jobsWithDistance.push({
        job: jobResponse,
        distanceKm
      });
    }

    if (locationFilterEnabled) {
      jobsWithDistance.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    const processedJobs = jobsWithDistance.map(({ job }) => job);

    res.status(200).json({
      status: 'success',
      results: processedJobs.length,
      data: processedJobs,
      accessContext
    });
  } catch (error) {
    console.error('Error in listJobsForWorker:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch jobs'
    });
  }
});

// API for employers to fetch their jobs
exports.listJobsForEmployer = catchAsync(async (req, res) => {
  const accessContext = {
    userType: 'employer',
    userId: req.user._id,
    userEmail: req.user.email,
    accessibleBusinesses: [],
    accessSource: 'unknown',
    jobsFrom: 'all_accessible'
  };

  const accessibleBusinesses = await getAccessibleBusinessIds(req.user);

  const businessDetails = await Business.find({
    _id: { $in: Array.from(accessibleBusinesses) }
  })
    .select('_id businessName logoUrl owner')
    .populate('owner', 'email firstName lastName');

  accessContext.accessibleBusinesses = businessDetails.map(b => ({
    businessId: b._id,
    businessName: b.businessName,
    logoUrl:
      b.logo?.square?.url ||
      b.logo?.original?.url ||
      b.logoUrl ||
      null,
    owner: {
      id: b.owner._id,
      email: b.owner.email,
      name: `${b.owner.firstName} ${b.owner.lastName}`,
      isCurrentUser: b.owner._id.toString() === req.user._id.toString()
    }
  }));

  if (!accessibleBusinesses.size) {
    accessContext.accessSource = 'no_business_access';
    accessContext.message = 'User has no access to any businesses';
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: [],
      accessContext
    });
  }

  const filter = {
    business: { $in: Array.from(accessibleBusinesses) }
  };

  if (req.query.businessId) {
    if (!accessibleBusinesses.has(req.query.businessId)) {
      const requestedBusiness = await Business.findById(req.query.businessId)
        .select('businessName owner logoUrl logo');
      accessContext.accessSource = 'no_access_to_requested_business';
      accessContext.requestedBusiness = requestedBusiness
        ? {
            businessId: requestedBusiness._id,
            businessName: requestedBusiness.businessName,
            logoUrl:
              requestedBusiness.logo?.square?.url ||
              requestedBusiness.logoUrl ||
              null
          }
        : null;
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to view jobs for this business',
        accessContext
      });
    }
    filter.business = req.query.businessId;
  }

  const ownedBusinesses = accessContext.accessibleBusinesses.filter(
    b => b.owner.isCurrentUser
  );
  const partnerBusinesses = accessContext.accessibleBusinesses.filter(
    b => !b.owner.isCurrentUser
  );

  if (ownedBusinesses.length > 0 && partnerBusinesses.length > 0) {
    accessContext.accessSource = 'owned_and_partner_businesses';
  } else if (ownedBusinesses.length > 0) {
    accessContext.accessSource = 'owned_businesses_only';
  } else {
    accessContext.accessSource = 'partner_businesses_only';
  }

  const jobs = await Job.find(filter)
    .populate('business', BUSINESS_RESPONSE_FIELDS)
    .populate('employer', 'firstName lastName email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: jobs.length,
    data: jobs,
    accessContext
  });
});

// Legacy listJobs function for backward compatibility
exports.listJobs = catchAsync(async (req, res) => {
  if (req.user.userType === 'worker') {
    return exports.listJobsForWorker(req, res);
  }
  return exports.listJobsForEmployer(req, res);
});

exports.listJobsLegacy = catchAsync(async (req, res) => {
  const filter = {};
  let requestedEmployerId = req.query.employerId;
  let requestedEmployerUser = null;
  let requestedEmployerBusinessAccess = new Set();

  let accessContext = {
    userType: req.user.userType,
    userId: req.user._id,
    userEmail: req.user.email,
    accessibleBusinesses: [],
    accessSource: 'unknown',
    jobsFrom: 'all_accessible'
  };
  if (req.user.userType === 'worker') {
    // For workers, show all active jobs except their own (if they're also employers)
    filter.status = 'active';
    filter.employer = { $ne: req.user._id }; // Exclude jobs posted by the worker themselves
    filter.isPublished = true;
    accessContext.accessSource = 'public_worker_access';
    accessContext.jobsFrom = 'all_public_jobs';
  } else if (req.user.userType === 'employer') {
    // For employers and team members, limit jobs to accessible businesses
    const accessibleBusinesses =  getAccessibleBusinessIds(req.user);

    // Get detailed business information for transparency
    const businessDetails = await Business.find({
        _id: { $in: Array.from(accessibleBusinesses) }
      })
        .select('_id businessName logoUrl owner')
        .populate('owner', 'email firstName lastName');

    accessContext.accessibleBusinesses = businessDetails.map(b => ({
      businessId: b._id,
      businessName: b.businessName,
      logoUrl:
        b.logo?.square?.url ||
        b.logo?.original?.url ||
        b.logoUrl ||
        null,
      owner: {
        id: b.owner._id,
        email: b.owner.email,
        name: `${b.owner.firstName} ${b.owner.lastName}`,
        isCurrentUser: b.owner._id.toString() === req.user._id.toString()
      }
    }));

    if (!accessibleBusinesses.size) {
      accessContext.accessSource = 'no_business_access';
      accessContext.message = 'User has no access to any businesses';
      return res.status(200).json({ 
        status: 'success', 
        results: 0, 
        data: [],
        accessContext
      });
    }

    // Determine access source
    const ownedBusinesses = accessContext.accessibleBusinesses.filter(b => b.owner.isCurrentUser);
    const partnerBusinesses = accessContext.accessibleBusinesses.filter(b => !b.owner.isCurrentUser);
    
    if (ownedBusinesses.length > 0 && partnerBusinesses.length > 0) {
      accessContext.accessSource = 'owned_and_partner_businesses';
    } else if (ownedBusinesses.length > 0) {
      accessContext.accessSource = 'owned_businesses_only';
    } else {
      accessContext.accessSource = 'partner_businesses_only';
    }

    if (req.query.businessId) {
      if (!accessibleBusinesses.has(req.query.businessId)) {
        const requestedBusiness =  Business.findById(req.query.businessId).select('businessName owner logoUrl logo');
        accessContext.accessSource = 'no_access_to_requested_business';
        accessContext.requestedBusiness = requestedBusiness ? {
          businessId: requestedBusiness._id,
          businessName: requestedBusiness.businessName,
          ownerId: requestedBusiness.owner
        } : { businessId: req.query.businessId, found: false };
        accessContext.message = 'User does not have access to the requested business';
        return res.status(403).json({ 
          status: 'fail',
          message: 'You do not have access to jobs from the requested business',
          accessContext
        });
      }
      filter.business = req.query.businessId;
      const selectedBusiness = accessContext.accessibleBusinesses.find(b => b.businessId.toString() === req.query.businessId);
      accessContext.jobsFrom = 'specific_business';
      accessContext.selectedBusiness = selectedBusiness;
    } else {
      filter.business = { $in: Array.from(accessibleBusinesses) };
      accessContext.jobsFrom = 'all_accessible_businesses';
    }

    if (requestedEmployerId) {
      if (requestedEmployerId === req.user._id.toString()) {
        requestedEmployerUser = req.user;
        requestedEmployerBusinessAccess = accessibleBusinesses;
      } else {
        requestedEmployerUser = await User.findById(requestedEmployerId).select('email firstName lastName userType');
        if (requestedEmployerUser) {
          requestedEmployerBusinessAccess = await getAccessibleBusinessIds(requestedEmployerUser);
        }
      }
      accessContext.jobsFrom = 'specific_employer';
      accessContext.requestedEmployerId = requestedEmployerId;
    }
  }
  
  // Additional filters
  if (req.query.businessId) {
    filter.business = req.query.businessId;
  }
  if (requestedEmployerId) {
    const employerOrCreatorFilter = [
      { employer: requestedEmployerId },
      { createdBy: requestedEmployerId }
    ];

    if (requestedEmployerBusinessAccess.size) {
      employerOrCreatorFilter.push({
        $and: [
          { business: { $in: Array.from(requestedEmployerBusinessAccess) } },
          {
            $or: [
              { createdBy: { $exists: false } },
              { createdBy: null }
            ]
          }
        ]
      });
    }

    if (filter.$and) {
      filter.$and.push({ $or: employerOrCreatorFilter });
    } else {
      filter.$and = [{ $or: employerOrCreatorFilter }];
    }
  }
  if (req.query.status) {
    filter.status = req.query.status;
  } else if (!filter.status) {
    filter.status = { $ne: 'draft' }; // Exclude drafts for general listing
  }
  if (req.user.userType !== 'worker' && typeof req.query.published === 'string') {
    if (req.query.published.toLowerCase() === 'true') {
      filter.isPublished = true;
    } else if (req.query.published.toLowerCase() === 'false') {
      filter.isPublished = false;
    }
  }
  if (req.query.tags) {
    filter.tags = { $in: req.query.tags.split(',').map((tag) => tag.trim()) };
  }

  const businessPopulate =
    req.user.userType === 'employer'
      ? {
          path: 'business',
          select: `${BUSINESS_RESPONSE_FIELDS} owner`,
          populate: { path: 'owner', select: 'email firstName lastName' },
        }
      : {
          path: 'business',
          select: BUSINESS_RESPONSE_FIELDS,
        };
  const businessIdPopulate = {
    path: 'businessId',
    select: BUSINESS_RESPONSE_FIELDS,
  };

  let jobQuery = Job.find(filter)
    .sort({ createdAt: -1 })
    .populate(businessPopulate)
    .populate(businessIdPopulate);

  if (req.user.userType === 'employer') {
    jobQuery = jobQuery
      .populate('employer', 'email firstName lastName userType')
      .populate('createdBy', 'email firstName lastName userType')
      .populate('publishedBy', 'email firstName lastName userType');
  }

  const jobs = await jobQuery;
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius);

  const decorated = await Promise.all(
    jobs.map(async (job) => {
      const jobResp = await buildJobResponse(job, req.user);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        const distance = haversine({
          lat1: lat,
          lon1: lng,
          lat2: job.location?.latitude,
          lon2: job.location?.longitude
        });
        jobResp.distance = distance;
        if (!Number.isNaN(radius) && distance !== null && distance > radius) {
          return null;
        }
      }
      return jobResp;
    })
  );

  const resolveJobBusinessId = (job) => {
    if (!job) return null;
    if (job.businessId) {
      return job.businessId.toString();
    }
    if (job.business && typeof job.business === 'object' && job.business._id) {
      return job.business._id.toString();
    }
    if (typeof job.business === 'string') {
      return job.business;
    }
    return null;
  };

  const filtered = [];
  for (const job of decorated) {
    if (!job) {
      continue;
    }

    let includeJob = true;

    if (requestedEmployerId) {
      const matchesRequestedEmployer =
        (job.employerId && job.employerId === requestedEmployerId) ||
        (job.createdById && job.createdById === requestedEmployerId);

      if (!matchesRequestedEmployer) {
        includeJob = false;

        const jobHasCreator = Boolean(job.createdById);
        const jobBusinessId = resolveJobBusinessId(job);
        const hasBusinessAccess =
          jobBusinessId && requestedEmployerBusinessAccess.has(jobBusinessId);

        if (!jobHasCreator && hasBusinessAccess) {
          includeJob = true;
          job.createdById = requestedEmployerId;
          job.createdBy = requestedEmployerId;
          if (!job.createdByDetails && requestedEmployerUser) {
            job.createdByDetails = {
              _id: requestedEmployerUser._id?.toString() || requestedEmployerId,
              email: requestedEmployerUser.email || undefined,
              firstName: requestedEmployerUser.firstName || undefined,
              lastName: requestedEmployerUser.lastName || undefined,
              userType: requestedEmployerUser.userType || undefined
            };
          }
          if (!job.createdByTag) {
            job.createdByTag = 'team_member';
          }
        }
      }
    }

    if (includeJob) {
      filtered.push(job);
    }
  }
  
  // Add summary of jobs by business
  if (req.user.userType === 'employer' && filtered.length > 0) {
    const jobsByBusiness = {};
    filtered.forEach(job => {
      const businessId = job.business._id.toString();
      if (!jobsByBusiness[businessId]) {
        const businessName =
          job.business.businessName ||
          job.business.name ||
          job.businessName ||
          null;
        jobsByBusiness[businessId] = {
          businessId: businessId,
          businessName,
          logoUrl:
            job.business.logo?.square?.url ||
            job.business.logo?.original?.url ||
            job.business.logoUrl ||
            null,
          owner: job.employer,
          jobCount: 0
        };
      }
      jobsByBusiness[businessId].jobCount++;
    });
    accessContext.jobsSummary = Object.values(jobsByBusiness);
  }

  res.status(200).json({ 
    status: 'success', 
    results: filtered.length, 
    data: filtered,
    accessContext
  });
});

exports.getJobAccessContext = catchAsync(async (req, res) => {
  const accessContext = {
    userType: req.user.userType,
    userId: req.user._id,
    userEmail: req.user.email,
    accessibleBusinesses: [],
    accessSource: 'unknown'
  };

  if (req.user.userType === 'worker') {
    accessContext.accessSource = 'public_worker_access';
    accessContext.message = 'Workers can view all public job postings';
  } else if (req.user.userType === 'employer') {
    const accessibleBusinesses = await getAccessibleBusinessIds(req.user);
    
    if (!accessibleBusinesses.size) {
      accessContext.accessSource = 'no_business_access';
      accessContext.message = 'User has no access to any businesses. Create a business or get invited to one.';
    } else {
      // Get detailed business information
      const businessDetails = await Business.find({
        _id: { $in: Array.from(accessibleBusinesses) }
      }).select('_id businessName owner createdAt').populate('owner', 'email firstName lastName');

      accessContext.accessibleBusinesses = businessDetails.map(b => ({
        businessId: b._id,
        businessName: b.businessName,
        createdAt: b.createdAt,
        owner: {
          id: b.owner._id,
          email: b.owner.email,
          name: `${b.owner.firstName} ${b.owner.lastName}`,
          isCurrentUser: b.owner._id.toString() === req.user._id.toString()
        }
      }));

      // Determine access source
      const ownedBusinesses = accessContext.accessibleBusinesses.filter(b => b.owner.isCurrentUser);
      const partnerBusinesses = accessContext.accessibleBusinesses.filter(b => !b.owner.isCurrentUser);
      
      if (ownedBusinesses.length > 0 && partnerBusinesses.length > 0) {
        accessContext.accessSource = 'owned_and_partner_businesses';
        accessContext.message = `Access to ${ownedBusinesses.length} owned business(es) and ${partnerBusinesses.length} partner business(es)`;
      } else if (ownedBusinesses.length > 0) {
        accessContext.accessSource = 'owned_businesses_only';
        accessContext.message = `Access to ${ownedBusinesses.length} owned business(es)`;
      } else {
        accessContext.accessSource = 'partner_businesses_only';
        accessContext.message = `Access to ${partnerBusinesses.length} partner business(es) through team access`;
      }

      // Get job counts for each business
      const jobCounts = await Promise.all(
        accessContext.accessibleBusinesses.map(async (business) => {
          const count = await Job.countDocuments({ 
            business: business.businessId,
            status: { $ne: 'draft' }
          });
          return { businessId: business.businessId, jobCount: count };
        })
      );

      accessContext.accessibleBusinesses.forEach(business => {
        const jobInfo = jobCounts.find(jc => jc.businessId.toString() === business.businessId.toString());
        business.jobCount = jobInfo ? jobInfo.jobCount : 0;
      });
    }
  }

  res.status(200).json({
    status: 'success',
    data: accessContext
  });
});

exports.getJob = catchAsync(async (req, res, next) => {
  const businessPopulateForDetail =
    req.user.userType === 'employer'
      ? {
          path: 'business',
          select: `${BUSINESS_RESPONSE_FIELDS} owner`,
          populate: { path: 'owner', select: 'email firstName lastName' },
        }
      : {
          path: 'business',
          select: BUSINESS_RESPONSE_FIELDS,
        };

  let jobQuery = Job.findById(req.params.jobId)
    .populate(businessPopulateForDetail)
    .populate({ path: 'businessId', select: BUSINESS_RESPONSE_FIELDS });
  if (req.user.userType === 'employer') {
    jobQuery = jobQuery
      .populate('employer', 'email firstName lastName userType')
      .populate('createdBy', 'email firstName lastName userType')
      .populate('publishedBy', 'email firstName lastName userType');
  }

  const job = await jobQuery;
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  if (
    req.user.userType === 'worker' &&
    !job.isPublished &&
    job.employer?.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('Job not found', 404));
  }
  const jobResp = await buildJobResponse(job, req.user);
  res.status(200).json({ status: 'success', data: jobResp });
});

exports.createJob = catchAsync(async (req, res, next) => {
  if (req.user.userType !== 'employer') {
    return next(new AppError('Only employers can create jobs', 403));
  }

  // Accept both 'business' and 'businessId' field names for flexibility
  const businessId = req.body.business || req.body.businessId;
  if (!businessId) {
    return next(new AppError('Business must be specified for job postings (use "business" or "businessId" field)', 400));
  }

  const { business } = await ensureBusinessAccess({
    user: req.user,
    businessId,
    requiredPermissions: 'create_jobs',
  });

  const ownerUser = await User.findById(business.owner);
  if (!ownerUser) {
    return next(new AppError('Business owner not found for job creation', 400));
  }

  // Validate schedule and recurrence
  if (req.body.schedule && req.body.schedule.recurrence) {
    const validRecurrenceTypes = ['one-time', 'weekly', 'monthly', 'custom'];
    if (!validRecurrenceTypes.includes(req.body.schedule.recurrence)) {
      return next(new AppError(`Invalid recurrence type. Must be one of: ${validRecurrenceTypes.join(', ')}`, 400));
    }
    
    // Additional validation for weekly recurrence
    if (req.body.schedule.recurrence === 'weekly' && req.body.schedule.workDays) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const invalidDays = req.body.schedule.workDays.filter(day => 
        !validDays.includes(day.toLowerCase().trim())
      );
      if (invalidDays.length > 0) {
        return next(new AppError(`Invalid work days: ${invalidDays.join(', ')}. Must be valid day names.`, 400));
      }
    }
  }

  const freeJobsUsed = Number(ownerUser.freeJobsPosted || 0);
  const requiresPayment = !ownerUser.premium && freeJobsUsed >= JOB_FREE_QUOTA;
  const shouldAutoPublish = !requiresPayment;

  // Create job data and ensure business field is set correctly
  const jobData = { ...req.body };
  // Remove businessId if it exists to avoid confusion
  delete jobData.businessId;
  delete jobData.publish;
  delete jobData.publishAfterPayment;
  delete jobData.publishStatus;
  delete jobData.publishActionRequired;
  delete jobData.premiumRequired;
  delete jobData.status;
  delete jobData.isPublished;
  delete jobData.published;
  delete jobData.publishedAt;
  delete jobData.publishedBy;

  const initialStatus = shouldAutoPublish ? 'active' : 'draft';

  // Handle employer-provided location
  let jobLocation = jobData.location;
  
  // Check if employer provided a custom address for this job
  const employerProvidedAddress = 
    jobData.businessAddress?.trim() || 
    (jobLocation && jobLocation.address?.trim());
  
  console.log(`[Job Creation] Processing address for job: ${jobData.title}`);
  console.log(`[Job Creation] Raw jobData.location:`, jobLocation);
  console.log(`[Job Creation] Raw jobData.businessAddress:`, jobData.businessAddress);
  console.log(`[Job Creation] Employer-provided address:`, employerProvidedAddress);
  console.log(`[Job Creation] Business location:`, business.location);
  
  if (!jobLocation && business.location) {
    console.log(`📍 Copying business location to job for business: ${business.name}`);
    jobLocation = {
      ...business.location.toObject ? business.location.toObject() : business.location,
      setBy: req.user._id,
      setAt: new Date()
    };
    
    // Override with employer-provided address if provided
    if (employerProvidedAddress) {
      console.log(`📝 Employer provided custom address: "${employerProvidedAddress}"`);
      jobLocation.line1 = employerProvidedAddress;
    }
    
    console.log(`📍 Job location set to: ${jobLocation.line1 || jobLocation.city || 'Unknown'}`);
  } else if (jobLocation && employerProvidedAddress) {
    // If location exists but employer provided a custom address, override it
    console.log(`📝 Overriding job location with employer address: "${employerProvidedAddress}"`);
    jobLocation.line1 = employerProvidedAddress;
  } else if (!jobLocation && employerProvidedAddress) {
    // Create new location with employer-provided address and business coordinates
    console.log(`📝 Creating job location from employer address: "${employerProvidedAddress}"`);
    jobLocation = {
      line1: employerProvidedAddress,
      // Use business location for coordinates if available
      ...(business.location ? {
        city: business.location.city,
        state: business.location.state,
        postalCode: business.location.postalCode,
        country: business.location.country,
        latitude: business.location.latitude,
        longitude: business.location.longitude,
        allowedRadius: business.location.allowedRadius,
        placeId: business.location.placeId,
      } : {}),
      setBy: req.user._id,
      setAt: new Date()
    };
  }

  // Use employer-provided address from location object or direct businessAddress field
  const providedBusinessAddress =
    employerProvidedAddress ||
    (typeof jobData.businessAddress === 'string'
      ? jobData.businessAddress.trim()
      : undefined);
  delete jobData.businessAddress;

  const jobBusinessAddress = deriveBusinessAddress({
    providedAddress: providedBusinessAddress,
    location: jobLocation,
    business,
  });

  console.log(`🏢 DEBUG: Final providedBusinessAddress: "${providedBusinessAddress}"`);
  console.log(`🏢 DEBUG: Derived business address: "${jobBusinessAddress}"`);
  console.log(`🏢 DEBUG: From location line1: "${jobLocation?.line1}"`);
  console.log(`🏢 DEBUG: From location city: "${jobLocation?.city}"`);
  console.log(`🏢 DEBUG: From location state: "${jobLocation?.state}"`);

  const job = await Job.create({
    ...jobData,
    employer: business.owner,
    createdBy: req.user._id,
    business: business._id,
    location: jobLocation, // Include location from business
    businessAddress: jobBusinessAddress ?? undefined,
    premiumRequired: requiresPayment,
    status: initialStatus,
    isPublished: shouldAutoPublish,
    publishedAt: shouldAutoPublish ? new Date() : null,
    publishedBy: shouldAutoPublish ? req.user._id : null,
  });

  if (shouldAutoPublish) {
    business.stats.jobsPosted += 1;
    await business.save();

    const employerProfile = await EmployerProfile.findOne({ user: business.owner });
    if (employerProfile) {
      employerProfile.totalJobsPosted += 1;
      await employerProfile.save();
    }

    if (!ownerUser.premium) {
      ownerUser.freeJobsPosted = freeJobsUsed + 1;
      await ownerUser.save();
    }
  }

  await job.populate([
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    },
    { path: 'employer', select: 'email firstName lastName userType' },
    { path: 'createdBy', select: 'email firstName lastName userType' },
    { path: 'publishedBy', select: 'email firstName lastName userType' }
  ]);

  const responseData = await buildJobResponse(job, req.user);

  res.status(201).json({ status: 'success', data: responseData });
});


exports.updateJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId).populate([
    { path: 'employer', select: 'email firstName lastName userType' },
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    },
    { path: 'publishedBy', select: 'email firstName lastName userType' }
  ]);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  await ensureBusinessAccess({
    user: req.user,
    businessId: job.business,
    requiredPermissions: 'edit_jobs',
  });
  const updatePayload = { ...req.body };
  delete updatePayload.createdBy;
  const publishKeyUsed = ['publish', 'isPublished', 'publishAfterPayment'].find((key) =>
    Object.prototype.hasOwnProperty.call(updatePayload, key)
  );
  const requestedPublishState =
    publishKeyUsed !== undefined
      ? parsePublishToggle(updatePayload[publishKeyUsed])
      : undefined;
  delete updatePayload.publish;
  delete updatePayload.isPublished;
  delete updatePayload.publishAfterPayment;
  delete updatePayload.published;
  delete updatePayload.publishedAt;
  delete updatePayload.publishedBy;
  delete updatePayload.publishStatus;
  delete updatePayload.publishActionRequired;
  Object.assign(job, updatePayload);

  if (requestedPublishState !== undefined) {
    if (requestedPublishState) {
      if (job.premiumRequired) {
        return next(new AppError('Complete payment before publishing this job', 402));
      }
      if (job.status !== 'active') {
        return next(new AppError('Only active jobs can be published', 400));
      }
      job.isPublished = true;
      job.publishedAt = new Date();
      job.publishedBy = req.user._id;
    } else if (job.isPublished) {
      job.isPublished = false;
      job.publishedAt = null;
      job.publishedBy = null;
    }
  }

  await job.save();
  await job.populate([
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    },
    { path: 'employer', select: 'email firstName lastName userType' },
    { path: 'createdBy', select: 'email firstName lastName userType' },
    { path: 'publishedBy', select: 'email firstName lastName userType' }
  ]);
  const responseData = await buildJobResponse(job, req.user);
  res.status(200).json({ status: 'success', data: responseData });
});

exports.updateJobStatus = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  await ensureBusinessAccess({
    user: req.user,
    businessId: job.business,
    requiredPermissions: 'edit_jobs',
  });
  job.status = req.body.status;
  await job.save();
  await job.populate([
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    },
    { path: 'employer', select: 'email firstName lastName userType' },
    { path: 'createdBy', select: 'email firstName lastName userType' },
    { path: 'publishedBy', select: 'email firstName lastName userType' }
  ]);
  const responseData = await buildJobResponse(job, req.user);
  res.status(200).json({ status: 'success', data: responseData });
});

exports.listApplicationsForJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return next(new AppError('Job not found', 404));
  }
  if (req.user.userType !== 'employer') {
    return next(new AppError('Not authorized to view applications for this job', 403));
  }

  await ensureBusinessAccess({
    user: req.user,
    businessId: job.business,
    requiredPermissions: 'view_applications',
  });

  await job.populate([
    { path: 'employer', select: 'email firstName lastName userType' },
    {
      path: 'business',
      populate: { path: 'owner', select: 'email firstName lastName' }
    },
    { path: 'publishedBy', select: 'email firstName lastName userType' }
  ]);

  const applications = await Application.find({ job: job._id })
    .populate('worker', 'firstName lastName email phone')
    .sort({ createdAt: -1 });
  const ownershipTag =
    req.user.userType === 'employer'
      ? resolveOwnershipTag(req.user, job.employer, job.business?.owner)
      : null;
  const data = applications.map((application) => {
    const plain = application.toObject({ virtuals: true });
    if (ownershipTag) {
      plain.createdByTag = ownershipTag;
    }
    return plain;
  });
  res.status(200).json({ status: 'success', data });
});

exports.hireApplicant = catchAsync(async (req, res, next) => {
  const application = await Application.findById(req.params.applicationId).populate({
    path: 'job',
    populate: [
      { path: 'employer', select: 'email firstName lastName userType' },
      {
        path: 'business',
        populate: { path: 'owner', select: 'email firstName lastName' }
      }
    ]
  });
  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  // Check if user has access to hire for this job's business
  // Use ensureBusinessAccess to support both job owners and team members with hiring permissions
  const job = application.job;
  const isJobOwner = job?.employer?.toString() === req.user._id.toString();
  let hasAccess = isJobOwner;
  let accessError = null;

  if (!hasAccess && job?.business) {
    try {
      await ensureBusinessAccess({
        user: req.user,
        businessId: job.business,
        requiredPermissions: 'hire_workers',
      });
      hasAccess = true;
    } catch (error) {
      accessError = error;
    }
  }

  if (!hasAccess) {
    if (accessError) {
      return next(accessError);
    }
    return next(new AppError('You can only hire for jobs you have access to manage', 403));
  }

  // Update application status
  application.status = 'hired';
  application.hiredAt = new Date();
  await application.save();

  // Reject other applications for this job
  await Application.updateMany(
    { job: application.job._id, _id: { $ne: application._id } },
    { status: 'rejected', rejectedAt: new Date() }
  );

  // Update job status
  application.job.status = 'filled';
  application.job.hiredWorker = application.worker;
  await application.job.save();

  // Build structured work location data from the job location snapshot (if available)
  let workLocationDetails;
  let workLocationLabel;
  if (application.job.location && (application.job.location.latitude != null && application.job.location.longitude != null)) {
    const { latitude, longitude } = application.job.location;
    workLocationLabel = buildLocationLabel({
      address: application.job.location.line1 || application.job.location.address,
      city: application.job.location.city,
      state: application.job.location.state,
      postalCode: application.job.location.postalCode,
      label: application.job.title
    });
    workLocationDetails = {
      label: application.job.title,
      address: workLocationLabel,
      latitude,
      longitude,
      allowedRadius: DEFAULT_ALLOWED_RADIUS_METERS,
      setBy: req.user._id,
      setAt: new Date()
    };
  } else if (application.job.location) {
    workLocationLabel = buildLocationLabel({
      address: application.job.location.line1 || application.job.location.address,
      city: application.job.location.city,
      state: application.job.location.state,
      postalCode: application.job.location.postalCode,
      label: application.job.title
    });
  }

  // Create employment record for hire tracking
  const employmentRecord = await WorkerEmployment.create({
    worker: application.worker,
    employer: req.user._id,
    business: application.job.business,
    job: application.job._id,
    application: application._id,
    hireDate: new Date(),
    employmentStatus: 'active',
    position: application.job.title,
    hourlyRate: application.job.hourlyRate,
    workLocation: workLocationLabel,
    workLocationDetails,
    startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
    endDate: null // Initially null for active employment
  });

  // Update worker profile with current employment info
  await WorkerProfile.updateOne(
    { user: application.worker },
    {
      $inc: { completedJobs: 1 },
      $set: {
        employmentStatus: 'employed',
        currentEmployer: req.user._id,
        hireDate: new Date()
      }
    }
  );

  // Update business and employer stats
  await Business.updateOne(
    { _id: application.job.business },
    { $inc: { 'stats.hires': 1 } }
  );
  await EmployerProfile.updateOne(
    { user: req.user._id },
    { $inc: { totalHires: 1 } }
  );

  // Return enriched response with employment info
  const responseData = {
    ...application.toObject(),
    employmentRecord: {
      employmentId: employmentRecord._id,
      hireDate: employmentRecord.hireDate,
      position: employmentRecord.position,
      hourlyRate: employmentRecord.hourlyRate,
      employmentStatus: employmentRecord.employmentStatus
    }
  };

  if (req.user.userType === 'employer') {
    const ownershipTag = resolveOwnershipTag(
      req.user,
      application.job?.employer,
      application.job?.business?.owner
    );
    if (ownershipTag) {
      responseData.createdByTag = ownershipTag;
      if (responseData.job) {
        responseData.job.createdByTag = ownershipTag;
      }
    }
  }

  res.status(200).json({ 
    status: 'success', 
    message: 'Applicant hired successfully and employment record created',
    data: responseData 
  });
});

// Create multiple jobs (bulk operation)
exports.createJobsBulk = catchAsync(async (req, res) => {
  const { jobs: jobsData } = req.body;
  
  if (!jobsData || !Array.isArray(jobsData) || jobsData.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Jobs array is required and cannot be empty'
    });
  }

  const createdJobs = [];
  const errors = [];

  for (let i = 0; i < jobsData.length; i++) {
    try {
      const jobData = jobsData[i];
      
      // Validate required fields
      if (!jobData.title || !jobData.businessId) {
        errors.push({
          index: i,
          error: 'Title and businessId are required'
        });
        continue;
      }

      // Get business information for location copying
      const business = await Business.findById(jobData.businessId);
      if (!business) {
        errors.push({
          index: i,
          error: 'Business not found'
        });
        continue;
      }

      // Handle employer-provided address for bulk job creation
      const employerProvidedAddress = 
        jobData.businessAddress?.trim() || 
        (jobData.location && jobData.location.line1?.trim());

      console.log(`[Bulk Job ${i}] Processing address for job: ${jobData.title}`);
      console.log(`[Bulk Job ${i}] Employer-provided address:`, employerProvidedAddress);
      console.log(`[Bulk Job ${i}] Business location:`, business.location);

      const businessAddress = deriveBusinessAddress({
        providedAddress: employerProvidedAddress,
        location: jobData.location || business.location,
        business
      });
      
      console.log(`[Bulk Job ${i}] Final derived address:`, businessAddress);

      // Create job with derived location
      const newJob = new Job({
        ...jobData,
        employer: req.user._id,
        businessAddress
      });

      const savedJob = await newJob.save();
      
      // Populate job with related data
      const populatedJob = await Job.findById(savedJob._id)
        .populate('employer', 'firstName lastName email')
        .populate('business', 'name address logoUrl')
        .populate('hiredWorker', 'firstName lastName email');

      createdJobs.push(populatedJob);
      
    } catch (error) {
      console.error(`Error creating job at index ${i}:`, error);
      errors.push({
        index: i,
        error: error.message
      });
    }
  }

  const response = {
    status: createdJobs.length > 0 ? 'success' : 'error',
    message: `${createdJobs.length} job(s) created successfully`,
    data: {
      createdJobs,
      totalRequested: jobsData.length,
      successCount: createdJobs.length,
      errorCount: errors.length
    }
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  const statusCode = createdJobs.length > 0 ? 201 : 400;
  res.status(statusCode).json(response);
});

// Get all jobs by id (for both employer and hired worker)
exports.getJobsByUserId = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: 'error',
      message: 'Id parameter is required'
    });
  }

  // Find user by _id
  const user = await User.findById(id).select('_id firstName lastName email userType');
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found with the provided id'
    });
  }

  // Find all jobs where user is either employer or hired worker
  const jobs = await Job.find({
    $or: [
      { employer: user._id },
      { hiredWorker: user._id }
    ]
  })
  .populate('employer', 'userId firstName lastName email')
  .populate('hiredWorker', 'userId firstName lastName email')
  .populate('business', 'name address logoUrl')
  .sort({ createdAt: -1 });

  // Categorize jobs
  const categorizedJobs = {
    postedJobs: jobs.filter(job => job.employer._id.toString() === user._id.toString()),
    hiredJobs: jobs.filter(job => job.hiredWorker && job.hiredWorker._id.toString() === user._id.toString())
  };

  res.status(200).json({
    status: 'success',
    results: jobs.length,
    data: {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType
      },
      jobs: categorizedJobs,
      summary: {
        totalJobs: jobs.length,
        postedJobs: categorizedJobs.postedJobs.length,
        hiredJobs: categorizedJobs.hiredJobs.length
      }
    }
  });
});
