# SimplePrint - Print Pricing API

A Node.js API service that calculates real-time printing quotes for business cards, posters, and other print products. Designed to integrate with WordPress via an embeddable widget.

## Quick Start

### 1. Install dependencies

```bash
# Main server
npm install

# Mock WordPress (for local testing)
cd mock-wordpress
npm install
```

### 2. Configure mock WordPress environment

```bash
cd mock-wordpress
cp .env.example .env
```

Default `.env` values:

```
PORT=3088
CALCULATOR_HOST=http://localhost:3080
SESSION_SECRET=mock-wp-secret-key
NODE_ENV=development
```

### 3. Run both servers

Open two terminals:

**Terminal 1 - SimplePrint API (port 3080):**

```bash
npm run dev
```

**Terminal 2 - Mock WordPress (port 3088):**

```bash
cd mock-wordpress
npm run dev
```

## URLs

| Service | URL |
|---------|-----|
| SimplePrint API | http://localhost:3080 |
| Swagger API Docs | http://localhost:3080/api-docs |
| Admin Panel | http://localhost:3080/admin |
| Mock WordPress Login | http://localhost:3088/auth/login |
| Quote Calculator | http://localhost:3088/quote |
| My Quotes | http://localhost:3088/my-quotes |

## Mock WordPress Test Users

| Username | Password | Role |
|----------|----------|------|
| customer1 | pass123 | customer |
| agent1 | pass123 | agent |
| admin | pass123 | admin |

## How It Works

### Getting a Quote (customer flow)

1. Log in to Mock WordPress at http://localhost:3088/auth/login
2. Go to the **Quote Calculator** at http://localhost:3088/quote
3. Select a product, size, paper type, and quantity
4. The widget calculates the price in real-time via the SimplePrint API
5. Click **Save Quote** to store it
6. View saved quotes at http://localhost:3088/my-quotes

### Managing Products (admin flow)

1. Go to the **Admin Panel** at http://localhost:3080/admin
2. Log in with admin credentials
3. From the dashboard you can:
   - Add, edit, duplicate, or delete **products**
   - Manage **paper types** and upgrades
   - Configure **size presets**
   - Update global **settings** (markup, etc.)

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List all products |
| GET | `/api/v1/products/:id` | Get product details |
| POST | `/api/v1/calculate` | Calculate a print quote |
| GET | `/api/v1/papers` | List paper types |
| GET | `/api/v1/upgrades` | List available upgrades |
| POST | `/api/v1/auth/token` | Generate JWT API token |
| GET | `/api/v1/auth/verify` | Verify a JWT token |

Full interactive docs available at http://localhost:3080/api-docs

## Project Structure

```
simplePrint-1/
├── app.js                    # Main server entry point
├── config/                   # Swagger & database config
├── controllers/              # Admin request handlers
├── data/                     # JSON file storage (products, papers, admins, settings)
├── middleware/                # Auth, CORS, rate limiting
├── models/                   # Data models
├── routes/                   # API, auth, and admin routes
├── services/                 # Price calculation engine
├── utils/                    # JSON DB helper, JWT utilities
├── views/                    # EJS templates (admin panel)
├── public/                   # Static assets & embeddable widget
├── mock-wordpress/           # Mock WordPress server for testing
└── docs/                     # WordPress integration guide
```

## Tech Stack

- **Runtime:** Node.js + Express
- **Data:** JSON file storage (`data/` directory)
- **Auth:** JWT tokens (API) + session cookies (admin)
- **Templates:** EJS
- **Docs:** Swagger/OpenAPI
- **Security:** CORS whitelist, rate limiting
