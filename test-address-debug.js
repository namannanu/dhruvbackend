// Direct test of the address formatting logic
// This simulates what happens in the deriveBusinessAddress function

console.log('🔍 Testing Address Formatting Logic');
console.log('=' * 50);

// Simulate current business location data (based on the test output)
const currentBusinessData = {
  formattedAddress: undefined, // Currently not set
  line1: "1 a23 Mahaveer Nagar III Circle", // This is what's showing
  city: "Kota",
  state: "Rajasthan", 
  country: "India",
  postalCode: "324005"
};

console.log('\n📍 Current Business Location Data:');
console.log(JSON.stringify(currentBusinessData, null, 2));

// Test the NEW address formatting logic
function newAddressFormat(locationData) {
  const addressParts = [];
  
  console.log('\n🔄 Processing address components:');
  
  if (locationData.formattedAddress && locationData.formattedAddress.trim()) {
    console.log('  ✅ formattedAddress:', locationData.formattedAddress);
    addressParts.push(locationData.formattedAddress.trim());
  } else {
    console.log('  ❌ formattedAddress: NOT SET or EMPTY');
  }
  
  if (locationData.line1 && locationData.line1.trim()) {
    console.log('  ✅ line1:', locationData.line1);
    addressParts.push(locationData.line1.trim());
  }
  
  if (locationData.city && locationData.city.trim()) {
    console.log('  ✅ city:', locationData.city);
    addressParts.push(locationData.city.trim());
  }
  
  if (locationData.state && locationData.state.trim()) {
    console.log('  ✅ state:', locationData.state);
    addressParts.push(locationData.state.trim());
  }
  
  if (locationData.postalCode && locationData.postalCode.trim()) {
    console.log('  ✅ postalCode:', locationData.postalCode);
    addressParts.push(locationData.postalCode.trim());
  }
  
  if (locationData.country && locationData.country.trim()) {
    console.log('  ✅ country:', locationData.country);
    addressParts.push(locationData.country.trim());
  }
  
  return addressParts.join(', ');
}

console.log('\n🎯 Current Result (what you\'re seeing):');
const currentResult = newAddressFormat(currentBusinessData);
console.log('"' + currentResult + '"');

console.log('\n📝 Expected Result (what you want):');
const expectedData = {
  formattedAddress: "Mahaveer Nagar III Cir",
  line1: "Mahaveer Nagar III Circle", 
  city: "Kota",
  state: "Rajasthan",
  country: "India", 
  postalCode: "324005"
};

const expectedResult = newAddressFormat(expectedData);
console.log('"' + expectedResult + '"');

console.log('\n🔍 Analysis:');
console.log('❌ ISSUE: The business location is missing the "formattedAddress" field');
console.log('   Current: Only has line1, city, state, postalCode');
console.log('   Needed: formattedAddress should be set to "Mahaveer Nagar III Cir"');

console.log('\n💡 Solution:');
console.log('   Update the business location to include formattedAddress field');
console.log('   This will give the full concatenated format you want');