/**
 * Get Fresh Authentication Token
 * 
 * This script attempts to get a fresh token by trying various login credentials
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// Common test credentials to try
const TEST_CREDENTIALS = [
    { email: 'd@gmail.com', password: 'password' },
    { email: 'n@gmail.com', password: 'password' },
   
];

async function attemptLogin(credentials) {
    try {
        console.log(`🔐 Trying login: ${credentials.email}`);
        
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            email: credentials.email,
            password: credentials.password
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.data.token || (response.data.data && response.data.data.token)) {
            const token = response.data.token || response.data.data.token;
            const user = response.data.user || response.data.data.user || response.data.data;
            
            console.log(`✅ Login successful!`);
            console.log(`   Email: ${credentials.email}`);
            console.log(`   User ID: ${user._id || user.id || 'Unknown'}`);
            console.log(`   Role: ${user.role || 'Unknown'}`);
            console.log(`   Full Token: ${token}`);
            console.log(`   Response structure:`, JSON.stringify(response.data, null, 2));
            
            return { success: true, token, user, credentials };
        }
        
        return { success: false, error: 'No token in response' };
        
    } catch (error) {
        if (error.response) {
            console.log(`❌ Failed: ${error.response.data?.message || 'Unknown error'}`);
            return { success: false, error: error.response.data?.message };
        } else {
            console.log(`❌ Network error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

async function getWorkingTokens() {
    console.log('🚀 === SEARCHING FOR WORKING CREDENTIALS ===\n');
    
    const workingTokens = {
        employee: null,
        worker: null,
        admin: null
    };
    
    for (const credentials of TEST_CREDENTIALS) {
        const result = await attemptLogin(credentials);
        
        if (result.success) {
            const role = result.user.role;
            if (role === 'employee' || role === 'employer') {
                workingTokens.employee = result.token;
                console.log(`   📝 Saved as EMPLOYEE token\n`);
            } else if (role === 'worker') {
                workingTokens.worker = result.token;
                console.log(`   👷 Saved as WORKER token\n`);
            } else if (role === 'admin') {
                workingTokens.admin = result.token;
                console.log(`   👑 Saved as ADMIN token\n`);
            } else {
                console.log(`   ℹ️  Unknown role: ${role}\n`);
            }
        } else {
            console.log(``);
        }
    }
    
    console.log('\n🎯 === FINAL RESULTS ===');
    console.log(`Employee Token: ${workingTokens.employee ? 'Found ✅' : 'Not found ❌'}`);
    console.log(`Worker Token: ${workingTokens.worker ? 'Found ✅' : 'Not found ❌'}`);
    console.log(`Admin Token: ${workingTokens.admin ? 'Found ✅' : 'Not found ❌'}`);
    
    if (workingTokens.employee || workingTokens.worker) {
        console.log('\n📋 === COPY THESE TOKENS ===');
        if (workingTokens.employee) {
            console.log(`EMPLOYEE_TOKEN="${workingTokens.employee}"`);
        }
        if (workingTokens.worker) {
            console.log(`WORKER_TOKEN="${workingTokens.worker}"`);
        }
        if (workingTokens.admin) {
            console.log(`ADMIN_TOKEN="${workingTokens.admin}"`);
        }
    }
    
    return workingTokens;
}

if (require.main === module) {
    getWorkingTokens()
        .then(tokens => {
            console.log('\n✨ Token search completed.');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { getWorkingTokens };