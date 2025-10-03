const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const corsMiddleware = require('./middleware/cors');
const { apiLimiter, calcLimiter } = require('./middleware/rateLimiter');
const JsonDB = require('./utils/jsonDb');

const app = express();
const port = process.env.PORT || 3080;
const paperData = new JsonDB('paper-data.json');
const productsDb = new JsonDB('products.json');

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for static files (widget.js specifically)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('widget.js')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    }
  }
}));

// Configure multer for handling multipart/form-data
const upload = multer();
app.use(upload.none()); // For forms without file uploads

// Cookie parser middleware
app.use(cookieParser());

// CORS middleware for API routes
app.use('/api', corsMiddleware);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SimplePrint API Documentation'
}));

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const calculatorRoutes = require('./routes/calculatorRoutes');
const authRoutes = require('./routes/authRoutes');

// API routes with rate limiting
app.use('/api/v1', apiLimiter, calculatorRoutes);
app.use('/api/v1/auth', authRoutes);

// Apply stricter rate limit to calculation endpoint
app.post('/api/v1/calculate', calcLimiter);

// Admin routes
app.use('/admin', adminRoutes);

// API endpoints
app.get('/api/papers', async (req, res) => {
    try {
        const data = await paperData.readData();
        res.json(data.papers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/upgrades', async (req, res) => {
    try {
        const data = await paperData.readData();
        res.json(data.upgrades);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
