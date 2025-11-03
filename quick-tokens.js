/**
 * Quick Token Extractor
 * Just gets the tokens without all the verbose output
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

const WORKING_CREDENTIALS = [
    { email: 'd@gmail.com', password: 'password' },
    { email: 'n@gmail.com', password: 'password' }
];

async function getTokens() {
    console.log('🔐 Getting fresh tokens...\n');
    
    const tokens = [];
    
    for (const creds of WORKING_CREDENTIALS) {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, creds, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            const token = response.data.token;
            const user = response.data.data.user;
            
            console.log(`✅ ${creds.email}:`);
            console.log(`   UserType: ${user.userType || 'unknown'}`);
            console.log(`   Token: ${token}`);
            console.log('');
            
            tokens.push({
                email: creds.email,
                userType: user.userType,
                token: token,
                userId: user._id
            });
            
        } catch (error) {
            console.log(`❌ Failed to get token for ${creds.email}`);
        }
    }
    
    return tokens;
}

if (require.main === module) {
    getTokens()
        .then(tokens => {
            console.log('📋 === READY TO USE TOKENS ===');
            tokens.forEach(t => {
                console.log(`${t.userType.toUpperCase()}_TOKEN="${t.token}"`);
            });
        })
        .catch(console.error);
}

module.exports = { getTokens };