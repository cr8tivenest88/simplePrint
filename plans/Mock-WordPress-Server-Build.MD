# Mock WordPress Server — Build Instructions

## Purpose
Create a standalone Node.js server that mimics WordPress behavior for testing the calculator widget integration **before** moving to actual WordPress development. This allows you to validate the entire flow (token request → calculation → save) without WordPress dependencies.

---

## Server Responsibilities

The mock WordPress server will:
1. Serve HTML pages with the calculator widget mount point
2. Simulate WordPress user authentication/sessions
3. Provide REST endpoints to save quote payloads
4. Display saved quotes in a "My Quotes" dashboard
5. Handle CORS and security patterns that WordPress would use

---

## Technology Stack

- **Runtime**: Node.js (same as calculator server)
- **Framework**: Express.js
- **Session**: express-session with memory store (or Redis for persistence)
- **Template**: EJS or Pug for server-side rendering
- **Database**: SQLite or in-memory array (simple storage)
- **Auth**: Simple username/password (no real encryption needed for testing)

---

## Project Structure

```
mock-wordpress/
├── server.js                 # Main Express app
├── package.json
├── .env                      # Config (port, calculator URL, session secret)
├── routes/
│   ├── auth.js              # Login/logout routes
│   ├── quotes.js            # REST API for saving/listing quotes
│   └── pages.js             # HTML page routes
├── middleware/
│   ├── auth.js              # Check if user is logged in
│   └── cors.js              # CORS config if needed
├── views/
│   ├── login.ejs            # Login page
│   ├── quote-page.ejs       # Page with widget mount point
│   └── my-quotes.ejs        # Dashboard showing saved quotes
├── public/
│   └── styles.css           # Optional theme CSS to test widget styling
└── data/
    └── storage.js           # Simple in-memory or SQLite storage
```

---

## Step-by-Step Build Plan

### Phase 1: Basic Server Setup

**1.1 Initialize project**
```bash
mkdir mock-wordpress
cd mock-wordpress
npm init -y
npm install express express-session dotenv ejs body-parser cookie-parser
npm install --save-dev nodemon
```

**1.2 Create `.env` file**
```env
PORT=3000
CALCULATOR_HOST=http://localhost:3080
SESSION_SECRET=mock-wp-secret-key
NODE_ENV=development
```

**1.3 Create `server.js` skeleton**
```javascript
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Routes (to be created)
// app.use('/auth', require('./routes/auth'));
// app.use('/api/quotes', require('./routes/quotes'));
// app.use('/', require('./routes/pages'));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mock WordPress running on http://localhost:${PORT}`);
});
```

---

### Phase 2: User Authentication (Simple Mock)

**2.1 Create `data/storage.js`**
```javascript
// In-memory storage (replace with SQLite if needed)
const users = [
  { id: 1, username: 'customer1', password: 'pass123', role: 'customer', company_id: 1 },
  { id: 2, username: 'agent1', password: 'pass123', role: 'agent', company_id: 1 },
  { id: 3, username: 'admin', password: 'pass123', role: 'admin', company_id: null }
];

const quotes = [];
let quoteIdCounter = 1;

module.exports = {
  users,
  quotes,
  getNextQuoteId: () => quoteIdCounter++,
  findUserByUsername: (username) => users.find(u => u.username === username),
  findUserById: (id) => users.find(u => u.id === id),
  saveQuote: (quote) => {
    quote.id = module.exports.getNextQuoteId();
    quote.created_at = new Date().toISOString();
    quotes.push(quote);
    return quote;
  },
  getQuotesByUser: (userId, role, companyId) => {
    if (role === 'admin') return quotes;
    if (role === 'agent') return quotes.filter(q => q.company_id === companyId);
    return quotes.filter(q => q.user_id === userId);
  }
};
```

**2.2 Create `middleware/auth.js`**
```javascript
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

