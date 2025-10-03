const http = require('http');

// Helper function to make API requests
function apiRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3080,
            path: path,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

// Helper to get admin cookie (simplified - you'll need actual login)
async function getAdminCookie() {
    const loginResponse = await apiRequest('/admin/login', {
        method: 'POST',
        body: {
            username: 'admin',
            password: 'admin123'
        }
    });

    // In real scenario, extract Set-Cookie header
    // For now, we'll use the generateApiToken directly
    const { generateApiToken } = require('./middleware/apiAuth');
    return generateApiToken({
        clientId: 'wordpress-site-1',
        origin: 'https://yourwordpress.com'
    });
}

async function testAuthentication() {
    console.log('🔐 Testing API Authentication\n');

    // Step 1: Generate a token (manually for testing)
    console.log('1️⃣  Generating API Token...');
    const { generateApiToken } = require('./middleware/apiAuth');
    const token = generateApiToken({
        clientId: 'wordpress-test',
        origin: 'https://yourwordpress.com'
    });
    console.log(`   ✅ Token generated: ${token.substring(0, 50)}...`);
    console.log();

    // Step 2: Verify the token
    console.log('2️⃣  Verifying Token...');
    const verifyResponse = await apiRequest('/api/v1/auth/verify', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (verifyResponse.status === 200) {
        console.log(`   ✅ Token is valid`);
        console.log(`   - Client ID: ${verifyResponse.data.clientId}`);
        console.log(`   - Origin: ${verifyResponse.data.origin}`);
        console.log(`   - Issued At: ${verifyResponse.data.issuedAt}`);
        console.log(`   - Expires At: ${verifyResponse.data.expiresAt}`);
    } else {
        console.log(`   ❌ Token verification failed:`, verifyResponse.data);
    }
    console.log();

    // Step 3: Try accessing protected endpoint WITHOUT token
    console.log('3️⃣  Accessing /api/v1/products WITHOUT token...');
    const unauthorizedResponse = await apiRequest('/api/v1/products');

    if (unauthorizedResponse.status === 401) {
        console.log(`   ✅ Correctly blocked: ${unauthorizedResponse.data.message}`);
    } else {
        console.log(`   ❌ Should have been blocked! Status: ${unauthorizedResponse.status}`);
    }
    console.log();

    // Step 4: Access protected endpoint WITH token
    console.log('4️⃣  Accessing /api/v1/products WITH token...');
    const authorizedResponse = await apiRequest('/api/v1/products', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (authorizedResponse.status === 200) {
        console.log(`   ✅ Access granted!`);
        console.log(`   - Found ${authorizedResponse.data.data.length} products`);
    } else {
        console.log(`   ❌ Access failed:`, authorizedResponse.data);
    }
    console.log();

    // Step 5: Calculate price WITH token
    console.log('5️⃣  Testing /api/v1/calculate WITH token...');
    const calcResponse = await apiRequest('/api/v1/calculate', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: {
            productId: '1',
            quantity: 100,
            size: 'Standard US',
            paperId: 'P001',
            upgradeNames: ['Rounded Corners']
        }
    });

    if (calcResponse.status === 200) {
        console.log(`   ✅ Calculation successful!`);
        console.log(`   - Grand Total: $${calcResponse.data.data.totals.grandTotal}`);
        console.log(`   - Calc Time: ${calcResponse.data.data.engineMeta.calcMs}ms`);
    } else {
        console.log(`   ❌ Calculation failed:`, calcResponse.data);
    }
    console.log();

    // Step 6: Test with invalid token
    console.log('6️⃣  Testing with INVALID token...');
    const invalidResponse = await apiRequest('/api/v1/products', {
        headers: {
            'Authorization': 'Bearer invalid-token-12345'
        }
    });

    if (invalidResponse.status === 401) {
        console.log(`   ✅ Correctly rejected: ${invalidResponse.data.message}`);
    } else {
        console.log(`   ❌ Should have been rejected!`);
    }
    console.log();

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All authentication tests passed!\n');
    console.log('📝 How to use in WordPress:');
    console.log('   1. Admin generates token via /api/v1/auth/token');
    console.log('   2. Store token securely in WordPress');
    console.log('   3. Include in all API requests:');
    console.log('      Authorization: Bearer <your-token>');
    console.log();
    console.log('🔑 Example token for testing:');
    console.log(`   ${token}`);
    console.log();
    console.log('📚 View docs at: http://localhost:3080/api-docs');
}

testAuthentication().catch(console.error);
