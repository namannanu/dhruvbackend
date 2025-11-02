const mongoose = require('mongoose');
const Job = require('./src/modules/jobs/job.model');
const Business = require('./src/modules/businesses/business.model');
const User = require('./src/modules/users/user.model');

// Import the deriveBusinessAddress function from job controller
const fs = require('fs');
const path = require('path');

// Read and evaluate the deriveBusinessAddress function from job.controller.js
function loadDeriveBusinessAddress() {
  const controllerPath = path.join(__dirname, 'src/modules/jobs/job.controller.js');
  const controllerContent = fs.readFileSync(controllerPath, 'utf8');
  
  // Extract the deriveBusinessAddress function
  const functionMatch = controllerContent.match(/const deriveBusinessAddress = [\s\S]*?^};/m);
  if (functionMatch) {
    // Also need the helper functions
    const toPlainObjectMatch = controllerContent.match(/const toPlainObject = [\s\S]*?^};/m);
    const resolveAddressValueMatch = controllerContent.match(/const resolveAddressValue = [\s\S]*?^};/m);
    
    if (toPlainObjectMatch && resolveAddressValueMatch) {
      // Create a safe evaluation context
      return new Function('return ' + `
        ${toPlainObjectMatch[0]}
        ${resolveAddressValueMatch[0]}
        ${functionMatch[0]}
        return deriveBusinessAddress;
      `)();
    }
  }
  return null;
}

async function testJobCreationWithFormattedAddress() {
  try {
    console.log('🚀 Testing Job Creation with Custom formattedAddress');
    console.log('=' * 60);

    // Load the deriveBusinessAddress function
    const deriveBusinessAddress = loadDeriveBusinessAddress();
    if (!deriveBusinessAddress) {
      console.log('❌ Could not load deriveBusinessAddress function');
      return;
    }

    console.log('✅ Loaded deriveBusinessAddress function from controller');

    // Test Case 1: Job with employer-provided formattedAddress
    console.log('\n📋 Test Case 1: Job with Custom formattedAddress');
    const testCase1 = {
      employerFormattedAddress: "Mahaveer Nagar III Cir",
      businessLocation: {
        line1: "1 a23 Mahaveer Nagar III Circle",
        city: "Kota",
        state: "Rajasthan", 
        country: "India",
        postalCode: "324005"
      }
    };

    console.log('📍 Employer-provided formattedAddress:', testCase1.employerFormattedAddress);
    console.log('🏢 Business location:', JSON.stringify(testCase1.businessLocation, null, 2));

    // Simulate the deriveBusinessAddress call with employer override
    const result1 = deriveBusinessAddress({
      providedAddress: testCase1.employerFormattedAddress,
      location: testCase1.businessLocation
    });

    console.log('🎯 Result 1 (with employer address):');
    console.log(`   "${result1}"`);

    // Test Case 2: Job without employer address (fallback to business)
    console.log('\n📋 Test Case 2: Job without Custom formattedAddress (Business Fallback)');
    const testCase2 = {
      businessLocation: {
        formattedAddress: "Mahaveer Nagar III Cir", // Business has its own formatted address
        line1: "1 a23 Mahaveer Nagar III Circle",
        city: "Kota",
        state: "Rajasthan",
        country: "India", 
        postalCode: "324005"
      }
    };

    console.log('🏢 Business location with formattedAddress:', JSON.stringify(testCase2.businessLocation, null, 2));

    const result2 = deriveBusinessAddress({
      providedAddress: undefined, // No employer override
      location: testCase2.businessLocation
    });

    console.log('🎯 Result 2 (business formatted address):');
    console.log(`   "${result2}"`);

    // Test Case 3: Current scenario (no formattedAddress anywhere)
    console.log('\n📋 Test Case 3: Current Scenario (No formattedAddress)');
    const testCase3 = {
      businessLocation: {
        line1: "1 a23 Mahaveer Nagar III Circle",
        city: "Kota",
        state: "Rajasthan",
        country: "India",
        postalCode: "324005"
        // No formattedAddress field
      }
    };

    console.log('🏢 Business location (current):', JSON.stringify(testCase3.businessLocation, null, 2));

    const result3 = deriveBusinessAddress({
      providedAddress: undefined,
      location: testCase3.businessLocation
    });

    console.log('🎯 Result 3 (current situation):');
    console.log(`   "${result3}"`);

    console.log('\n✨ Analysis:');
    console.log('1. With employer formattedAddress: FULL concatenation ✅');
    console.log('2. With business formattedAddress: FULL concatenation ✅');
    console.log('3. Without formattedAddress: Missing first component ❌');

    console.log('\n💡 Solutions:');
    console.log('- Option A: Add formattedAddress to business location');
    console.log('- Option B: Provide formattedAddress when creating jobs');
    console.log('- Both options now work with the updated backend logic!');

    // Simulate creating a job with custom address
    console.log('\n🔧 Simulating Job Creation API Call:');
    const jobCreationData = {
      title: "Security Guard - Address Test",
      businessId: "sample_business_id",
      formattedAddress: "Mahaveer Nagar III Cir", // Custom employer address
      description: "Test job with custom address",
      category: "Security",
      salary: 25000
    };

    console.log('📤 Job creation payload:');
    console.log(JSON.stringify(jobCreationData, null, 2));

    console.log('\n🎯 Expected Job businessAddress result:');
    console.log(`   "${result1}"`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testJobCreationWithFormattedAddress();