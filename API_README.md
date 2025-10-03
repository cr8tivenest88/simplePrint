# SimplePrint API Documentation

## Overview

SimplePrint is now a **stateless API-first service** designed to integrate with WordPress. Node.js handles calculations and product configuration, while WordPress manages persistence and user interactions.

## Quick Start

```bash
npm install
npm start
```

Server runs at: `http://localhost:3080`
Swagger docs: `http://localhost:3080/api-docs`

## Architecture

### What Node Does

- Serves REST API endpoints for product data and pricing
- Validates inputs and performs real-time calculations
- Returns structured payloads with totals + metadata
- **Does NOT store quotes** (WordPress responsibility)

### What WordPress Does

- Displays the calculator form UI
- Calls Node API to fetch product details
- Shows calculated totals to users
- Saves quotes to database (quote_request CPT)

## API Endpoints

### Products

#### `GET /api/v1/products`
Get all active products (summary).

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "name": "Standard Business Cards",
      "description": "Professional business cards..."
    }
  ]
}
```

#### `GET /api/v1/products/:id`
Get full product details including sizes, papers, upgrades, and pricing.

**Response:**
```json
{
  "data": {
    "id": "1",
    "name": "Standard Business Cards",
    "sizes": [...],
    "quantityPrices": [...],
    "upgrades": [...],
    "availablePapers": [...]
  }
}
```

### Calculator

#### `POST /api/v1/calculate`
Calculate price for a print job.

**Request Body:**
```json
{
  "productId": "1",
  "quantity": 100,
  "size": "Standard US",
  "paperId": "P001",
  "upgradeNames": ["Rounded Corners"]
}
```

**Response:**
```json
{
  "data": {
    "inputs": {
      "productId": "1",
      "productName": "Standard Business Cards",
      "quantity": 100,
      "size": "Standard US",
      "paperId": "P001",
      "paperName": "Glossy",
      "upgrades": ["Rounded Corners"]
    },
    "totals": {
      "basePrice": 20,
      "sizeMultiplier": 1,
      "subtotal": 20,
      "paperUpgrade": 0,
      "upgradesCost": 2,
      "grandTotal": 22,
      "unitPrice": 0.22
    },
    "lineItems": [
      {
        "description": "Standard Business Cards - 100 units",
        "quantity": 100,
        "unitPrice": 20,
        "total": 20
      },
      {
        "description": "Rounded Corners",
        "quantity": 1,
        "unitPrice": 2,
        "total": 2
      }
    ],
    "appliedUpgrades": [
      {
        "name": "Rounded Corners",
        "description": "Quarter-inch rounded edges...",
        "cost": 2
      }
    ],
    "engineMeta": {
      "version": "v1.0.0",
      "calcMs": 15,
      "timestamp": "2025-10-02T12:00:00.000Z"
    }
  }
}
```

### Resources

#### `GET /api/v1/papers`
Get all available paper types.

#### `GET /api/v1/upgrades`
Get all available upgrade options.

## Data Contract

### Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `productId` | string | Yes | Product identifier |
| `quantity` | integer | Yes | Must be > 0 |
| `size` | string | Yes | Size name (e.g., "Standard US") |
| `paperId` | string | Yes | Paper ID (e.g., "P001") |
| `upgradeNames` | array | No | List of upgrade names |

### Output Structure

All successful responses return:
```json
{
  "data": { ... }
}
```

All errors return:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": ["Optional details array"]
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

## Security

### CORS Configuration

Located in `middleware/cors.js`. Update `allowedOrigins` array with your WordPress domains:

```javascript
const allowedOrigins = [
    'http://localhost:3080',
    'https://yourwordpress.com',
    'https://staging.yourwordpress.com'
];
```

### Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Calculate endpoint**: 50 requests per 15 minutes per IP

Configure in `middleware/rateLimiter.js`.

## Performance

- **Target**: <300ms p95 for calculations
- **Actual**: ~1-15ms (tested)
- **Caching**: None (stateless by design)

## WordPress Integration

### Example Flow

1. **User visits product page on WordPress**
   - WP calls: `GET /api/v1/products/1`
   - Receives product config (sizes, papers, upgrades)

2. **WP renders calculator form**
   - Uses product data to build dropdowns/options
   - User selects quantity, size, paper, upgrades

3. **User calculates price**
   - WP calls: `POST /api/v1/calculate` with selections
   - Displays totals in UI

4. **User saves quote**
   - WP saves to `quote_request` CPT (custom post type)
   - Stores calculation result + user info

### Sample WordPress Code

```php
// Fetch product details
$response = wp_remote_get('http://localhost:3080/api/v1/products/1');
$product = json_decode(wp_remote_retrieve_body($response), true);

// Calculate price
$response = wp_remote_post('http://localhost:3080/api/v1/calculate', [
    'body' => json_encode([
        'productId' => '1',
        'quantity' => 100,
        'size' => 'Standard US',
        'paperId' => 'P001',
        'upgradeNames' => ['Rounded Corners']
    ]),
    'headers' => ['Content-Type' => 'application/json']
]);

$result = json_decode(wp_remote_retrieve_body($response), true);
```

## Versioning

- Current version: `v1.0.0`
- API routes: `/api/v1/*`
- Breaking changes: Add `/api/v2` (keep v1 stable)

## Development

### File Structure

```
├── app.js                      # Main server entry
├── config/
│   └── swagger.js              # OpenAPI documentation config
├── middleware/
│   ├── cors.js                 # CORS configuration
│   └── rateLimiter.js          # Rate limiting config
├── routes/
│   ├── calculatorRoutes.js     # API v1 routes
│   └── adminRoutes.js          # Admin panel routes
├── services/
│   └── calculatorService.js    # Business logic
├── data/
│   ├── products.json           # Product catalog
│   └── paper-data.json         # Papers & upgrades
└── utils/
    └── jsonDb.js               # Simple JSON database
```

### Testing

```bash
# Start server
npm start

# Test endpoints
curl http://localhost:3080/api/v1/products
curl http://localhost:3080/api/v1/products/1
curl -X POST http://localhost:3080/api/v1/calculate \
  -H "Content-Type: application/json" \
  -d '{"productId":"1","quantity":100,"size":"Standard US","paperId":"P001"}'

# View Swagger docs
open http://localhost:3080/api-docs
```

## Migration from Old Frontend

The old calculator (`public/js/calculator.js`) is **still functional** for the product detail pages at `/product/:id`.

### Next Steps (Optional)

1. Migrate product detail pages to WordPress
2. Remove EJS views (`views/product-detail.ejs`)
3. Remove client-side calculator (`public/js/calculator.js`)
4. Keep admin panel or migrate to WP admin

## Troubleshooting

### CORS Errors
- Check `middleware/cors.js` allowedOrigins
- Ensure WordPress domain is whitelisted

### Rate Limit Errors
- Adjust limits in `middleware/rateLimiter.js`
- Consider per-user JWT tokens for higher limits

### Calculation Errors
- Verify product data in `data/products.json`
- Check paper IDs match `data/paper-data.json`
- Review validation in `services/calculatorService.js`

## Support

For API documentation: `http://localhost:3080/api-docs`
For issues: Check server logs or contact support@simpleprint.com

---

**Generated**: 2025-10-01
**API Version**: v1.0.0
**Engine**: Node.js + Express + Swagger
