/**
 * Profile Image Minimization Test
 * Demonstrates how profile images are minimized for employers and workers
 */

const { minimizeProfileImages, minimizeForContext } = require('./src/shared/utils/logoUrlMinimizer');

console.log('👤 === PROFILE IMAGE MINIMIZATION DEMO ===\n');

// Example employer profile with images
const employerProfile = {
  _id: 'emp123',
  companyName: 'Tech Solutions Inc',
  description: 'Leading technology company',
  profilePicture: 'https://res.cloudinary.com/demo/image/upload/employer-profile.jpg',
  companyLogo: 'https://res.cloudinary.com/demo/image/upload/company-logo-high-res.jpg',
  rating: 4.8,
  totalJobsPosted: 25,
  toObject: () => employerProfile
};

console.log('🏢 === EMPLOYER PROFILE OPTIMIZATION ===');
console.log('Original Employer Profile Images:');
console.log(`Profile Picture: ${employerProfile.profilePicture}`);
console.log(`Company Logo: ${employerProfile.companyLogo}`);
console.log('');

const optimizedEmployerProfile = minimizeProfileImages(employerProfile, 'employer');
console.log('Optimized Employer Profile Images:');
console.log(`Profile Picture Small (Avatar): ${optimizedEmployerProfile.profilePictureSmall}`);
console.log(`Profile Picture Medium (Profile): ${optimizedEmployerProfile.profilePictureMedium}`);
console.log(`Company Logo Small: ${optimizedEmployerProfile.companyLogoSmall}`);
console.log(`Company Logo Large: ${optimizedEmployerProfile.companyLogoLarge}`);
console.log('');

// Example worker profile with images
const workerProfile = {
  _id: 'worker123',
  bio: 'Experienced software developer',
  skills: ['JavaScript', 'React', 'Node.js'],
  profilePicture: 'https://res.cloudinary.com/demo/image/upload/worker-profile.jpg',
  portfolioImages: [
    'https://res.cloudinary.com/demo/image/upload/portfolio-1.jpg',
    'https://res.cloudinary.com/demo/image/upload/portfolio-2.jpg',
    'https://res.cloudinary.com/demo/image/upload/portfolio-3.jpg'
  ],
  rating: 4.9,
  completedJobs: 15,
  toObject: () => workerProfile
};

console.log('👷 === WORKER PROFILE OPTIMIZATION ===');
console.log('Original Worker Profile Images:');
console.log(`Profile Picture: ${workerProfile.profilePicture}`);
console.log('Portfolio Images:');
workerProfile.portfolioImages.forEach((img, index) => {
  console.log(`  ${index + 1}. ${img}`);
});
console.log('');

const optimizedWorkerProfile = minimizeProfileImages(workerProfile, 'worker');
console.log('Optimized Worker Profile Images:');
console.log(`Profile Picture Small (Avatar): ${optimizedWorkerProfile.profilePictureSmall}`);
console.log(`Profile Picture Medium (Profile): ${optimizedWorkerProfile.profilePictureMedium}`);
console.log('Portfolio Thumbnails:');
optimizedWorkerProfile.portfolioThumbnails.forEach((img, index) => {
  console.log(`  ${index + 1}. ${img}`);
});
console.log('Portfolio Previews:');
optimizedWorkerProfile.portfolioPreviews.forEach((img, index) => {
  console.log(`  ${index + 1}. ${img}`);
});
console.log('');

console.log('🎯 === CONTEXT-SPECIFIC OPTIMIZATION ===');
const testImage = 'https://res.cloudinary.com/demo/image/upload/test-image.jpg';

console.log('Different contexts for the same image:');
console.log(`Original: ${testImage}`);
console.log(`Job List (50x50): ${minimizeForContext(testImage, 'job-list')}`);
console.log(`Employer Avatar (60x60): ${minimizeForContext(testImage, 'employer-avatar')}`);
console.log(`Worker Avatar (60x60): ${minimizeForContext(testImage, 'worker-avatar')}`);
console.log(`Employer Profile (120x120): ${minimizeForContext(testImage, 'employer-profile')}`);
console.log(`Worker Profile (120x120): ${minimizeForContext(testImage, 'worker-profile')}`);
console.log(`Company Logo Small (80x80): ${minimizeForContext(testImage, 'company-logo-small')}`);
console.log(`Company Logo Large (200x200): ${minimizeForContext(testImage, 'company-logo-large')}`);
console.log(`Portfolio Thumbnail (150x150): ${minimizeForContext(testImage, 'portfolio-thumbnail')}`);
console.log(`Portfolio Preview (300x300): ${minimizeForContext(testImage, 'portfolio-preview')}`);
console.log(`Notification (24x24): ${minimizeForContext(testImage, 'notification')}`);
console.log('');

console.log('📊 === API RESPONSE STRUCTURE ===');

console.log('Employer Profile API Response:');
console.log(JSON.stringify({
  status: 'success',
  data: {
    _id: optimizedEmployerProfile._id,
    companyName: optimizedEmployerProfile.companyName,
    profilePictureSmall: optimizedEmployerProfile.profilePictureSmall,
    profilePictureMedium: optimizedEmployerProfile.profilePictureMedium,
    companyLogoSmall: optimizedEmployerProfile.companyLogoSmall,
    companyLogoLarge: optimizedEmployerProfile.companyLogoLarge,
    rating: optimizedEmployerProfile.rating,
    totalJobsPosted: optimizedEmployerProfile.totalJobsPosted
  }
}, null, 2));

console.log('\nWorker Profile API Response:');
console.log(JSON.stringify({
  status: 'success',
  data: {
    user: { _id: 'user123', firstName: 'John', lastName: 'Doe' },
    profile: {
      _id: optimizedWorkerProfile._id,
      bio: optimizedWorkerProfile.bio,
      skills: optimizedWorkerProfile.skills,
      profilePictureSmall: optimizedWorkerProfile.profilePictureSmall,
      profilePictureMedium: optimizedWorkerProfile.profilePictureMedium,
      portfolioThumbnails: optimizedWorkerProfile.portfolioThumbnails,
      portfolioPreviews: optimizedWorkerProfile.portfolioPreviews,
      rating: optimizedWorkerProfile.rating,
      completedJobs: optimizedWorkerProfile.completedJobs
    }
  }
}, null, 2));

console.log('\n✅ === PROFILE IMAGE BENEFITS ===');
console.log('• Faster profile loading times');
console.log('• Reduced bandwidth usage for profile views');
console.log('• Optimized portfolio image galleries');
console.log('• Context-appropriate image sizes');
console.log('• Better user experience on mobile devices');
console.log('• Reduced server costs for image delivery');

console.log('\n🚀 Profile image minimization demo completed!');