const express = require('express');
const router = express.Router();
const { generateApiToken } = require('../middleware/apiAuth');
const auth = require('../middleware/auth'); // Admin auth

/**
 * @swagger
 * /api/v1/auth/token:
 *   post:
 *     summary: Generate API access token
 *     description: Admin endpoint to generate API tokens for WordPress or other clients
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - origin
 *             properties:
 *               clientId:
 *                 type: string
 *                 description: Unique identifier for the client
 *                 example: "wordpress-site-1"
 *               origin:
 *                 type: string
 *                 description: Allowed origin domain
 *                 example: "https://yourwordpress.com"
 *               description:
 *                 type: string
 *                 description: Optional description for this token
 *                 example: "Production WordPress site"
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 expiresIn:
 *                   type: string
 *                   example: "24h"
 *                 usage:
 *                   type: string
 *                   example: "Include in requests: Authorization: Bearer <token>"
 *       401:
 *         description: Unauthorized - admin access required
 *       400:
 *         description: Invalid input
 */
router.post('/token', auth, (req, res) => {
    try {
        const { clientId, origin, description } = req.body;

        // Validate input
        if (!clientId || !origin) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'clientId and origin are required'
            });
        }

        // Validate origin format
        try {
            new URL(origin);
        } catch (e) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'origin must be a valid URL (e.g., https://yoursite.com)'
            });
        }

        // Generate token
        const token = generateApiToken({ clientId, origin });

        res.json({
            token: token,
            expiresIn: process.env.JWT_EXPIRY || '24h',
            clientId: clientId,
            origin: origin,
            description: description || null,
            usage: 'Include in API requests: Authorization: Bearer <token>',
            generatedAt: new Date().toISOString(),
            generatedBy: req.admin?.username || 'admin'
        });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({
            error: 'SERVER_ERROR',
            message: 'Failed to generate token',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/auth/verify:
 *   get:
 *     summary: Verify API token
 *     description: Check if the provided token is valid and get client info
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 clientId:
 *                   type: string
 *                 origin:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Invalid or expired token
 */
router.get('/verify', (req, res) => {
    const { verifyApiToken } = require('../middleware/apiAuth');

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'No valid authorization token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyApiToken(token);

        res.json({
            valid: true,
            clientId: decoded.clientId,
            origin: decoded.origin,
            issuedAt: new Date(decoded.iat * 1000).toISOString(),
            expiresAt: new Date(decoded.exp * 1000).toISOString()
        });
    } catch (error) {
        res.status(401).json({
            error: 'UNAUTHORIZED',
            message: error.message,
            valid: false
        });
    }
});

module.exports = router;
