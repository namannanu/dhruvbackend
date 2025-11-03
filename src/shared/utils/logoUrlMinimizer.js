/**
 * Logo URL Minimizer Utility
 * Reduces logo URL size for faster API responses while maintaining quality
 */

/**
 * Minimize logo URL by adding compression parameters and optimizations
 * @param {string} logoUrl - Original logo URL
 * @param {Object} options - Compression options
 * @returns {string} - Minimized logo URL
 */
const minimizeLogoUrl = (logoUrl, options = {}) => {
  if (!logoUrl) return null;
  
  const {
    width = 100,        // Default width for job listings
    height = 100,       // Default height for job listings
    quality = 75,       // Quality percentage (75% gives good balance)
    format = 'webp'     // Modern format for smaller file sizes
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
 * Minimize Cloudinary URLs with transformation parameters
 */
const minimizeCloudinaryUrl = (url, { width, height, quality, format }) => {
  if (url.includes('/image/upload/')) {
    // Insert transformation parameters after /image/upload/
    const transformations = [
      `w_${width}`,
      `h_${height}`,
      `q_${quality}`,
      `f_${format}`,
      'c_fill'  // Crop to fill the dimensions
    ].join(',');
    
    return url.replace(
      '/image/upload/',
      `/image/upload/${transformations}/`
    );
  }
  return url;
};

/**
 * Minimize AWS S3 URLs (if using image processing service)
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
 * Minimize Firebase Storage URLs
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
 * Add generic compression parameters
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
 * Get different sized logo URLs for different use cases
 */
const getLogoUrlVariants = (logoUrl) => {
  if (!logoUrl) return null;
  
  return {
    // For job cards in lists
    small: minimizeLogoUrl(logoUrl, { width: 50, height: 50, quality: 70 }),
    
    // For job details page
    medium: minimizeLogoUrl(logoUrl, { width: 100, height: 100, quality: 75 }),
    
    // For employer profile
    large: minimizeLogoUrl(logoUrl, { width: 200, height: 200, quality: 80 }),
    
    // Tiny for notifications/badges
    tiny: minimizeLogoUrl(logoUrl, { width: 24, height: 24, quality: 60 }),
    
    // Original URL (for editing/admin purposes)
    original: logoUrl
  };
};

/**
 * Minimize logo URL for specific context
 */
const minimizeForContext = (logoUrl, context = 'default') => {
  if (!logoUrl) return null;
  
  const contexts = {
    'job-list': { width: 50, height: 50, quality: 70 },
    'job-detail': { width: 100, height: 100, quality: 75 },
    'business-profile': { width: 150, height: 150, quality: 80 },
    'notification': { width: 24, height: 24, quality: 60 },
    'employer-profile': { width: 120, height: 120, quality: 80 },
    'worker-profile': { width: 120, height: 120, quality: 80 },
    'employer-avatar': { width: 60, height: 60, quality: 75 },
    'worker-avatar': { width: 60, height: 60, quality: 75 },
    'company-logo-small': { width: 80, height: 80, quality: 70 },
    'company-logo-large': { width: 200, height: 200, quality: 85 },
    'portfolio-thumbnail': { width: 150, height: 150, quality: 75 },
    'portfolio-preview': { width: 300, height: 300, quality: 80 },
    'default': { width: 75, height: 75, quality: 75 }
  };
  
  const options = contexts[context] || contexts['default'];
  return minimizeLogoUrl(logoUrl, options);
};

/**
 * Minimize profile images for different use cases
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
      profileData.portfolioThumbnails = profileData.portfolioImages.map(img => 
        minimizeForContext(img, 'portfolio-thumbnail')
      );
      profileData.portfolioPreviews = profileData.portfolioImages.map(img => 
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
  minimizeFirebaseUrl
};