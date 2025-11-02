// Test data showing the expected address format transformation
const testLocationData = {
  "formattedAddress": "Mahaveer Nagar III Cir",
  "line1": "Mahaveer Nagar III Circle",
  "city": "Kota",
  "state": "Rajasthan",
  "country": "India",
  "postalCode": "324005"
};

// Simulate the new deriveBusinessAddress logic
function simulateNewAddressFormat(locationData) {
  const addressParts = [];
  
  if (locationData.formattedAddress && locationData.formattedAddress.trim()) {
    addressParts.push(locationData.formattedAddress.trim());
  }
  if (locationData.line1 && locationData.line1.trim()) {
    addressParts.push(locationData.line1.trim());
  }
  if (locationData.city && locationData.city.trim()) {
    addressParts.push(locationData.city.trim());
  }
  if (locationData.state && locationData.state.trim()) {
    addressParts.push(locationData.state.trim());
  }
  if (locationData.postalCode && locationData.postalCode.trim()) {
    addressParts.push(locationData.postalCode.trim());
  }
  if (locationData.country && locationData.country.trim()) {
    addressParts.push(locationData.country.trim());
  }
  
  return addressParts.join(', ');
}

console.log('📍 Original Data:');
console.log(JSON.stringify(testLocationData, null, 2));

console.log('\n🔄 New Address Format:');
const newFormat = simulateNewAddressFormat(testLocationData);
console.log(newFormat);

console.log('\n✅ Expected Result:');
console.log('Mahaveer Nagar III Cir, Mahaveer Nagar III Circle, Kota, Rajasthan, 324005, India');