// Debug script for worker profile update issue
// This helps identify the exact problem with the 403 error

console.log('=== Worker Profile Update Debug Guide ===\n');

console.log('🔍 Steps to Debug the 403 Error:\n');

const debugSteps = [
  '1. Check Server Logs',
  '   - Look for "🔍 JWT Debug" messages',
  '   - Look for "🔍 User Lookup" messages', 
  '   - Look for "🔍 RestrictTo Debug" messages',
  '   - Look for "🔍 UpdateWorkerProfile Debug" messages',
  '',
  '2. Verify Your Token',
  '   - Make sure you\'re sending: Authorization: Bearer <token>',
  '   - Check that the token is from a worker login (not employer)',
  '   - Verify the token hasn\'t expired',
  '',
  '3. Check User Type',
  '   - Debug logs will show userType from token',
  '   - Must be "worker" (not "employer")',
  '',
  '4. Test Different Endpoints',
  '   - Try GET /workers/me first (should work)',
  '   - Then try PATCH /workers/me',
  '',
  '5. Check Request Data',
  '   - Debug logs will show what data you\'re sending',
  '   - Verify JSON is valid'
];

debugSteps.forEach(step => console.log(step));

console.log('\n=== Common Issues & Solutions ===\n');

const issues = [
  {
    issue: '403 with "Access denied. Required roles: worker. Your role: employer"',
    solution: 'You\'re logged in as an employer, not a worker. Login with worker credentials.'
  },
  {
    issue: '403 with "You can only update your own profile"', 
    solution: 'Token user ID doesn\'t match the worker being updated. Check token validity.'
  },
  {
    issue: '403 with "Only workers can update worker profiles"',
    solution: 'User type is not "worker". Check database user record.'
  },
  {
    issue: '401 with "Authentication required"',
    solution: 'Token missing or invalid format. Check Authorization header.'
  }
];

issues.forEach((item, index) => {
  console.log(`${index + 1}. Issue: ${item.issue}`);
  console.log(`   Solution: ${item.solution}\n`);
});

console.log('=== Test Commands ===\n');

const testCommands = [
  '# 1. Test authentication (should return worker data)',
  'curl -X GET https://dhruvbackend.vercel.app/api/workers/me \\',
  '  -H "Authorization: Bearer YOUR_TOKEN_HERE"',
  '',
  '# 2. Test profile update (the failing request)',
  'curl -X PATCH https://dhruvbackend.vercel.app/api/workers/me \\',
  '  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\',
  '  -H "Content-Type: application/json" \\',
  '  -d \'{"name": "Test Update"}\'',
  '',
  '# 3. Check what your token contains (decode JWT)',
  '# Use https://jwt.io to decode your token and check:',
  '# - "id" field (user ID)', 
  '# - Token expiration',
  '# - No corruption'
];

testCommands.forEach(cmd => console.log(cmd));

console.log('\n=== Quick Fix ===\n');

console.log('If the issue persists, try:');
console.log('1. Login again to get a fresh token');
console.log('2. Make sure you\'re using worker credentials (not employer)');
console.log('3. Check server logs for the debug messages');
console.log('4. Verify the token format: "Bearer <actual_jwt_token>"');

console.log('\n=== Server Log Examples ===\n');

const logExamples = [
  'Good logs (should work):',
  '🔍 JWT Debug: { decodedId: "68d5012cd3ef2d2932e4b257", tokenValid: true }',
  '🔍 User Lookup: { userFound: true, userType: "worker" }',
  '🔍 RestrictTo Debug: { userType: "worker", requiredRoles: ["worker"] }',
  '✅ Authorization successful',
  '',
  'Bad logs (will fail):',  
  '🔍 User Lookup: { userFound: true, userType: "employer" }',
  '❌ Role mismatch: { userRole: "employer", requiredRoles: ["worker"] }'
];

logExamples.forEach(log => console.log(log));