function attachUser(req, res, next) {
  if (req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
}

module.exports = { requireAuth, attachUser };
```

**2.3 Create `routes/auth.js`**
```javascript
const express = require('express');
const router = express.Router();
const { findUserByUsername } = require('../data/storage');

// GET /auth/login
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = findUserByUsername(username);

  if (!user || user.password !== password) {
    return res.render('login', { error: 'Invalid credentials' });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    company_id: user.company_id
  };

  res.redirect('/quote');
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
```

**2.4 Create `views/login.ejs`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Mock WordPress</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
  <div class="container">
    <h1>Mock WordPress Login</h1>
    <% if (error) { %>
      <p class="error"><%= error %></p>
    <% } %>
    <form method="POST" action="/auth/login">
      <div>
        <label>Username:</label>
        <input type="text" name="username" required>
        <small>Try: customer1, agent1, or admin</small>
      </div>
      <div>
        <label>Password:</label>
        <input type="password" name="password" required>
        <small>Password: pass123</small>
      </div>
      <button type="submit">Login</button>
    </form>
  </div>
</body>
</html>
```

---

### Phase 3: Quote Page with Widget Mount Point

**3.1 Create `routes/pages.js`**
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const { getQuotesByUser } = require('../data/storage');

router.use(attachUser);

// Redirect root to quote page
router.get('/', (req, res) => {
  res.redirect('/quote');
});

// Quote page (widget mounts here)
router.get('/quote', requireAuth, (req, res) => {
  res.render('quote-page', {
    calculatorHost: process.env.CALCULATOR_HOST
  });
});

// My Quotes dashboard
router.get('/my-quotes', requireAuth, (req, res) => {
  const user = req.session.user;
  const quotes = getQuotesByUser(user.id, user.role, user.company_id);
  res.render('my-quotes', { quotes });
});

module.exports = router;
```

**3.2 Create `views/quote-page.ejs`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Get a Quote - Mock WordPress</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Mock WordPress - Quote Calculator</h1>
      <nav>
        <span>Logged in as: <strong><%= user.username %></strong> (<%= user.role %>)</span>
        <a href="/my-quotes">My Quotes</a>
        <a href="/auth/logout">Logout</a>
      </nav>
    </header>

    <main>
      <h2>Get Your Print Quote</h2>

      <!-- Widget mount point -->
      <div id="quote-calculator-widget"></div>

      <!-- Results display -->
      <div id="quote-results" style="display:none;">
        <h3>Quote Summary</h3>
        <div id="results-content"></div>
        <button id="save-quote-btn">Save Quote</button>
      </div>
    </main>
  </div>

  <!-- Load the calculator widget from Node server -->
  <script src="<%= calculatorHost %>/widget.js"></script>

  <script>
    // Initialize widget
    const widget = window.SimplePrintWidget.init({
      mountPoint: '#quote-calculator-widget',
      productId: 1, // Default product
      onPayload: handlePayload,
      onError: handleError
    });

    let currentPayload = null;

    function handlePayload(payload) {
      currentPayload = payload;

      // Display results
      document.getElementById('results-content').innerHTML = `
        <p><strong>Product:</strong> ${payload.productId}</p>
        <p><strong>Quantity:</strong> ${payload.quantity}</p>
        <p><strong>Unit Price:</strong> $${payload.totals.unit.toFixed(2)}</p>
        <p><strong>Setup Fee:</strong> $${payload.totals.setup.toFixed(2)}</p>
        <p><strong>Grand Total:</strong> $${payload.totals.grandTotal.toFixed(2)}</p>
        <p><em>Calculated in ${payload.meta.computeDuration}ms</em></p>
      `;

      document.getElementById('quote-results').style.display = 'block';
    }

    function handleError(error) {
      alert('Error: ' + error.message);
    }

    // Save quote to WordPress
    document.getElementById('save-quote-btn').addEventListener('click', async () => {
      if (!currentPayload) return;

      try {
        const response = await fetch('/api/quotes/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentPayload)
        });

        const result = await response.json();

        if (result.success) {
          alert('Quote saved successfully!');
          window.location.href = '/my-quotes';
        } else {
          alert('Failed to save quote: ' + result.message);
        }
      } catch (err) {
        alert('Error saving quote: ' + err.message);
      }
    });
  </script>
</body>
</html>
```

---

### Phase 4: REST API for Saving Quotes

**4.1 Create `routes/quotes.js`**
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { saveQuote } = require('../data/storage');

// POST /api/quotes/save
router.post('/save', requireAuth, (req, res) => {
  try {
    const payload = req.body;
    const user = req.session.user;

    // Validate payload
    if (!payload.productId || !payload.quantity || !payload.totals) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload structure'
      });
    }

    // Create quote record
    const quote = {
      user_id: user.id,
      company_id: user.company_id,
      payload: payload,
      status: 'draft'
    };

    const saved = saveQuote(quote);

    res.json({
      success: true,
      quote_id: saved.id,
      message: 'Quote saved successfully'
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/quotes/list (optional: for AJAX loading)
router.get('/list', requireAuth, (req, res) => {
  const user = req.session.user;
  const quotes = getQuotesByUser(user.id, user.role, user.company_id);
  res.json({ success: true, quotes });
});

module.exports = router;
```

---

### Phase 5: My Quotes Dashboard

**5.1 Create `views/my-quotes.ejs`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Quotes - Mock WordPress</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>My Quotes</h1>
      <nav>
        <span>Logged in as: <strong><%= user.username %></strong> (<%= user.role %>)</span>
        <a href="/quote">New Quote</a>
        <a href="/auth/logout">Logout</a>
      </nav>
    </header>

    <main>
      <% if (quotes.length === 0) { %>
        <p>No quotes yet. <a href="/quote">Create your first quote</a>.</p>
      <% } else { %>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Grand Total</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <% quotes.forEach(q => { %>
              <tr>
                <td><%= q.id %></td>
                <td><%= q.payload.productId %></td>
                <td><%= q.payload.quantity %></td>
                <td>$<%= q.payload.totals.grandTotal.toFixed(2) %></td>
                <td><%= new Date(q.created_at).toLocaleString() %></td>
                <td><%= q.status %></td>
              </tr>
            <% }); %>
          </tbody>
        </table>
      <% } %>
    </main>
  </div>
</body>
</html>
```

---

### Phase 6: Basic Styling

**6.1 Create `public/styles.css`**
```css
/* Simple theme to test widget style inheritance */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f4f4f4;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  min-height: 100vh;
}

header {
  border-bottom: 2px solid #0073aa;
  padding-bottom: 15px;
  margin-bottom: 30px;
}

header h1 {
  color: #0073aa;
  margin-bottom: 10px;
}

nav {
  display: flex;
  gap: 20px;
  align-items: center;
}

nav a {
  color: #0073aa;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}

form div {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}

input, select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background: #0073aa;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background: #005a87;
}

.error {
  color: #dc3232;
  background: #ffeaea;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background: #f9f9f9;
  font-weight: 600;
}

#quote-results {
  margin-top: 30px;
  padding: 20px;
  background: #f0f7fb;
  border-radius: 4px;
}

#quote-results h3 {
  color: #0073aa;
  margin-bottom: 15px;
}

#results-content p {
  margin-bottom: 8px;
}

small {
  display: block;
  color: #666;
  font-size: 0.85em;
  margin-top: 3px;
}
```

---

### Phase 7: Wire Everything Together

**7.1 Update `server.js` with all routes**
```javascript
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/', require('./routes/pages'));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mock WordPress running on http://localhost:${PORT}`);
  console.log(`Calculator host: ${process.env.CALCULATOR_HOST}`);
  console.log('\nTest users:');
  console.log('  - customer1 / pass123 (customer role)');
  console.log('  - agent1 / pass123 (agent role)');
  console.log('  - admin / pass123 (admin role)');
});
```

**7.2 Update `package.json` scripts**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

---

## Testing Workflow

### Test Sequence
1. **Start calculator server** (port 3080)
   ```bash
   cd E:\simplePrint
   npm start
   ```

2. **Start mock WordPress server** (port 3000)
   ```bash
   cd mock-wordpress
   npm run dev
   ```

3. **Test flow**:
   - Visit `http://localhost:3000` → redirects to login
   - Login as `customer1` / `pass123`
   - Redirected to `/quote` → widget loads from calculator server
   - Fill form and submit → payload displays
   - Click "Save Quote" → saves to mock WP storage
   - Visit `/my-quotes` → see saved quotes

