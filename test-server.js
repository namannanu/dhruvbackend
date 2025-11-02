const express = require('express');

// Simple test server to test job creation
const app = express();
app.use(express.json());

// Simulate the deriveBusinessAddress function
const deriveBusinessAddress = ({ providedAddress, location, business }) => {
  const trimmed = typeof providedAddress === 'string' ? providedAddress.trim() : undefined;
  if (trimmed) {
    console.log('🎯 Using employer-provided address:', trimmed);
    return trimmed;
  }

  const primaryLocation = location;
  if (primaryLocation) {
    const addressParts = [];
    
    console.log('🔍 Processing business location components:');
    
    if (primaryLocation.formattedAddress && primaryLocation.formattedAddress.trim()) {
      console.log('  ✅ formattedAddress:', primaryLocation.formattedAddress);
      addressParts.push(primaryLocation.formattedAddress.trim());
    } else {
      console.log('  ❌ formattedAddress: NOT SET');
    }
    
    if (primaryLocation.line1 && primaryLocation.line1.trim()) {
      console.log('  ✅ line1:', primaryLocation.line1);
      addressParts.push(primaryLocation.line1.trim());
    }
    
    if (primaryLocation.city && primaryLocation.city.trim()) {
      console.log('  ✅ city:', primaryLocation.city);
      addressParts.push(primaryLocation.city.trim());
    }
    
    if (primaryLocation.state && primaryLocation.state.trim()) {
      console.log('  ✅ state:', primaryLocation.state);
      addressParts.push(primaryLocation.state.trim());
    }
    
    if (primaryLocation.postalCode && primaryLocation.postalCode.trim()) {
      console.log('  ✅ postalCode:', primaryLocation.postalCode);
      addressParts.push(primaryLocation.postalCode.trim());
    }
    
    if (primaryLocation.country && primaryLocation.country.trim()) {
      console.log('  ✅ country:', primaryLocation.country);
      addressParts.push(primaryLocation.country.trim());
    }
    
    const result = addressParts.join(', ');
    console.log('🎯 Final address result:', result);
    return result;
  }

  return null;
};

// Test endpoint for job creation
app.post('/api/jobs/test', (req, res) => {
  const { title, formattedAddress, businessLocation } = req.body;
  
  console.log('\n🚀 Testing Job Creation');
  console.log('📝 Job title:', title);
  console.log('📍 Employer formattedAddress:', formattedAddress);
  console.log('🏢 Business location:', JSON.stringify(businessLocation, null, 2));
  
  // Simulate the address derivation
  const businessAddress = deriveBusinessAddress({
    providedAddress: formattedAddress,
    location: businessLocation
  });
  
  const job = {
    id: 'test_' + Date.now(),
    title,
    businessAddress,
    status: 'active',
    createdAt: new Date()
  };
  
  console.log('\n✅ Job created successfully!');
  console.log('🎯 Final businessAddress:', businessAddress);
  
  res.json({
    status: 'success',
    data: { job }
  });
});

// Test Cases endpoint
app.get('/api/test-cases', (req, res) => {
  console.log('\n🧪 Running Test Cases');
  
  const testCases = [
    {
      name: 'With employer formattedAddress',
      data: {
        title: 'Security Guard - Custom Address',
        formattedAddress: 'Mahaveer Nagar III Cir',
        businessLocation: {
          line1: '1 a23 Mahaveer Nagar III Circle',
          city: 'Kota',
          state: 'Rajasthan',
          country: 'India',
          postalCode: '324005'
        }
      }
    },
    {
      name: 'Without employer formattedAddress (current scenario)',
      data: {
        title: 'Security Guard - Business Address',
        businessLocation: {
          line1: '1 a23 Mahaveer Nagar III Circle',
          city: 'Kota',
          state: 'Rajasthan',
          country: 'India',
          postalCode: '324005'
        }
      }
    },
    {
      name: 'Business has formattedAddress',
      data: {
        title: 'Security Guard - Business Formatted',
        businessLocation: {
          formattedAddress: 'Mahaveer Nagar III Cir',
          line1: '1 a23 Mahaveer Nagar III Circle',
          city: 'Kota',
          state: 'Rajasthan',
          country: 'India',
          postalCode: '324005'
        }
      }
    }
  ];
  
  const results = testCases.map(testCase => {
    console.log(`\n📋 ${testCase.name}:`);
    const businessAddress = deriveBusinessAddress({
      providedAddress: testCase.data.formattedAddress,
      location: testCase.data.businessLocation
    });
    
    return {
      name: testCase.name,
      input: testCase.data,
      result: businessAddress
    };
  });
  
  res.json({
    status: 'success',
    testCases: results
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log('  POST /api/jobs/test - Test job creation');
  console.log('  GET  /api/test-cases - Run all test cases');
  console.log('\n💡 Try these commands:');
  console.log(`  curl http://localhost:${PORT}/api/test-cases`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/jobs/test -H "Content-Type: application/json" -d '{"title":"Test Job","formattedAddress":"Mahaveer Nagar III Cir","businessLocation":{"line1":"1 a23 Mahaveer Nagar III Circle","city":"Kota","state":"Rajasthan","country":"India","postalCode":"324005"}}'`);
});