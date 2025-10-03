# SimplePrint Calculator Widget - WordPress Integration Guide

## Overview

This guide documents the integration between the SimplePrint calculator API and WordPress using a widget-based approach. The setup includes:

1. **SimplePrint Server** (port 3080) - Calculator API and widget host
2. **Mock WordPress Server** (port 3088) - Test environment for widget integration
3. **Widget.js** - Embeddable JavaScript widget for product quotes

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WordPress / Mock WP                       │
│                      (Port 3088)                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Quote Page                                         │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │  <script src="http://localhost:3080/widget.js"> │    │
│  │  │                                                │ │    │
│  │  │  SimplePrint Widget (Auto-calculating)        │ │    │
│  │  │  - Product Selection                           │ │    │
│  │  │  - Paper Type                                  │ │    │
│  │  │  - Quantity                                    │ │    │
│  │  │  - Upgrades                                    │ │    │
│  │  │  - Live Price Display                          │ │    │
│  │  │  - Save Quote Button                           │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           │ API Calls                        │
│                           ▼                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                           │                                  │
│                SimplePrint Server                            │
│                    (Port 3080)                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /widget.js - Embeddable Widget                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  REST API Endpoints:                                  │  │
│  │  - GET  /api/v1/products                             │  │
│  │  - GET  /api/v1/products/:id                         │  │
│  │  - POST /api/v1/calculate                            │  │
│  │  - GET  /api/papers                                  │  │
│  │  - GET  /api/upgrades                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Admin Interface: http://localhost:3080/admin        │  │
│  │  Username: admin / Password: admin123                │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

### SimplePrint Server (E:\simplePrint)

```
simplePrint/
├── app.js                      # Main Express server
├── package.json
├── data/
│   ├── admins.json            # Admin credentials
│   ├── products.json          # Product definitions
│   ├── paper-data.json        # Paper types and upgrades
│   └── size-presets.json      # Size configurations
├── routes/
│   ├── adminRoutes.js         # Admin panel routes
│   ├── calculatorRoutes.js    # API endpoints
│   └── authRoutes.js          # Authentication
├── middleware/
│   ├── cors.js                # CORS configuration
│   ├── apiAuth.js             # API authentication
│   └── rateLimiter.js         # Rate limiting
├── services/
│   └── calculatorService.js   # Business logic
└── public/
    └── widget.js              # Embeddable widget
```

### Mock WordPress Server (E:\wpTest\mock-wordpress)

```
mock-wordpress/
├── server.js                  # Express server
├── package.json
├── .env                       # Configuration
├── routes/
│   ├── auth.js               # Login/logout
│   ├── pages.js              # Page routes
│   └── quotes.js             # Quote save API
├── middleware/
│   └── auth.js               # Session authentication
├── views/
│   ├── login.ejs             # Login page
│   ├── quote-page.ejs        # Widget integration page
│   └── my-quotes.ejs         # Saved quotes dashboard
├── public/
│   └── styles.css            # Theme styling
└── data/
    └── storage.js            # In-memory data storage
```

---

## Installation & Setup

### 1. SimplePrint Server Setup

```bash
cd E:\simplePrint
npm install

# Start server
npm start
# Server runs on http://localhost:3080
```

**Admin Access:**
- URL: http://localhost:3080/admin
- Username: `admin`
- Password: `admin123`

### 2. Mock WordPress Server Setup

```bash
cd E:\wpTest\mock-wordpress
npm install

# Start server (with auto-reload)
npm run dev
# Server runs on http://localhost:3088
```

**Test Users:**
- `customer1` / `pass123` (customer role)
- `agent1` / `pass123` (agent role)
- `admin` / `pass123` (admin role)

---

## Configuration

### SimplePrint Server (.env or app.js)

```javascript
PORT=3080
JWT_SECRET=your-secret-key-change-this-in-production
```

### CORS Configuration (E:\simplePrint\middleware\cors.js)

