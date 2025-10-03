const rateLimit = require('express-rate-limit');

// Rate limiter for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: '15 minutes'
        });
    }
});

// Stricter rate limiter for calculation endpoint (more resource-intensive)
const calcLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 calculations per windowMs
    message: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many calculation requests, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many calculation requests, please try again later.',
            retryAfter: '15 minutes'
        });
    }
});

module.exports = {
    apiLimiter,
    calcLimiter
};
