const cors = require('cors');

// Whitelist of allowed origins (WordPress domains)
const allowedOrigins = [
    'http://localhost',
    'http://localhost:3080',
    'http://localhost:3088',
    'http://localhost:8080',
    'https://yourwordpress.com',
    'https://staging.yourwordpress.com',
    'https://demo.whitefox.lk/'
    // Add your WordPress domain(s) here
];

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

module.exports = cors(corsOptions);