```javascript
const allowedOrigins = [
    'http://localhost:3080',
    'http://localhost:3088',  // Mock WordPress
    'http://localhost:8080',
    'https://yourwordpress.com',
    'https://staging.yourwordpress.com'
];
```

### Mock WordPress (.env)

```env
PORT=3088
CALCULATOR_HOST=http://localhost:3080
SESSION_SECRET=mock-wp-secret-key
NODE_ENV=development
```

---

## Widget Integration

### Embedding the Widget in WordPress

#### 1. Load the Widget Script

```html
<script src="http://localhost:3080/widget.js"></script>
```

#### 2. Create Mount Point

```html
<div id="quote-calculator-widget"></div>
```

#### 3. Initialize Widget

```javascript
const widget = window.SimplePrintWidget.init({
  mountPoint: '#quote-calculator-widget',
  productId: null,  // Optional: pre-select product
  onPayload: handlePayload,
  onError: handleError
});

function handlePayload(payload) {
  console.log('Quote calculated:', payload);
  // Handle the calculated quote
}

function handleError(error) {
  console.error('Widget error:', error);
}
```

### Widget Features

1. **Auto-loading**: Fetches products from API on initialization
2. **Product Selection**: Dropdown populated with active products
3. **Dynamic Forms**: Papers, quantities, and upgrades filtered per product
4. **Live Calculation**: Auto-calculates price as user changes selections
5. **Price Display**: Shows breakdown (base price, upgrades, total)
6. **Save Functionality**: Button to save quote to WordPress backend

---

## API Endpoints

### Product Endpoints

#### Get All Products
```http
GET /api/v1/products
Response: { "products": [...] }
```

#### Get Product Details
```http
GET /api/v1/products/:id
Response: {
  "data": {
    "id": "1",
    "name": "Standard Business Cards",
    "sizes": [...],
    "quantityPrices": [...],
    "availablePapers": [...],
    "upgrades": [...]
  }
}
```

### Calculation Endpoint

```http
POST /api/v1/calculate
Content-Type: application/json

{
  "productId": "1",
  "paperId": "P001",
  "quantity": 100,
  "size": "Standard US",
  "upgradeNames": ["Rounded Corners"]
}

Response: {
  "data": {
    "inputs": {
      "productId": "1",
      "productName": "Standard Business Cards",
      "quantity": 100,
      "paperId": "P001",
      "paperName": "Glossy",
      "size": "Standard US",
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
    "lineItems": [...],
    "appliedUpgrades": [...],
    "engineMeta": {
      "version": "v1.0.0",
      "calcMs": 15,
      "timestamp": "2025-10-03T00:00:00.000Z"
    }
  }
}
```

### Resource Endpoints

```http
GET /api/papers
Response: [{ "id": "P001", "name": "Glossy", ... }]

GET /api/upgrades
Response: [{ "name": "Rounded Corners", "upgradeCost": 2, ... }]
```

---

## WordPress Integration - Saving Quotes

### Mock WordPress Save Endpoint

```javascript
POST /api/quotes/save
Content-Type: application/json

{
  "productId": "1",
  "productName": "Standard Business Cards",
  "quantity": 100,
  "paperId": "P001",
  "paperName": "Glossy",
  "size": "Standard US",
  "upgrades": ["Rounded Corners"],
  "totals": {
    "basePrice": 20,
    "grandTotal": 22,
    "unitPrice": 0.22
  },
  "lineItems": [...],
  "appliedUpgrades": [...]
}

Response: {
  "success": true,
  "quote_id": 1,
  "message": "Quote saved successfully"
}
```

### Implementing in Real WordPress

#### 1. Create WordPress REST Endpoint

