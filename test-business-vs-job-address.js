// Demonstrate the difference between business address vs job-specific address
console.log('🏢 BUSINESS vs JOB ADDRESS BEHAVIOR');
console.log('===================================\n');

// Business Profile (Permanent Data)
const businessProfile = {
  id: 'business123',
  name: 'apna ghar',
  address: '1 a23 Mahaveer Nagar III Circle, Kota, Rajasthan, 324005', // PERMANENT
  location: {
    formattedAddress: 'Mahaveer Nagar III Cir',
    line1: 'Mahaveer Nagar III Circle',
    city: 'Kota',
    state: 'Rajasthan',
    country: 'India',
    postalCode: '324005',
    latitude: 25.2138156,
    longitude: 75.8647527
  }
};

console.log('🏢 BUSINESS PROFILE (Permanent):');
console.log('Business Name:', businessProfile.name);
console.log('Business Address:', businessProfile.address);
console.log('Coordinates:', businessProfile.location.latitude, businessProfile.location.longitude);

console.log('\n📱 JOB CREATION WORKFLOW:');
console.log('------------------------');

// Step 1: Employer selects business in job creation
console.log('1️⃣ Employer selects business: "apna ghar"');
console.log('   Location field auto-fills:', businessProfile.address);

// Step 2: Employer edits address for this specific job
const jobSpecificAddress = '1 a23 Mahaveer Nagar III Circle, Kota (Event Hall, 2nd Floor)';
console.log('\n2️⃣ Employer edits address for this job:');
console.log('   Original business address:', businessProfile.address);
console.log('   Job-specific address:', jobSpecificAddress);

// Step 3: Job creation sends data to backend
const jobData = {
  title: 'Security Guard - Wedding Event',
  businessId: businessProfile.id,
  locationDescription: jobSpecificAddress, // TEMPORARY - only for this job
  // ... other job fields
};

console.log('\n3️⃣ Data sent to backend:');
console.log('   businessId:', jobData.businessId);
console.log('   locationDescription:', jobData.locationDescription);

// Step 4: Backend stores job with custom address
const jobStoredInDatabase = {
  id: 'job456',
  title: jobData.title,
  businessId: businessProfile.id,
  businessAddress: jobSpecificAddress, // Derived from locationDescription
  location: {
    // Coordinates preserved from business profile
    latitude: businessProfile.location.latitude,
    longitude: businessProfile.location.longitude,
    city: businessProfile.location.city,
    state: businessProfile.location.state,
    // ... other location data
  }
};

console.log('\n4️⃣ Job stored in database:');
console.log('   Job ID:', jobStoredInDatabase.id);
console.log('   Business Address (displayed):', jobStoredInDatabase.businessAddress);
console.log('   Coordinates (from business):', jobStoredInDatabase.location.latitude, jobStoredInDatabase.location.longitude);

// Step 5: Create another job with different address
const anotherJobAddress = '1 a23 Mahaveer Nagar III Circle, Kota (Main Reception)';
const anotherJob = {
  id: 'job789',
  title: 'Receptionist - Day Shift',
  businessId: businessProfile.id,
  businessAddress: anotherJobAddress, // Different address for different job
  location: {
    latitude: businessProfile.location.latitude, // Same coordinates
    longitude: businessProfile.location.longitude,
  }
};

console.log('\n5️⃣ Another job with different address:');
console.log('   Job ID:', anotherJob.id);
console.log('   Business Address:', anotherJob.businessAddress);
console.log('   Same business, same coordinates:', anotherJob.location.latitude);

console.log('\n🔍 VERIFICATION:');
console.log('================');
console.log('✅ Business profile address unchanged:', businessProfile.address);
console.log('✅ Job 1 address (custom):', jobStoredInDatabase.businessAddress);
console.log('✅ Job 2 address (different custom):', anotherJob.businessAddress);
console.log('✅ All jobs use same business coordinates for navigation');

console.log('\n🎯 KEY POINTS:');
console.log('==============');
console.log('🏢 Business Address: PERMANENT - stored in business profile');
console.log('📋 Job Address: TEMPORARY - only affects that specific job');
console.log('🗺️  Coordinates: Always from business profile for navigation');
console.log('👥 Workers: See job-specific address, navigate using business coordinates');
console.log('🔄 Next Job: Starts fresh with business address, can be edited again');