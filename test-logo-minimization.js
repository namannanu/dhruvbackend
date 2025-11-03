/**
 * Logo URL Minimization Test
 * Demonstrates how logo URLs are minimized for faster API responses
 */

const { minimizeForContext, getLogoUrlVariants, minimizeLogoUrl } = require('./src/shared/utils/logoUrlMinimizer');

console.log('🎨 === LOGO URL MINIMIZATION DEMO ===\n');

// Example logo URLs from different services
const testUrls = [
  {
    service: 'Cloudinary',
    url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  },
  {
    service: 'AWS S3',
    url: 'https://my-bucket.s3.amazonaws.com/logos/company-logo.png'
  },
  {
    service: 'Firebase Storage',
    url: 'https://firebasestorage.googleapis.com/v0/b/project/o/logo.jpg?alt=media&token=abc123'
  },
  {
    service: 'Generic URL',
    url: 'https://example.com/images/logo.png'
  }
];

testUrls.forEach(({ service, url }) => {
  console.log(`📋 ${service} URL Optimization:`);
  console.log(`Original: ${url}`);
  console.log(`Job List (Small): ${minimizeForContext(url, 'job-list')}`);
  console.log(`Job Detail (Medium): ${minimizeForContext(url, 'job-detail')}`);
  console.log(`Business Profile: ${minimizeForContext(url, 'business-profile')}`);
  console.log(`Notification (Tiny): ${minimizeForContext(url, 'notification')}`);
  console.log('');
});

console.log('🔧 === LOGO URL VARIANTS ===\n');

const sampleLogo = 'https://res.cloudinary.com/demo/image/upload/company-logo.jpg';
const variants = getLogoUrlVariants(sampleLogo);

console.log('Logo URL Variants for different use cases:');
Object.entries(variants).forEach(([size, url]) => {
  console.log(`${size.toUpperCase()}: ${url}`);
});

console.log('\n💡 === SIZE COMPARISON ===\n');

const originalUrl = 'https://res.cloudinary.com/demo/image/upload/v1234567890/very-long-folder-name/another-folder/company-logo-high-resolution.jpg';
const minimizedUrl = minimizeForContext(originalUrl, 'job-list');

console.log(`Original URL Length: ${originalUrl.length} characters`);
console.log(`Minimized URL Length: ${minimizedUrl.length} characters`);
console.log(`Size Reduction: ${((originalUrl.length - minimizedUrl.length) / originalUrl.length * 100).toFixed(1)}%`);

console.log('\n✅ === BENEFITS ===');
console.log('• Faster API responses due to smaller payload');
console.log('• Optimized image loading with appropriate sizes');
console.log('• Reduced bandwidth usage');
console.log('• Better user experience with faster page loads');
console.log('• Automatic format optimization (WebP when supported)');

console.log('\n🚀 Logo URL minimization demo completed!');