```php
// functions.php or custom plugin
add_action('rest_api_init', function () {
    register_rest_route('simpleprint/v1', '/quotes/save', array(
        'methods' => 'POST',
        'callback' => 'save_quote_callback',
        'permission_callback' => 'is_user_logged_in'
    ));
});

function save_quote_callback($request) {
    $payload = $request->get_json_params();
    $user_id = get_current_user_id();

    // Validate required fields
    if (!isset($payload['productId']) || !isset($payload['quantity']) || !isset($payload['totals'])) {
        return new WP_Error('invalid_payload', 'Invalid payload structure', array('status' => 400));
    }

    // Save as custom post type or post meta
    $quote_id = wp_insert_post(array(
        'post_type' => 'quote',
        'post_status' => 'draft',
        'post_author' => $user_id,
        'post_title' => sprintf('Quote #%s - %s', time(), $payload['productName']),
        'meta_input' => array(
            'quote_data' => json_encode($payload),
            'product_id' => $payload['productId'],
            'quantity' => $payload['quantity'],
            'grand_total' => $payload['totals']['grandTotal']
        )
    ));

    if (is_wp_error($quote_id)) {
        return new WP_Error('save_failed', 'Failed to save quote', array('status' => 500));
    }

    return array(
        'success' => true,
        'quote_id' => $quote_id,
        'message' => 'Quote saved successfully'
    );
}
```

#### 2. Update Widget Integration Script

```javascript
// Override widget's save button handler
setTimeout(() => {
  const saveBtn = document.getElementById('sp-save-quote-btn');
  if (saveBtn) {
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);
    newBtn.addEventListener('click', async () => {
      if (!currentPayload) return;

      const savePayload = {
        productId: currentPayload.inputs?.productId,
        productName: currentPayload.inputs?.productName,
        quantity: currentPayload.inputs?.quantity,
        paperId: currentPayload.inputs?.paperId,
        paperName: currentPayload.inputs?.paperName,
        size: currentPayload.inputs?.size,
        upgrades: currentPayload.inputs?.upgrades || [],
        totals: currentPayload.totals || {},
        lineItems: currentPayload.lineItems || [],
        appliedUpgrades: currentPayload.appliedUpgrades || []
      };

      try {
        const response = await fetch('/wp-json/simpleprint/v1/quotes/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': wpApiSettings.nonce  // WordPress nonce
          },
          body: JSON.stringify(savePayload)
        });

        const result = await response.json();

        if (result.success) {
          alert('Quote saved successfully!');
          window.location.href = '/my-quotes';
        } else {
          alert('Failed to save: ' + result.message);
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }
}, 1000);
```

---

## Testing Workflow

### 1. Start Both Servers

**Terminal 1: SimplePrint**
```bash
cd E:\simplePrint
npm start
```

**Terminal 2: Mock WordPress**
```bash
cd E:\wpTest\mock-wordpress
npm run dev
```

### 2. Test Flow

1. Visit http://localhost:3088
2. Login with `customer1` / `pass123`
3. You'll be redirected to `/quote` page
4. Widget loads with product list
5. Select a product → papers and quantities populate
6. Change selections → price auto-calculates
7. Click "Save Quote" → saved to WordPress
8. Visit `/my-quotes` → see saved quotes

### 3. Verify Admin Panel

1. Visit http://localhost:3080/admin
2. Login with `admin` / `admin123`
3. Manage products, papers, upgrades

---

## Security Considerations

### Production Checklist

1. **Change Default Credentials**
   - Update admin password in `E:\simplePrint\data\admins.json`
   - Use environment variables for secrets

2. **Enable API Authentication**
   - Uncomment `authenticateAPI` middleware
   - Generate JWT tokens for WordPress sites
   - Store tokens securely

3. **CORS Configuration**
   - Update allowed origins with production domains
   - Remove localhost origins

4. **HTTPS**
   - Use HTTPS for all production endpoints
   - Update widget URLs to use HTTPS

5. **Rate Limiting**
   - Configure appropriate limits in `middleware/rateLimiter.js`
   - Monitor API usage

6. **Input Validation**
   - Validate all API inputs
   - Sanitize user data before storage

---

## Troubleshooting

### Widget Not Loading

**Symptom**: `SimplePrintWidget is undefined`

