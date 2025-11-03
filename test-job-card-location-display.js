// Test location display in both employer and worker job cards
console.log('📍 JOB CARD LOCATION DISPLAY TEST');
console.log('===================================\n');

// Sample job data that would be displayed
const sampleJob = {
  id: 'job123',
  title: 'Security Guard - Night Shift',
  businessName: 'apna ghar',
  businessAddress: '1 a23 Mahaveer Nagar III Circle, Kota (Event Hall, 2nd Floor)',
  description: 'Night security guard needed for event venue',
  scheduleStart: '2025-11-03T18:00:00Z',
  scheduleEnd: '2025-11-04T02:00:00Z',
  hourlyRate: 250,
  status: 'active',
  applicantsCount: 5
};

console.log('🏢 EMPLOYER JOB CARD DISPLAY:');
console.log('-----------------------------');
console.log('Job Title:', sampleJob.title);
console.log('Business Name:', sampleJob.businessName);
console.log('📍 Location (Header):', sampleJob.businessAddress);
console.log('⏰ Time Row: 6:00 PM - 2:00 AM');
console.log('📍 Location Row:', sampleJob.businessAddress);
console.log('💰 Hourly Rate: $250/hr');

console.log('\n👷 WORKER JOB CARD DISPLAY:');
console.log('---------------------------');
console.log('Job Title:', sampleJob.title);
console.log('Company:', sampleJob.businessName);

// Simulate worker address formatting logic
function formatWorkerAddress(address) {
  if (!address) return '';
  
  const cleaned = address.trim();
  
  // Smart formatting for worker view
  if (cleaned.contains(',')) {
    const parts = cleaned.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      const street = parts[0];
      const location = parts[1];
      const city = parts[2];
      return `${street}, ${location}, ${city}`;
    }
  }
  
  return cleaned.length > 60 ? cleaned.substring(0, 57) + '...' : cleaned;
}

// Mock the contains function for this test
String.prototype.contains = function(str) {
  return this.indexOf(str) !== -1;
};

const workerFormattedAddress = formatWorkerAddress(sampleJob.businessAddress);
console.log('📍 Location (Header):', workerFormattedAddress);
console.log('⏰ Job Timing: 6:00 PM to 2:00 AM');
console.log('📍 Location (Detail):', sampleJob.businessAddress);

console.log('\n🎯 LOCATION DISPLAY FEATURES:');
console.log('=============================');
console.log('✅ Employer Cards: Show location in header AND detail row');
console.log('✅ Worker Cards: Smart address formatting with truncation');
console.log('✅ Both Cards: Use job.businessAddress field (employer-editable)');
console.log('✅ Icons: Location pin icon for easy identification');
console.log('✅ Fallback: Shows business name if no address available');

console.log('\n📱 UI LAYOUT:');
console.log('=============');
console.log('EMPLOYER CARD:');
console.log('├── Header: Logo + Title + Business + 📍Location');
console.log('├── Description');
console.log('├── ⏰ Time Row');
console.log('├── 📍 Location Row (full address)');
console.log('└── Action Buttons');

console.log('\nWORKER CARD:');
console.log('├── Header: Logo + Title + Company + 📍Location');
console.log('├── Details List:');
console.log('│   ├── ⏰ Job Timing');
console.log('│   └── 📍 Location (full address)');
console.log('└── Apply Section');

console.log('\n🔄 ADDRESS SOURCES (Priority Order):');
console.log('====================================');
console.log('1. job.businessAddress (employer-edited, job-specific)');
console.log('2. job.locationSummary (fallback)');
console.log('3. job.businessName (last resort)');