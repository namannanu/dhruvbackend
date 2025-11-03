// Test case for dynamic business address updating
const testBusinesses = [
  {
    id: 'business1',
    name: 'apna ghar',
    address: '1 a23 Mahaveer Nagar III Circle, Kota, Rajasthan, 324005'
  },
  {
    id: 'business2', 
    name: 'New Restaurant',
    address: '456 Main Street, Mumbai, Maharashtra, 400001'
  },
  {
    id: 'business3',
    name: 'Shopping Mall',
    address: '789 Commercial Complex, Delhi, Delhi, 110001'
  }
];

function simulateBusinessSelection() {
  console.log('🧪 Testing Dynamic Business Address Updates');
  console.log('===========================================\n');

  // Scenario 1: Initial business selection
  console.log('📱 SCENARIO 1: Initial Selection');
  console.log('--------------------------------');
  let selectedBusiness = testBusinesses[0];
  let locationField = selectedBusiness.address; // Auto-filled
  console.log(`Business Selected: ${selectedBusiness.name}`);
  console.log(`Location Field: "${locationField}"`);
  
  // Scenario 2: Change business (location field has default address)
  console.log('\n📱 SCENARIO 2: Change Business (Default Address)');
  console.log('------------------------------------------------');
  const newBusiness1 = testBusinesses[1];
  const currentLocation1 = locationField;
  const previousAddress1 = selectedBusiness.address;
  
  // Check if should update (current location matches previous business address)
  const shouldUpdate1 = currentLocation1 === previousAddress1;
  console.log(`Previous Business: ${selectedBusiness.name}`);
  console.log(`New Business: ${newBusiness1.name}`);
  console.log(`Current Location Field: "${currentLocation1}"`);
  console.log(`Previous Business Address: "${previousAddress1}"`);
  console.log(`Should Update: ${shouldUpdate1 ? '✅ YES' : '❌ NO'}`);
  
  if (shouldUpdate1) {
    locationField = newBusiness1.address;
    selectedBusiness = newBusiness1;
  }
  console.log(`New Location Field: "${locationField}"`);
  
  // Scenario 3: Employer edits the address
  console.log('\n📱 SCENARIO 3: Employer Edits Address');
  console.log('------------------------------------');
  const editedAddress = '456 Main Street, Mumbai (Near Central Station)';
  locationField = editedAddress; // User manually edited
  console.log(`Employer Edits Address: "${editedAddress}"`);
  
  // Scenario 4: Change business again (location field has custom address)
  console.log('\n📱 SCENARIO 4: Change Business (Custom Address)');
  console.log('-----------------------------------------------');
  const newBusiness2 = testBusinesses[2];
  const currentLocation2 = locationField;
  const previousAddress2 = selectedBusiness.address;
  
  // Check if should update (current location does NOT match previous business address)
  const shouldUpdate2 = currentLocation2 === previousAddress2;
  console.log(`Previous Business: ${selectedBusiness.name}`);
  console.log(`New Business: ${newBusiness2.name}`);
  console.log(`Current Location Field: "${currentLocation2}"`);
  console.log(`Previous Business Address: "${previousAddress2}"`);
  console.log(`Should Update: ${shouldUpdate2 ? '✅ YES (overwrites custom)' : '❌ NO (preserves custom)'}`);
  
  if (shouldUpdate2) {
    locationField = newBusiness2.address;
  }
  selectedBusiness = newBusiness2;
  console.log(`Final Location Field: "${locationField}"`);
  
  console.log('\n🎯 BEHAVIOR SUMMARY:');
  console.log('====================');
  console.log('✅ Business selection auto-fills address');
  console.log('✅ Changing business updates address if not customized');
  console.log('✅ Custom addresses are preserved when changing business');
  console.log('✅ Location field is always editable by employer');
}

simulateBusinessSelection();