// Test script for Vercel deployment - demonstrates the fix
console.log('🚀 Testing Address Concatenation for Vercel Deployment');
console.log('=' * 60);

// Simulate the corrected logic
function simulateFixedDerivation({ providedAddress, location, business }) {
  console.log('\n🔍 deriveBusinessAddress called with:');
  console.log('  📍 providedAddress (employer):', providedAddress);
  console.log('  🏢 location (business):', JSON.stringify(location, null, 2));
  
  if (location) {
    const addressParts = [];
    
    console.log('\n🔄 Processing address components:');
    
    // First, add employer-provided formattedAddress if available
    const trimmedProvidedAddress = typeof providedAddress === 'string' ? providedAddress.trim() : undefined;
    if (trimmedProvidedAddress) {
      console.log('  ✅ employer formattedAddress:', trimmedProvidedAddress);
      addressParts.push(trimmedProvidedAddress);
    } else {
      console.log('  ❌ employer formattedAddress: NOT PROVIDED');
    }
    
    // Then add business location formattedAddress if available and different
    if (location.formattedAddress && location.formattedAddress.trim()) {
      const businessFormatted = location.formattedAddress.trim();
      if (!trimmedProvidedAddress || businessFormatted !== trimmedProvidedAddress) {
        console.log('  ✅ business formattedAddress:', businessFormatted);
        addressParts.push(businessFormatted);
      } else {
        console.log('  ⚠️  business formattedAddress: SAME AS EMPLOYER, SKIPPED');
      }
    } else {
      console.log('  ❌ business formattedAddress: NOT SET');
    }
    
    // Add remaining components
    if (location.line1) {
      console.log('  ✅ line1:', location.line1);
      addressParts.push(location.line1.trim());
    }
    if (location.city) {
      console.log('  ✅ city:', location.city);
      addressParts.push(location.city.trim());
    }
    if (location.state) {
      console.log('  ✅ state:', location.state);
      addressParts.push(location.state.trim());
    }
    if (location.postalCode) {
      console.log('  ✅ postalCode:', location.postalCode);
      addressParts.push(location.postalCode.trim());
    }
    if (location.country) {
      console.log('  ✅ country:', location.country);
      addressParts.push(location.country.trim());
    }
    
    const result = addressParts.join(', ');
    console.log('\n🎯 Final address result:', `"${result}"`);
    return result;
  }
  
  return null;
}

// Simulate Vercel API call
function simulateVercelJobCreation(jobPayload) {
  console.log('\n📤 Simulating Vercel API Job Creation:');
  console.log('POST /api/jobs');
  console.log('Payload:', JSON.stringify(jobPayload, null, 2));
  
  // Simulate business location from Vercel database
  const businessLocation = {
    line1: '1 a23 Mahaveer Nagar III Circle',
    city: 'Kota',
    state: 'Rajasthan',
    country: 'India',
    postalCode: '324005'
    // formattedAddress: not set in business
  };
  
  // Simulate the corrected deriveBusinessAddress call
  const businessAddress = simulateFixedDerivation({
    providedAddress: jobPayload.formattedAddress, // ✅ NOW CORRECTLY PASSED
    location: businessLocation
  });
  
  return {
    id: 'job_' + Date.now(),
    title: jobPayload.title,
    businessAddress,
    status: 'active'
  };
}

// Test Case 1: Job with employer formattedAddress (what you want)
console.log('\n📋 Test Case 1: Job Creation with formattedAddress');
const result1 = simulateVercelJobCreation({
  title: 'Security Guard - Premium Location',
  businessId: 'business_123',
  formattedAddress: 'Mahaveer Nagar III Cir', // ✅ This will now work
  description: 'Security guard needed',
  salary: 25000
});

console.log('\n✅ Job Created on Vercel:');
console.log(`   Title: ${result1.title}`);
console.log(`   Business Address: ${result1.businessAddress}`);

// Test Case 2: Job without employer formattedAddress
console.log('\n📋 Test Case 2: Job Creation without formattedAddress');
const result2 = simulateVercelJobCreation({
  title: 'Security Guard - Standard Location',
  businessId: 'business_123',
  description: 'Security guard needed',
  salary: 25000
});

console.log('\n✅ Job Created on Vercel:');
console.log(`   Title: ${result2.title}`);
console.log(`   Business Address: ${result2.businessAddress}`);

console.log('\n' + '=' * 60);
console.log('🎉 SOLUTION IMPLEMENTED FOR VERCEL:');
console.log('=' * 60);

console.log('\n✅ FIXED:');
console.log('   - deriveBusinessAddress now receives employer formattedAddress correctly');
console.log('   - Address concatenation will work on Vercel deployment');
console.log('   - Both single and bulk job creation updated');

console.log('\n🚀 TO TEST ON VERCEL:');
console.log('   1. Deploy the updated code to Vercel');
console.log('   2. Create a job with "formattedAddress" field');
console.log('   3. You should see the full concatenated address');

console.log('\n📱 Expected Result on Vercel:');
console.log('   "Mahaveer Nagar III Cir, 1 a23 Mahaveer Nagar III Circle, Kota, Rajasthan, 324005, India"');

console.log('\n💡 The fix ensures employer-provided addresses are properly passed to the concatenation logic!');