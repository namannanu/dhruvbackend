const fetch = require('node-fetch');

async function getToken() {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'your-email@example.com',    // Replace with your email
                password: 'your-password'           // Replace with your password
            })
        });

        const data = await response.json();
        console.log('Your access token:', data.token);
    } catch (error) {
        console.error('Error:', error);
    }
}

getToken();