/**
 * Test Job Creation with Custom Token
 * 
 * Usage:
 * node test-with-your-token.js "your-token-here"
 * 
 * OR set environment variables:
 * EMPLOYEE_TOKEN="your-employee-token" WORKER_TOKEN="your-worker-token" node test-with-your-token.js
 */

const { runCompleteWorkflowTest } = require('./test-complete-job-address-workflow');

async function runTestWithCustomToken() {
    console.log('🚀 === RUNNING TEST WITH YOUR TOKENS ===\n');
    
    // Get tokens from command line arguments or environment variables
    let employeeToken = process.argv[2] || process.env.EMPLOYEE_TOKEN;
    let workerToken = process.argv[3] || process.env.WORKER_TOKEN || employeeToken;
    
    if (!employeeToken) {
        console.log('❌ No token provided!');
        console.log('\n📋 Usage options:');
        console.log('1. node test-with-your-token.js "your-token-here"');
        console.log('2. EMPLOYEE_TOKEN="your-token" node test-with-your-token.js');
        console.log('3. EMPLOYEE_TOKEN="emp-token" WORKER_TOKEN="worker-token" node test-with-your-token.js');
        process.exit(1);
    }
    
    console.log('📋 Using tokens:');
    console.log(`   Employee Token: ${employeeToken.substring(0, 50)}...`);
    console.log(`   Worker Token: ${workerToken.substring(0, 50)}...`);
    console.log('');
    
    try {
        const results = await runCompleteWorkflowTest(employeeToken, workerToken);
        
        console.log('\n✨ Test execution completed.');
        const success = Object.values(results).filter(r => typeof r === 'boolean').every(Boolean);
        
        if (success) {
            console.log('🎉 ALL TESTS PASSED!');
            process.exit(0);
        } else {
            console.log('⚠️ Some tests failed. Check the results above.');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        process.exit(1);
    }
}

runTestWithCustomToken();