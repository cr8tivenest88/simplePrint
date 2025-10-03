# Mock WordPress Server

This is a mock WordPress server built with Express.js to test the SimplePrint calculator widget integration.

## Purpose

This mock server simulates a WordPress environment to demonstrate how the SimplePrint calculator widget can be embedded into WordPress pages and how quotes can be saved to a WordPress backend.

## Features

- User authentication (login/logout)
- Quote calculator page with embedded SimplePrint widget
- Quote saving and management
- "My Quotes" page for viewing saved quotes
- REST API endpoint for saving quotes
- Session management
- In-memory data storage

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create .env file:**
   Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables:**
   ```
   PORT=3088
   CALCULATOR_HOST=http://localhost:3080
   SESSION_SECRET=your-secret-key
   NODE_ENV=development
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Login page: http://localhost:3088/login
   - Quote calculator: http://localhost:3088/quote
   - My quotes: http://localhost:3088/my-quotes

## Test Users

The mock server comes with pre-configured test users:

| Username   | Password     | Role     |
|------------|--------------|----------|
| customer1  | password123  | customer |
| agent1     | password123  | agent    |
| admin      | password123  | admin    |

## Project Structure

```
mock-wordpress/
├── data/
│   └── storage.js          # In-memory data storage
├── middleware/
│   └── auth.js             # Authentication middleware
├── public/
│   └── styles.css          # CSS styles
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── pages.js            # Page routes
│   └── quotes.js           # Quote API routes
├── views/
│   ├── login.ejs           # Login page
│   ├── quote-page.ejs      # Calculator page
│   └── my-quotes.ejs       # User quotes page
├── .env.example            # Environment variables template
├── package.json            # Dependencies
├── server.js               # Main server file
└── README.md               # This file
```

## How It Works

### Widget Integration

The calculator page loads the SimplePrint widget from the calculator server:

```html
<script src="http://localhost:3080/widget.js"></script>
<script>
  SimplePrintWidget.init({
    mountPoint: '#calculator-widget',
    onPayload: handlePayload,
    onError: handleError
  });
</script>
```

### Quote Saving Flow

1. User configures product in calculator widget
2. Widget auto-calculates price in real-time
3. User clicks "Save Quote"
4. Quote data is sent to WordPress `/api/quotes` endpoint
5. WordPress saves quote to database (in-memory for mock)
6. User can view saved quotes in "My Quotes" page

### API Endpoints

**POST /api/quotes**
- Saves a quote for the current user
- Requires authentication
- Request body: Quote payload from calculator

**GET /api/quotes**
- Retrieves quotes for current user
- Requires authentication
- Returns array of user's quotes

## Integration with SimplePrint

This mock server demonstrates the integration pattern for real WordPress sites:

1. **SimplePrint Server** (port 3080):
   - Hosts the calculator widget (widget.js)
   - Provides product and pricing APIs
   - Handles price calculations

2. **WordPress Site** (this mock on port 3088):
   - Embeds the widget on product pages
   - Handles user authentication
   - Saves and manages quotes
   - Displays quote history

## For Real WordPress Implementation

See the comprehensive WordPress integration guide:
- [WordPress Integration Guide](../docs/WORDPRESS-INTEGRATION-GUIDE.md)

The guide includes:
- Plugin development structure
- Shortcode implementation
- Database schema
- Security best practices
- Complete code examples

## Development

### Start in development mode:
```bash
npm run dev
```

### Start in production mode:
```bash
npm start
```

## Notes

- This is a **mock server for testing only**
- Uses in-memory storage (data resets on restart)
- For production, use actual WordPress with database
- CORS is configured to allow localhost origins
- Session secret should be changed in production

## License

This mock server is part of the SimplePrint calculator project.