**Solutions**:
1. Check widget.js exists: `E:\simplePrint\public\widget.js`
2. Verify CORS allows your domain
3. Check browser console for errors
4. Confirm SimplePrint server is running on port 3080

### Products Not Showing

**Symptom**: Dropdown shows "-- Choose a Product --" only

**Solutions**:
1. Check `/api/v1/products` endpoint returns data
2. Verify products have `isActive !== false`
3. Check browser network tab for API errors
4. Restart SimplePrint server

### Price Not Calculating

**Symptom**: No price shown after selecting options

**Solutions**:
1. Open browser console for errors
2. Check all required fields (product, paper, quantity)
3. Verify `/api/v1/calculate` endpoint works
4. Check product has valid `quantityPrices`

### Save Quote Fails

**Symptom**: "Invalid payload structure" error

**Solutions**:
1. Check `currentPayload` has required fields
2. Verify payload transformation matches expected format
3. Check WordPress endpoint expects correct structure
4. Review browser console for request details

---

## Data Schema

### Product Object

```json
{
  "id": "1",
  "name": "Standard Business Cards",
  "description": "Professional business cards",
  "isActive": true,
  "sizes": [
    {
      "name": "Standard US",
      "width": 3.5,
      "height": 2,
      "priceMultiplier": 1
    }
  ],
  "quantityPrices": [
    { "quantity": 50, "price": 15 },
    { "quantity": 100, "price": 20 },
    { "quantity": 250, "price": 35 }
  ],
  "availablePapers": [
    {
      "id": "P001",
      "name": "Glossy",
      "category": "Standard",
      "upgradeCost": 0
    }
  ],
  "upgrades": [
    {
      "name": "Rounded Corners",
      "description": "Quarter-inch rounded edges",
      "upgradeCost": 2
    }
  ],
  "selectedPaperIds": ["P001", "P002"]
}
```

### Quote Object (Saved in WordPress)

```json
{
  "id": 1,
  "user_id": 1,
  "company_id": 1,
  "status": "draft",
  "created_at": "2025-10-03T00:00:00.000Z",
  "payload": {
    "productId": "1",
    "productName": "Standard Business Cards",
    "quantity": 100,
    "paperId": "P001",
    "paperName": "Glossy",
    "size": "Standard US",
    "upgrades": ["Rounded Corners"],
    "totals": {
      "basePrice": 20,
      "paperUpgrade": 0,
      "upgradesCost": 2,
      "grandTotal": 22,
      "unitPrice": 0.22
    }
  }
}
```

---

## Maintenance

### Adding New Products

1. Login to admin panel: http://localhost:3080/admin
2. Navigate to Products
3. Click "Add New Product"
4. Configure:
   - Name, description
   - Sizes with multipliers
   - Quantity price tiers
   - Available papers
   - Upgrades
5. Save and mark as active

### Updating Papers

1. Admin panel → Papers
2. Edit existing or add new
3. Update upgrade costs
4. Assign to products

### Managing Upgrades

1. Admin panel → Upgrades
2. Create/edit upgrade options
3. Set per-unit costs
4. Assign to relevant products

---

## Support & Documentation

- **SimplePrint Admin**: http://localhost:3080/admin
- **API Documentation**: http://localhost:3080/api-docs (if Swagger enabled)
- **Mock WordPress**: http://localhost:3088
- **Test Login Page**: http://localhost:3088/auth/login

---

## Future Enhancements

1. **Real-time Updates**: WebSocket for live price updates
2. **Product Variants**: Color options, custom sizes
3. **File Upload**: Customer artwork handling
4. **Order Management**: Convert quotes to orders
5. **Email Notifications**: Quote confirmations
6. **Payment Integration**: Stripe/PayPal checkout
7. **Multi-language**: i18n support
8. **Analytics**: Track popular products and quote conversions

---

**Last Updated**: 2025-10-03
**Version**: 1.0.0
**Authors**: Claude Code & Development Team
