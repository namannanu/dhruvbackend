/**
 * Logo URL Minimizer Utility
 * Reduces logo payload size for faster API responses while maintaining quality.
 */

const sharp = require('sharp');

const DATA_URI_REGEX = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/;

const CONTEXT_OPTIONS = {
  'job-list': { width: 50, height: 50, quality: 70, format: 'webp' },
  'job-detail': { width: 100, height: 100, quality: 75, format: 'webp' },
  'business-profile': { width: 150, height: 150, quality: 80, format: 'webp' },
  notification: { width: 24, height: 24, quality: 60, format: 'webp' },
  'employer-profile': { width: 120, height: 120, quality: 80, format: 'webp' },
  'worker-profile': { width: 120, height: 120, quality: 80, format: 'webp' },
  'employer-avatar': { width: 60, height: 60, quality: 75, format: 'webp' },
  'worker-avatar': { width: 60, height: 60, quality: 75, format: 'webp' },
  'company-logo-small': { width: 80, height: 80, quality: 70, format: 'webp' },
  'company-logo-large': { width: 200, height: 200, quality: 85, format: 'webp' },
  'portfolio-thumbnail': { width: 150, height: 150, quality: 75, format: 'webp' },
  'portfolio-preview': { width: 300, height: 300, quality: 80, format: 'webp' },
  default: { width: 75, height: 75, quality: 75, format: 'webp' }
};

const resolveContextOptions = (context) =>
  CONTEXT_OPTIONS[context] || CONTEXT_OPTIONS.default;

const isDataUri = (value) => typeof value === 'string' && DATA_URI_REGEX.test(value);

/**
 * Minimize logo URL by adding compression parameters and optimizations.
 * Falls back to the original source when the URL is an inline data URI.
 * @param {string} logoUrl - Original logo URL
 * @param {Object} options - Compression options
 * @returns {string|null} - Minimized logo URL or original when minimization is not possible
 */
const minimizeLogoUrl = (logoUrl, options = {}) => {
  if (!logoUrl) return null;

  // Inline data URIs cannot be minimized with query parameters.
  if (isDataUri(logoUrl)) {
    return logoUrl;
  }

  const {
    width = 100, // Default width for job listings
    height = 100, // Default height for job listings
    quality = 75, // Quality percentage (75% gives good balance)
    format = 'webp' // Modern format for smaller file sizes
  } = options;

  try {
    // For different image hosting services, apply appropriate minimization

    // Cloudinary URLs
    if (logoUrl.includes('cloudinary.com')) {
      return minimizeCloudinaryUrl(logoUrl, { width, height, quality, format });
    }

    // AWS S3 URLs
    if (logoUrl.includes('amazonaws.com') || logoUrl.includes('s3.')) {
      return minimizeS3Url(logoUrl, { width, height, quality });
    }

    // Firebase Storage URLs
    if (logoUrl.includes('firebasestorage.googleapis.com')) {
      return minimizeFirebaseUrl(logoUrl, { width, height });
    }

    // Generic URL with query parameters
    return addGenericCompressionParams(logoUrl, { width, height, quality });
  } catch (error) {
    console.warn('Error minimizing logo URL:', error);
    return logoUrl; // Return original URL if minimization fails
  }
};

/**
 * Minimize Cloudinary URLs with transformation parameters.
 */
const minimizeCloudinaryUrl = (url, { width, height, quality, format }) => {
  if (url.includes('/image/upload/')) {
    // Insert transformation parameters after /image/upload/
    const transformations = [
      `w_${width}`,
      `h_${height}`,
      `q_${quality}`,
      `f_${format}`,
      'c_fill' // Crop to fill the dimensions
    ].join(',');

    return url.replace('/image/upload/', `/image/upload/${transformations}/`);
  }
  return url;
};

/**
 * Minimize AWS S3 URLs (if using image processing service).
 */
const minimizeS3Url = (url, { width, height, quality }) => {
  // If using AWS Lambda for image resizing or CloudFront with image processing
  const params = new URLSearchParams();
  params.append('w', width);
  params.append('h', height);
  params.append('q', quality);

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
};

/**
 * Minimize Firebase Storage URLs.
 */
const minimizeFirebaseUrl = (url, { width, height }) => {
  // Firebase doesn't support direct URL transformation
  // You'd need to use a cloud function or client-side resizing
  // For now, add size hints as parameters
  const params = new URLSearchParams();
  params.append('alt', 'media');
  params.append('w', width);
  params.append('h', height);

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
};

/**
 * Add generic compression parameters.
 */
const addGenericCompressionParams = (url, { width, height, quality }) => {
  const params = new URLSearchParams();
  params.append('w', width);
  params.append('h', height);
  params.append('q', quality);

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
};

/**
 * Generate a downsized data URI using sharp for the provided context options.
 */
