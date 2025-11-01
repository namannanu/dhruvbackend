const Business = require('./business.model');
const TeamMember = require('./teamMember.model');
const User = require('../users/user.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const notificationService = require('../notifications/notification.service');
const {
  ensureBusinessAccess,
  getAccessibleBusinessIds,
} = require('../../shared/utils/businessAccess');

const sharp = require('sharp');

const resolveString = (value) =>
  typeof value === 'string' && value.trim().length ? value.trim() : undefined;

const MAX_LOGO_DIMENSION = 512;
const SQUARE_LOGO_DIMENSION = 256;
const TARGET_JPEG_QUALITY = 80;
const MIN_OPTIMIZATION_DELTA = 512; // Require at least 0.5 KB savings
const MIN_OPTIMIZATION_SIZE = 10 * 1024; // Skip tiny images (<10 KB)

function buildDataUrl({ buffer, mimeType }) {
  if (!buffer || !mimeType) return undefined;
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

const normalizeMimeType = (mimeTypeOrFormat, hasAlpha) => {
  const normalized = resolveString(mimeTypeOrFormat)?.toLowerCase();
  if (!normalized) return hasAlpha ? 'image/png' : 'image/jpeg';
  if (normalized.startsWith('image/')) return normalized;

  switch (normalized) {
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return hasAlpha ? 'image/png' : 'image/gif';
    case 'avif':
      return 'image/avif';
    default:
      return hasAlpha ? 'image/png' : 'image/jpeg';
  }
};

const optimizeImageBuffer = async (buffer, mimeType) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < MIN_OPTIMIZATION_SIZE) {
    return { buffer, mimeType };
  }

  try {
    const baseInstance = sharp(buffer, { failOnError: false });
    const metadata = await baseInstance.metadata();

    const hasAlpha = Boolean(metadata.hasAlpha);
    const normalizedMime = normalizeMimeType(
      mimeType ?? metadata.format,
      hasAlpha
    );

    let pipeline = sharp(buffer, { failOnError: false });
    if (
      metadata.width &&
      metadata.height &&
      (metadata.width > MAX_LOGO_DIMENSION ||
        metadata.height > MAX_LOGO_DIMENSION)
    ) {
      pipeline = pipeline.resize({
        width: MAX_LOGO_DIMENSION,
        height: MAX_LOGO_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    let optimizedBuffer;
    let optimizedMime = normalizedMime;

    if (normalizedMime.includes('svg')) {
      // Vector data should stay as-is
      return { buffer, mimeType: normalizedMime };
    }

    if (normalizedMime.includes('png') || hasAlpha) {
      optimizedBuffer = await pipeline
        .webp({
          quality: TARGET_JPEG_QUALITY,
          smartSubsample: true,
          alphaQuality: TARGET_JPEG_QUALITY,
        })
        .toBuffer();
      optimizedMime = 'image/webp';
    } else if (normalizedMime.includes('webp')) {
      optimizedBuffer = await pipeline
        .webp({
          quality: TARGET_JPEG_QUALITY,
          smartSubsample: true,
        })
        .toBuffer();
      optimizedMime = 'image/webp';
    } else if (normalizedMime.includes('gif')) {
      optimizedBuffer = await pipeline
        .webp({
          quality: TARGET_JPEG_QUALITY,
          smartSubsample: true,
        })
        .toBuffer();
      optimizedMime = 'image/webp';
    } else if (normalizedMime.includes('avif')) {
      optimizedBuffer = await pipeline
        .avif({
          quality: TARGET_JPEG_QUALITY,
        })
        .toBuffer();
      optimizedMime = 'image/avif';
    } else {
      optimizedBuffer = await pipeline
        .jpeg({
          quality: TARGET_JPEG_QUALITY,
          mozjpeg: true,
        })
        .toBuffer();
      optimizedMime = 'image/jpeg';
    }

    if (
      !optimizedBuffer ||
      optimizedBuffer.length + MIN_OPTIMIZATION_DELTA >= buffer.length
    ) {
      return { buffer, mimeType: normalizedMime };
    }

    return { buffer: optimizedBuffer, mimeType: optimizedMime };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ Logo optimization skipped due to error:', error);
    return { buffer, mimeType };
  }
};

const optimizeLogoAsset = async (asset) => {
  if (!asset?.data || !Buffer.isBuffer(asset.data)) {
    return asset;
  }

  const currentMime =
    resolveString(asset.mimeType) ||
    resolveString(asset.contentType) ||
    'image/png';

  const { buffer: optimizedBuffer, mimeType: optimizedMime } =
    await optimizeImageBuffer(asset.data, currentMime);

  if (optimizedBuffer === asset.data) {
    if (!asset.url) {
      asset.url = buildDataUrl({ buffer: asset.data, mimeType: currentMime });
    }
    return asset;
  }

  asset.data = optimizedBuffer;
  asset.size = optimizedBuffer.length;
  asset.mimeType = optimizedMime;
  asset.url = buildDataUrl({
    buffer: optimizedBuffer,
    mimeType: optimizedMime,
  });

  return asset;
};

const optimizeLogoUpdates = async (updates) => {
  if (!updates?.logo) return;

  const originalAsset = updates.logo.original;
  if (originalAsset) {
    await optimizeLogoAsset(originalAsset);
    if (
      originalAsset.url &&
      (!updates.logoUrl || updates.logoUrl.startsWith('data:'))
    ) {
      updates.logoUrl = originalAsset.url;
    }

    if (!updates.logo.square && Buffer.isBuffer(originalAsset.data)) {
      try {
        const squareBuffer = await sharp(originalAsset.data, {
          failOnError: false,
        })
          .resize({
            width: SQUARE_LOGO_DIMENSION,
            height: SQUARE_LOGO_DIMENSION,
            fit: 'cover',
            position: 'centre',
          })
          .toBuffer();

        const squareMime =
          resolveString(originalAsset.mimeType) ||
          resolveString(originalAsset.contentType) ||
          'image/png';

        updates.logo.square = {
          data: squareBuffer,
          mimeType: squareMime,
          size: squareBuffer.length,
          source: originalAsset.source || 'upload',
          uploadedAt: originalAsset.uploadedAt || new Date(),
          url: buildDataUrl({
            buffer: squareBuffer,
            mimeType: squareMime,
          }),
        };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ Failed to create square logo variant:', error);
      }
    }
  }

  if (updates.logo.square) {
    await optimizeLogoAsset(updates.logo.square);
  }
};

const bufferFromUnknown = (value) => {
  if (!value) return undefined;
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return undefined;
    }
    const dataUrlMatch = trimmed.match(/^data:(.*?);base64,(.*)$/);
    if (dataUrlMatch) {
      return Buffer.from(dataUrlMatch[2], 'base64');
    }
    const normalized = trimmed.replace(/\s+/g, '');
    if (/^[a-z0-9+/=]+$/i.test(normalized)) {
      try {
        return Buffer.from(normalized, 'base64');
      } catch (error) {
        return undefined;
      }
    }
    return undefined;
  }
  if (Array.isArray(value)) {
    return Buffer.from(value);
  }
  if (value?.type === 'Buffer' && Array.isArray(value.data)) {
    return Buffer.from(value.data);
  }
  if (value?.buffer && Buffer.isBuffer(value.buffer)) {
    return value.buffer;
  }
  return undefined;
};

const sanitizeLogoAssetForResponse = (asset) => {
  if (!asset) return undefined;
  const sanitized = { ...asset };
  const buffer = bufferFromUnknown(asset.data);
  if (buffer) {
    const mime =
      resolveString(sanitized.mimeType) ||
      resolveString(sanitized.contentType) ||
      'image/png';

    sanitized.mimeType = mime;
    sanitized.size = sanitized.size ?? buffer.length;

    if (!sanitized.url) {
      sanitized.url = buildDataUrl({ buffer, mimeType: mime });
    }
  }

  delete sanitized.data;
  delete sanitized.contentType;

  return sanitized;
};

const serializeBusiness = (businessDoc) => {
  if (!businessDoc) return businessDoc;

  const business =
    typeof businessDoc.toObject === 'function'
      ? businessDoc.toObject({ getters: true, virtuals: true })
      : { ...businessDoc };

  if (business.logo) {
    business.logo = { ...business.logo };
    if (business.logo.original) {
      business.logo.original = sanitizeLogoAssetForResponse(
        business.logo.original
      );
    }
    if (business.logo.square) {
      business.logo.square = sanitizeLogoAssetForResponse(
        business.logo.square
      );
    }
  }

  business.logoUrl =
    business.logo?.square?.url ||
    business.logo?.original?.url ||
    business.logoUrl ||
    null;

  return business;
};

const buildLogoAsset = (rawAsset) => {
  if (!rawAsset) return undefined;

  let url = resolveString(
    typeof rawAsset === 'string' ? rawAsset : rawAsset?.url
  );

  const dataBuffer =
    bufferFromUnknown(rawAsset?.data) ||
    bufferFromUnknown(rawAsset?.buffer) ||
    bufferFromUnknown(rawAsset?.base64) ||
    (typeof rawAsset === 'string' ? bufferFromUnknown(rawAsset) : undefined) ||
    bufferFromUnknown(rawAsset?.url);

  if (!url && dataBuffer) {
    const mime =
      resolveString(rawAsset?.mimeType) ||
      resolveString(rawAsset?.contentType) ||
      'image/png';
    url = buildDataUrl({ buffer: dataBuffer, mimeType: mime });
  }

  if (!url && !dataBuffer) {
    return undefined;
  }

  const asset = {};
  if (url) {
    asset.url = url;
  }
  if (dataBuffer) {
    asset.data = dataBuffer;
    asset.size = dataBuffer.length;
  }

  const stringProps = [
    ['mimeType', ['mimeType', 'contentType']],
    ['storageKey', ['storageKey']],
    ['altText', ['altText']],
    ['source', ['source']],
  ];

  stringProps.forEach(([target, keys]) => {
    for (const key of keys) {
      const value = resolveString(rawAsset?.[key]);
      if (value) {
        asset[target] = value;
        break;
      }
    }
  });

  if (!asset.source) {
    asset.source = dataBuffer ? 'upload' : 'url';
  }

  ['size', 'width', 'height'].forEach((prop) => {
    const rawValue = rawAsset?.[prop];
    if (Number.isFinite(rawValue)) {
      asset[prop] = Number(rawValue);
    }
  });

  if (rawAsset?.uploadedAt) {
    const uploadedAt = new Date(rawAsset.uploadedAt);
    if (!Number.isNaN(uploadedAt.valueOf())) {
      asset.uploadedAt = uploadedAt;
    }
  }

  return asset;
};

const normalizeLogoInput = ({ logo, logoUrl }) => {
  const updates = {};
  let originalAsset;
  let squareAsset;

  if (typeof logo === 'string') {
    originalAsset = buildLogoAsset(logo);
  } else if (logo && typeof logo === 'object') {
    originalAsset = buildLogoAsset(logo.original ?? logo.url ?? logo);
    squareAsset = buildLogoAsset(logo.square);
  }

  let fallbackUrl =
    typeof logoUrl === 'string' ? logoUrl.trim() : undefined;
  if (!fallbackUrl && !originalAsset && typeof logo === 'string') {
    fallbackUrl = logo.trim();
  }

  if (!originalAsset && !squareAsset && fallbackUrl) {
    originalAsset = buildLogoAsset({ url: fallbackUrl });
  }

  if (logo === null || logo === undefined || logo === '') {
    updates.logo = undefined;
  } else if (originalAsset || squareAsset) {
    updates.logo = {
      updatedAt: new Date(),
    };
    if (originalAsset) {
      updates.logo.original = originalAsset;
      fallbackUrl = fallbackUrl || originalAsset.url;
    }
    if (squareAsset) {
      updates.logo.square = squareAsset;
      fallbackUrl = squareAsset.url || fallbackUrl;
    }
    if (logo?.dominantColor) {
      updates.logo.dominantColor = logo.dominantColor.trim();
    }
    if (logo?.altText) {
      updates.logo.altText = logo.altText.trim();
    }
  }

  if (logoUrl === null || logoUrl === undefined || logoUrl === '') {
    updates.logoUrl = undefined;
  } else if (fallbackUrl) {
    updates.logoUrl = fallbackUrl;
  }

  return updates;
};

exports.listBusinesses = catchAsync(async (req, res) => {
  let filter = {};

  if (req.user.userType === 'employer') {
    const accessibleIds = await getAccessibleBusinessIds(req.user);

    if (!accessibleIds.size) {
      return res.status(200).json({ status: 'success', results: 0, data: [] });
    }

    filter._id = { $in: Array.from(accessibleIds) };
  } else if (req.user.userType === 'admin' && req.query.ownerId) {
    // Admins can query any employer’s businesses
    filter.owner = req.query.ownerId;
  }

  const businesses = await Business.find(filter);
  const responseBusinesses = businesses.map(serializeBusiness);

  res.status(200).json({
    status: 'success',
    results: responseBusinesses.length,
    data: responseBusinesses,
  });
});




exports.createBusiness = catchAsync(async (req, res) => {
  if (req.user.userType !== 'employer') {
    throw new AppError('Only employers can create businesses', 403);
  }

  // Process address data from frontend
  let addressData = {};
  if (req.body.address) {
    const addr = req.body.address;
    addressData = {
      line1: addr.street || addr.line1,
      city: addr.city,
      state: addr.state,
      postalCode: addr.zip || addr.postalCode,
      country: addr.country || 'US' // Default to US
    };
  }

  // Process location data if provided
  let locationData = null;
  if (req.body.location) {
    locationData = {
      ...req.body.location,
      // Merge address data into location for consistency
      ...addressData,
      setBy: req.user._id,
      setAt: new Date()
    };

    // Validate required GPS coordinates if provided
    if (locationData.latitude && locationData.longitude) {
      if (locationData.latitude < -90 || locationData.latitude > 90) {
        throw new AppError('Invalid latitude. Must be between -90 and 90', 400);
      }
      if (locationData.longitude < -180 || locationData.longitude > 180) {
        throw new AppError('Invalid longitude. Must be between -180 and 180', 400);
      }
    }

    // Validate allowed radius if provided
    if (locationData.allowedRadius !== undefined) {
      if (locationData.allowedRadius < 10 || locationData.allowedRadius > 5000) {
        throw new AppError('Allowed radius must be between 10 and 5000 meters', 400);
      }
    }
  } else if (Object.keys(addressData).length > 0) {
    // If no location but we have address data, create basic location
    locationData = {
      ...addressData,
      setBy: req.user._id,
      setAt: new Date()
    };
  }

  const businessData = {
    ...req.body,
    owner: req.user._id,
    location: locationData
  };

  // Remove the nested address object since we've processed it
  delete businessData.address;

  const logoUpdates = normalizeLogoInput({
    logo: req.body.logo,
    logoUrl: req.body.logoUrl,
  });

  await optimizeLogoUpdates(logoUpdates);

  if (Object.prototype.hasOwnProperty.call(businessData, 'logo')) {
    delete businessData.logo;
  }

  if (Object.prototype.hasOwnProperty.call(businessData, 'logoUrl')) {
    delete businessData.logoUrl;
  }

  if ('logo' in logoUpdates) {
    if (logoUpdates.logo) {
      businessData.logo = logoUpdates.logo;
    }
  }
  if ('logoUrl' in logoUpdates) {
    if (logoUpdates.logoUrl) {
      businessData.logoUrl = logoUpdates.logoUrl;
    } else {
      delete businessData.logoUrl;
    }
  }

  const business = await Business.create(businessData);
  const responseBusiness = serializeBusiness(business);

  res.status(201).json({
    status: 'success',
    data: responseBusiness,
    message: locationData?.latitude && locationData?.longitude 
      ? 'Business created with GPS location for attendance tracking'
      : 'Business created successfully'
  });
});

exports.updateBusiness = catchAsync(async (req, res) => {
  const { business } = await ensureBusinessAccess({
    user: req.user,
    businessId: req.params.businessId,
    requiredPermissions: 'edit_business',
  });

  // Process address data from frontend
  let addressData = {};
  if (req.body.address) {
    const addr = req.body.address;
    addressData = {
      line1: addr.street || addr.line1,
      city: addr.city,
      state: addr.state,
      postalCode: addr.zip || addr.postalCode,
      country: addr.country || 'US' // Default to US
    };
  }

  // Process location data if being updated
  let updateData = { ...req.body };
  
  if (req.body.location) {
    const locationData = {
      ...req.body.location,
      // Merge address data into location for consistency
      ...addressData,
      setBy: req.user._id,
      setAt: new Date()
    };

    // Validate GPS coordinates if provided
    if (locationData.latitude && locationData.longitude) {
      if (locationData.latitude < -90 || locationData.latitude > 90) {
        throw new AppError('Invalid latitude. Must be between -90 and 90', 400);
      }
      if (locationData.longitude < -180 || locationData.longitude > 180) {
        throw new AppError('Invalid longitude. Must be between -180 and 180', 400);
      }
    }

    // Validate allowed radius if provided
    if (locationData.allowedRadius !== undefined) {
      if (locationData.allowedRadius < 10 || locationData.allowedRadius > 5000) {
        throw new AppError('Allowed radius must be between 10 and 5000 meters', 400);
      }
    }

    updateData.location = locationData;
  } else if (Object.keys(addressData).length > 0) {
    // If no location but we have address data, merge with existing location
    updateData.location = {
      ...business.location?.toObject(),
      ...addressData,
      setBy: req.user._id,
      setAt: new Date()
    };
  }

  // Remove the nested address object since we've processed it
  delete updateData.address;

  const logoUpdates = normalizeLogoInput({
    logo: updateData.logo,
    logoUrl: updateData.logoUrl,
  });

  await optimizeLogoUpdates(logoUpdates);

  if (Object.prototype.hasOwnProperty.call(updateData, 'logo')) {
    delete updateData.logo;
  }
  if (Object.prototype.hasOwnProperty.call(updateData, 'logoUrl')) {
    delete updateData.logoUrl;
  }

  Object.assign(business, updateData);

  if ('logo' in logoUpdates) {
    business.logo = logoUpdates.logo;
    if (business.logo) {
      business.logo.updatedAt = new Date();
    }
  }
  if ('logoUrl' in logoUpdates) {
    business.logoUrl = logoUpdates.logoUrl || undefined;
  }

  await business.save();

  const responseBusiness = serializeBusiness(business);

  res.status(200).json({
    status: 'success',
    data: responseBusiness,
    message: business.location?.latitude && business.location?.longitude 
      ? 'Business updated with GPS location for attendance tracking'
      : 'Business updated successfully'
  });
});

exports.uploadBusinessLogo = catchAsync(async (req, res, next) => {
  if (!req.file) {
    throw new AppError('Logo file is required', 400);
  }

  const { business } = await ensureBusinessAccess({
    user: req.user,
    businessId: req.params.businessId,
    requiredPermissions: 'edit_business',
  });

  const { buffer, mimetype } = req.file;
  if (!mimetype.startsWith('image/')) {
    throw new AppError('Only image uploads are supported', 400);
  }

  // Create optimized original and a square variant
  try {
    // Optimized original: resize down to max width 1024 while preserving aspect
    const optimizedOriginalBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1024, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Square variant for avatars/cards
    const squareBuffer = await sharp(buffer)
      .rotate()
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const now = new Date();

    business.logo = business.logo || {};
    business.logo.original = {
      data: optimizedOriginalBuffer,
      mimeType: 'image/webp',
      size: optimizedOriginalBuffer.length,
      source: 'upload',
      uploadedAt: now,
      url: buildDataUrl({ buffer: optimizedOriginalBuffer, mimeType: 'image/webp' }),
    };

    business.logo.square = {
      data: squareBuffer,
      mimeType: 'image/webp',
      size: squareBuffer.length,
      source: 'upload',
      uploadedAt: now,
      url: buildDataUrl({ buffer: squareBuffer, mimeType: 'image/webp' }),
    };

    business.logo.updatedAt = now;
    business.logoUrl = business.logo.square.url;

    await business.save();

    const responseLogo = sanitizeLogoAssetForResponse(
      business.logo?.square?.toObject?.() ?? business.logo?.square
    );

    res.status(200).json({
      status: 'success',
      data: {
        logo: responseLogo,
      },
      message: 'Logo uploaded and optimized successfully',
    });
  } catch (err) {
    console.error('Error processing logo upload:', err);
    throw new AppError('Failed to process uploaded image', 500);
  }
});

exports.getBusinessLogo = catchAsync(async (req, res) => {
  const variant =
    req.query.variant && req.query.variant.toLowerCase() === 'square'
      ? 'square'
      : 'original';

  const business = await Business.findById(req.params.businessId).select(
    '+logo.original.data +logo.square.data +logo.original.mimeType +logo.square.mimeType +logo.original.url +logo.square.url +logo.original.size +logo.square.size +logo.original.source +logo.square.source +logoUrl'
  );

  if (!business?.logo) {
    throw new AppError('Logo not found for this business', 404);
  }

  const asset =
    variant === 'square'
      ? business.logo.square || business.logo.original
      : business.logo.original || business.logo.square;

  if (!asset) {
    throw new AppError('Logo not found for this business', 404);
  }

  let buffer = bufferFromUnknown(asset.data) || bufferFromUnknown(asset.url);
  const mime =
    resolveString(asset.mimeType) ||
    resolveString(asset.contentType) ||
    'image/png';

  const dataUrl =
    asset.url ||
    (buffer ? buildDataUrl({ buffer, mimeType: mime }) : business.logoUrl);

  const size = asset.size ?? (buffer ? buffer.length : undefined);
  const source = asset.source || (buffer ? 'upload' : 'url');

  const prefersRaw =
    req.query.format === 'raw' ||
    (req.accepts('image/*') && !req.accepts('application/json'));

  if (prefersRaw && buffer) {
    res.set('Content-Type', mime);
    if (size) {
      res.set('Content-Length', size);
    }
    return res.send(buffer);
  }

  if (prefersRaw && !buffer && dataUrl && /^https?:\/\//i.test(dataUrl)) {
    return res.redirect(dataUrl);
  }

  // As a fallback for raw requests without stored buffer, try to decode from inline data URL
  if (prefersRaw && !buffer && dataUrl) {
    buffer = bufferFromUnknown(dataUrl);
    if (buffer) {
      res.set('Content-Type', mime);
      res.set('Content-Length', buffer.length);
      return res.send(buffer);
    }
  }

  const payloadLogo = sanitizeLogoAssetForResponse(
    asset.toObject?.() ?? asset
  );

  res.status(200).json({
    status: 'success',
    data: {
      url: payloadLogo?.url || null,
      mimeType: payloadLogo?.mimeType || mime || null,
      size: payloadLogo?.size ?? size ?? null,
      source,
      variant,
    },
  });
});

exports.deleteBusiness = catchAsync(async (req, res) => {
  const { business, isOwner } = await ensureBusinessAccess({
    user: req.user,
    businessId: req.params.businessId,
    requiredPermissions: 'delete_business',
  });

  const totalBusinesses = await Business.countDocuments({ owner: req.user._id });
  if (isOwner && totalBusinesses <= 1) {
    throw new AppError('Employers must keep at least one business location', 400);
  }
  await business.deleteOne();
  await TeamMember.deleteMany({ business: business._id });
  res.status(204).end();
});

exports.selectBusiness = catchAsync(async (req, res) => {
  const { business } = await ensureBusinessAccess({
    user: req.user,
    businessId: req.params.businessId,
    requiredPermissions: 'view_business_profile',
  });
  const responseBusiness = serializeBusiness(business);
  res
    .status(200)
    .json({ status: 'success', data: { selectedBusiness: responseBusiness } });
});

exports.manageTeamMember = {
  list: catchAsync(async (req, res) => {
    const { business } = await ensureBusinessAccess({
      user: req.user,
      businessId: req.params.businessId,
      requiredPermissions: 'view_team_members',
    });
    const members = await TeamMember.find({ business: business._id }).populate('user', 'firstName lastName email phone');
    res.status(200).json({ status: 'success', data: members });
  }),
  create: catchAsync(async (req, res) => {
    const { business } = await ensureBusinessAccess({
      user: req.user,
      businessId: req.params.businessId,
      requiredPermissions: 'invite_team_members',
    });
    
    console.log('🔄 Creating team member with request body:', req.body);
    
    const { email, name, role, permissions } = req.body;
    
    if (!email) {
      throw new AppError('Email is required', 400);
    }
    
    console.log(`📧 Looking for user with email: ${email}`);
    const normalizedEmail = email.toLowerCase();

    if (req.user.email && normalizedEmail === req.user.email.toLowerCase()) {
      throw new AppError('You already have primary access to this business and cannot invite yourself as a team member.', 400);
    }
    
    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      console.log('👤 User not found, creating new user');
      // Create a placeholder user for the invitation
      user = await User.create({
        email: normalizedEmail,
        firstName: name ? name.split(' ')[0] : email.split('@')[0],
        lastName: name ? name.split(' ').slice(1).join(' ') : '',
        userType: 'employer', // Default type for team members
        password: 'temp_password_' + Math.random().toString(36).substring(7), // Temporary password
        // Note: User should be prompted to set a real password when they first log in
      });
      console.log('✅ Created new user:', user._id);
    } else {
      console.log('✅ Found existing user:', user._id);
    }
    
    // Check if team member already exists
    const existingMember = await TeamMember.findOne({
      business: business._id,
      user: user._id
    });
    
    if (user && user._id?.toString() === req.user._id?.toString()) {
      throw new AppError('You already have primary access to this business and cannot invite yourself as a team member.', 400);
    }

    if (existingMember) {
      throw new AppError('User is already a team member of this business', 400);
    }
    
    console.log('🔄 Creating team member record');
    
    const member = await TeamMember.create({
      business: business._id,
      user: user._id,
      name: name || `${user.firstName} ${user.lastName}`.trim(),
      email: normalizedEmail,
      role: role || 'staff',
      permissions: permissions || [],
      isActive: true
    });
    
    console.log('✅ Created team member:', member._id);
    
    // Populate the user data before sending response
    await member.populate('user', 'firstName lastName email');
    
    console.log('📤 Sending response with populated member data');

    const inviterName = req.user.fullName || req.user.firstName || req.user.email;
    await notificationService.sendSafeNotification({
      recipient: member.user._id || member.user,
      type: 'team_invite',
      priority: 'medium',
      title: `You've been added to ${business.name}`,
      message: `${inviterName || 'A team owner'} added you to ${business.name} as ${member.role}.`,
      metadata: {
        businessId: business._id,
        teamMemberId: member._id,
        permissions: member.permissions,
        role: member.role
      },
      senderUserId: req.user._id
    });
    
    res.status(201).json({ status: 'success', data: member });
  }),
  update: catchAsync(async (req, res) => {
    const { business } = await ensureBusinessAccess({
      user: req.user,
      businessId: req.params.businessId,
      requiredPermissions: 'edit_team_members',
    });
    const member = await TeamMember.findOneAndUpdate(
      { business: business._id, _id: req.params.memberId },
      req.body,
      { new: true }
    );
    if (!member) {
      throw new AppError('Team member not found', 404);
    }
    res.status(200).json({ status: 'success', data: member });
  }),
  remove: catchAsync(async (req, res) => {
    const { business } = await ensureBusinessAccess({
      user: req.user,
      businessId: req.params.businessId,
      requiredPermissions: 'remove_team_members',
    });
    const deleted = await TeamMember.findOneAndDelete({
      business: business._id,
      _id: req.params.memberId
    });
    if (!deleted) {
      throw new AppError('Team member not found', 404);
    }
    res.status(204).json({ status: 'success' });
  })
};
