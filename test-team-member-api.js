// Test the team member API endpoint
const fetch = require('node-fetch');

async function testTeamMemberAPI() {
  const API_BASE = 'https://dhruvbackend.vercel.app';
  
  // This is the token from your Flutter app logs
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZGJiYzMzMjE4YjRlMWJiYzllYTkzOSIsImlhdCI6MTc1OTI2NTUzMSwiZXhwIjoxNzU5ODcwMzMxfQ.4eyN6IY1OsGMcVYEClTCbfCCWOuizvO4JdsbHuPQRqk';
  const businessId = '68dbbc34218b4e1bbc9ea93d';
  
  try {
    console.log('🔄 Testing team member API...');
    console.log('URL:', `${API_BASE}/api/auth/team-member?businessId=${businessId}`);
    
    const response = await fetch(`${API_BASE}/api/auth/team-member?businessId=${businessId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('📋 Response body:', data);
    
    if (response.status === 200) {
      const jsonData = JSON.parse(data);
      console.log('✅ Success! Team member found:');
      console.log('   Email:', jsonData.teamMember.user.email);
      console.log('   Role:', jsonData.teamMember.role);
      console.log('   Active:', jsonData.teamMember.active);
    } else {
      console.log('❌ API call failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTeamMemberAPI();