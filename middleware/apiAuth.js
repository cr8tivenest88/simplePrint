const jwt = require('jsonwebtoken');

// Secret key for JWT (should be in environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * Generate API token
 * @param {Object} payload - Data to encode in token
 * @param {string} payload.clientId - Client identifier (e.g., WordPress site ID)
 * @param {string} payload.origin - Allowed origin domain
 * @returns {string} JWT token
 */
function generateApiToken(payload) {
    return jwt.sign(
        {
            clientId: payload.clientId,
            origin: payload.origin,
            type: 'api-access',
            iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

/**
 * Verify and decode API token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
function verifyApiToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify token type
        if (decoded.type !== 'api-access') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
}

/**
 * Middleware to authenticate API requests
 */
function authenticateAPI(req, res, next) {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'No authorization token provided',
                hint: 'Include "Authorization: Bearer <token>" header'
            });
        }

        // Check Bearer format
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'Invalid authorization format',
                hint: 'Use "Authorization: Bearer <token>"'
            });
        }

        const token = parts[1];

        // Verify token
        const decoded = verifyApiToken(token);

        // Attach client info to request
        req.client = {
            id: decoded.clientId,
            origin: decoded.origin
        };

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: error.message
        });
    }
}

/**
 * Optional middleware - authenticate if token is provided, otherwise allow
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return next();
    }

    try {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            const decoded = verifyApiToken(parts[1]);
            req.client = {
                id: decoded.clientId,
                origin: decoded.origin
            };
        }
    } catch (error) {
        // Token provided but invalid - reject
        return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: error.message
        });
    }

    next();
}

module.exports = {
    generateApiToken,
    verifyApiToken,
    authenticateAPI,
    optionalAuth,
    JWT_SECRET
};