const generateDataUriVariant = async (dataUri, { width, height, quality, format }) => {
  if (!isDataUri(dataUri)) return null;

  const match = DATA_URI_REGEX.exec(dataUri);
  if (!match) return null;

  const [, mimeType, base64Data] = match;
  const inputBuffer = Buffer.from(base64Data, 'base64');
  const transformer = sharp(inputBuffer).rotate();

  if (width || height) {
    transformer.resize({
      width,
      height,
      fit: sharp.fit.cover
    });
  }

  const targetFormat = (format || '').toLowerCase();
  const outputFormat = targetFormat === 'jpg' ? 'jpeg' : targetFormat || mimeType.split('/')[1] || 'png';

  let outputBuffer;
  switch (outputFormat) {
    case 'webp':
      outputBuffer = await transformer.webp({ quality }).toBuffer();
      break;
    case 'jpeg':
      outputBuffer = await transformer.jpeg({ quality, mozjpeg: true }).toBuffer();
      break;
    case 'png':
      outputBuffer = await transformer.png({
        compressionLevel: Math.max(0, Math.min(9, Math.round((100 - quality) / 10)))
      }).toBuffer();
      break;
    default:
      outputBuffer = await transformer.toBuffer();
  }

  const generatedMime =
    outputFormat === 'webp'
      ? 'image/webp'
      : outputFormat === 'jpeg'
      ? 'image/jpeg'
      : outputFormat === 'png'
      ? 'image/png'
      : mimeType;

  return `data:${generatedMime};base64,${outputBuffer.toString('base64')}`;
};

/**
 * Build optimized logo variants for the requested contexts. Supports both URLs and inline data URIs.
 */
const generateLogoVariants = async (logoSource, contexts = []) => {
  if (!logoSource) return {};

  const uniqueContexts = Array.from(new Set(contexts.length ? contexts : ['job-list', 'business-profile']));
  const variants = {};

  if (isDataUri(logoSource)) {
    for (const context of uniqueContexts) {
      const options = resolveContextOptions(context);
      try {
        const variant = await generateDataUriVariant(logoSource, options);
        if (variant) {
          variants[context] = variant;
        }
      } catch (error) {
        console.warn(`Failed to generate optimized inline logo for context "${context}":`, error);
        variants[context] = logoSource;
      }
    }
    return variants;
  }

  uniqueContexts.forEach((context) => {
    variants[context] = minimizeLogoUrl(logoSource, resolveContextOptions(context));
  });

  return variants;
};

/**
 * Get different sized logo URLs for different use cases.
 */
const getLogoUrlVariants = (logoUrl) => {
  if (!logoUrl) return null;

  if (isDataUri(logoUrl)) {
    return {
      small: logoUrl,
      medium: logoUrl,
      large: logoUrl,
      tiny: logoUrl,
      original: logoUrl
    };
  }

  return {
    // For job cards in lists
    small: minimizeLogoUrl(logoUrl, resolveContextOptions('job-list')),

    // For job details page
    medium: minimizeLogoUrl(logoUrl, resolveContextOptions('job-detail')),

    // For employer profile
    large: minimizeLogoUrl(logoUrl, resolveContextOptions('company-logo-large')),

    // Tiny for notifications/badges
    tiny: minimizeLogoUrl(logoUrl, resolveContextOptions('notification')),

    // Original URL (for editing/admin purposes)
    original: logoUrl
  };
};

/**
 * Minimize logo URL for specific context.
 */
const minimizeForContext = (logoUrl, context = 'default') => {
  if (!logoUrl) return null;
  if (isDataUri(logoUrl)) return logoUrl;

  const options = resolveContextOptions(context);
  return minimizeLogoUrl(logoUrl, options);
};

/**
 * Minimize profile images for different use cases.
 */
const minimizeProfileImages = (profile, profileType = 'worker') => {
  if (!profile) return null;

  const profileData = profile.toObject ? profile.toObject() : profile;

  if (profileType === 'employer') {
    // Handle employer profile images
    if (profileData.profilePicture) {
      profileData.profilePictureSmall = minimizeForContext(profileData.profilePicture, 'employer-avatar');
      profileData.profilePictureMedium = minimizeForContext(profileData.profilePicture, 'employer-profile');
      delete profileData.profilePicture; // Remove original to save bandwidth
    }

    if (profileData.companyLogo) {
      profileData.companyLogoSmall = minimizeForContext(profileData.companyLogo, 'company-logo-small');
      profileData.companyLogoLarge = minimizeForContext(profileData.companyLogo, 'company-logo-large');
      delete profileData.companyLogo; // Remove original to save bandwidth
    }
  } else if (profileType === 'worker') {
    // Handle worker profile images
    if (profileData.profilePicture) {
      profileData.profilePictureSmall = minimizeForContext(profileData.profilePicture, 'worker-avatar');
      profileData.profilePictureMedium = minimizeForContext(profileData.profilePicture, 'worker-profile');
      delete profileData.profilePicture; // Remove original to save bandwidth
    }

    if (profileData.portfolioImages && profileData.portfolioImages.length > 0) {
      profileData.portfolioThumbnails = profileData.portfolioImages.map((img) =>
        minimizeForContext(img, 'portfolio-thumbnail')
      );
      profileData.portfolioPreviews = profileData.portfolioImages.map((img) =>
        minimizeForContext(img, 'portfolio-preview')
      );
      delete profileData.portfolioImages; // Remove originals to save bandwidth
    }
  }

  return profileData;
};

module.exports = {
  minimizeLogoUrl,
  getLogoUrlVariants,
  minimizeForContext,
  minimizeProfileImages,
  minimizeCloudinaryUrl,
  minimizeS3Url,
  minimizeFirebaseUrl,
  generateLogoVariants,
  isDataUri
};
