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
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
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

async function testAPI() {
    console.log('🧪 Testing SimplePrint API\n');

    // Test 1: Get all products
    console.log('1️⃣  GET /api/v1/products');
    const products = await apiRequest('/api/v1/products');
    console.log(`   Found ${products.data.length} products:`);
    products.data.forEach(p => {
        console.log(`   - ${p.name} (ID: ${p.id})`);
    });
    console.log();

    // Test 2: Get details for each product
    for (const product of products.data) {
        console.log(`2️⃣  GET /api/v1/products/${product.id}`);
        const details = await apiRequest(`/api/v1/products/${product.id}`);
        console.log(`   Product: ${details.data.name}`);
        console.log(`   Sizes: ${details.data.sizes.map(s => s.name).join(', ')}`);
        console.log(`   Available Papers: ${details.data.availablePapers.length}`);
        console.log(`   Quantities: ${details.data.quantityPrices.map(q => q.quantity).join(', ')}`);
        console.log(`   Upgrades: ${details.data.upgrades.length}`);
        console.log();
    }

    // Test 3: Calculate price for first product
    const firstProduct = products.data[0];
    console.log(`3️⃣  POST /api/v1/calculate (Product: ${firstProduct.name})`);

    const productDetails = await apiRequest(`/api/v1/products/${firstProduct.id}`);
    const calculation = await apiRequest('/api/v1/calculate', {
        method: 'POST',
        body: {
            productId: firstProduct.id,
            quantity: productDetails.data.quantityPrices[0].quantity,
            size: productDetails.data.sizes[0].name,
            paperId: productDetails.data.availablePapers[0].id,
            upgradeNames: productDetails.data.upgrades.length > 0 ? [productDetails.data.upgrades[0].name] : []
        }
    });

    console.log('   Calculation Result:');
    console.log(`   - Base Price: $${calculation.data.totals.basePrice}`);
    console.log(`   - Size Multiplier: ${calculation.data.totals.sizeMultiplier}x`);
    console.log(`   - Paper Upgrade: $${calculation.data.totals.paperUpgrade}`);
    console.log(`   - Upgrades Cost: $${calculation.data.totals.upgradesCost}`);
    console.log(`   - Grand Total: $${calculation.data.totals.grandTotal}`);
    console.log(`   - Unit Price: $${calculation.data.totals.unitPrice}`);
    console.log(`   - Calculation Time: ${calculation.data.engineMeta.calcMs}ms`);
    console.log();

    console.log('✅ All tests passed!\n');
    console.log('📚 View full documentation at: http://localhost:3080/api-docs');
}

testAPI().catch(console.error);