4. **Test role-based access**:
   - Login as different users (customer, agent, admin)
   - Verify quotes visibility matches role scopes

---

## Key Integration Points to Validate

### 1. CORS Configuration
- Calculator server must allow `http://localhost:3000` origin
- Widget file and API endpoints must respond to preflight OPTIONS
- Test with browser DevTools Network tab

### 2. Widget Mounting
- Widget renders inside `#quote-calculator-widget` div
- Widget inherits CSS from `styles.css` (buttons, inputs match theme)
- No shadow DOM or iframe isolation

### 3. Payload Contract
- Widget calls calculator API with correct input structure
- Calculator returns payload with fields: `productId`, `quantity`, `totals`, `meta`
- WordPress receives and saves complete payload

### 4. Session & Auth
- Quote page requires login (redirects if not authenticated)
- Save endpoint validates session before storing
- User ID and company ID attach to saved quotes

### 5. Error Handling
- Widget displays validation errors from calculator
- Network timeouts show user-friendly messages
- Failed saves don't lose form data

---

## Next Steps After Mock Server Works

1. **Document the payload schema** (v1 contract freeze)
2. **Capture request/response examples** for WordPress developers
3. **Test CORS thoroughly** with production domains in allow-list
4. **Benchmark calculator latency** under typical load
5. **Begin WordPress plugin development** using this mock as reference

---

## Optional Enhancements (Later)

- Add SQLite persistence (replace in-memory storage)
- Implement JWT token exchange (WP → Node for user context)
- Add CSP headers to test script loading policies
- Create admin panel for viewing all quotes
- Export quotes as CSV or PDF
- Implement rate limiting middleware

---

## Acceptance Criteria

- [ ] Mock WP server runs on port 3000
- [ ] Login works for all three test users
- [ ] Quote page loads widget from calculator server (port 3080)
- [ ] Widget renders in page DOM and inherits theme CSS
- [ ] Form submission returns valid payload
- [ ] Payload displays in results section
- [ ] Save button creates quote record with user ID and company ID
- [ ] My Quotes page shows correct quotes per role scope
- [ ] No CORS errors in browser console
- [ ] All test users can complete full flow: login → quote → save → view

---

## Troubleshooting

**Widget doesn't load**:
- Check calculator server is running on 3080
- Verify CORS allows localhost:3000
- Check browser console for script errors

**Save fails**:
- Verify session middleware is active
- Check payload structure matches expected fields
- Look at server console logs for errors

**Quotes not showing**:
- Confirm user ID and role are in session
- Check `getQuotesByUser` filter logic
- Verify quote was saved with correct user_id

**Styling doesn't inherit**:
- Widget must render in light DOM (no shadow)
- Check CSS selectors apply to widget HTML
- Verify widget doesn't override with inline styles
