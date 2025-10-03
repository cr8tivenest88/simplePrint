const express = require('express');
const router = express.Router();
const calculatorService = require('../services/calculatorService');
const { authenticateAPI, optionalAuth } = require('../middleware/apiAuth');

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all active products
 *     description: Returns a list of all active products (summary only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "1"
 *                       name:
 *                         type: string
 *                         example: "Standard Business Cards"
 *                       description:
 *                         type: string
 *                         example: "Professional business cards with various paper options"
 *       500:
 *         description: Server error
 */
router.get('/products', optionalAuth, async (req, res) => {
    try {
        const products = await calculatorService.getAllProducts();
        res.json({ products: products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            error: 'SERVER_ERROR',
            message: 'Failed to fetch products',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product details
 *     description: Returns full product details including sizes, papers, upgrades, and pricing
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *         example: "1"
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     sizes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           width:
 *                             type: number
 *                           height:
 *                             type: number
 *                           priceMultiplier:
 *                             type: number
 *                     quantityPrices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           quantity:
 *                             type: integer
 *                           price:
 *                             type: number
 *                     upgrades:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           upgradeCost:
 *                             type: number
 *                     availablePapers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                           thickness:
 *                             type: string
 *                           finish:
 *                             type: string
 *                           description:
 *                             type: string
 *                           upgradeCost:
 *                             type: number
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.get('/products/:id', optionalAuth, async (req, res) => {
    try {
        const product = await calculatorService.getProductDetails(req.params.id);
        res.json({ data: product });
    } catch (error) {
        console.error('Error fetching product:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            error: statusCode === 404 ? 'NOT_FOUND' : 'SERVER_ERROR',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/calculate:
 *   post:
 *     summary: Calculate print job price
 *     description: Calculates the total price for a print job based on product, quantity, size, paper, and upgrades
 *     tags: [Calculator]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *               - size
 *               - paperId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID
 *                 example: "1"
 *               quantity:
 *                 type: integer
 *                 description: Quantity of items (must be > 0)
 *                 example: 100
 *               size:
 *                 type: string
 *                 description: Size name (e.g., "Standard US")
 *                 example: "Standard US"
 *               paperId:
 *                 type: string
 *                 description: Paper ID (e.g., "P001")
 *                 example: "P001"
 *               upgradeNames:
 *                 type: array
 *                 description: Array of upgrade names (optional)
 *                 items:
 *                   type: string
 *                 example: ["Rounded Corners"]
 *     responses:
 *       200:
 *         description: Calculation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     inputs:
 *                       type: object
 *                       description: Echo of inputs with resolved names
 *                       properties:
 *                         productId:
 *                           type: string
 *                         productName:
 *                           type: string
 *                         quantity:
 *                           type: integer
 *                         size:
 *                           type: string
 *                         paperId:
 *                           type: string
 *                         paperName:
 *                           type: string
 *                         upgrades:
 *                           type: array
 *                           items:
 *                             type: string
 *                     totals:
 *                       type: object
 *                       description: Price breakdown
 *                       properties:
 *                         basePrice:
 *                           type: number
 *                           description: Base price for selected quantity
 *                         sizeMultiplier:
 *                           type: number
 *                           description: Size multiplier applied
 *                         subtotal:
 *                           type: number
 *                           description: Base price after size adjustment
 *                         paperUpgrade:
 *                           type: number
 *                           description: Additional cost for premium paper
 *                         upgradesCost:
 *                           type: number
 *                           description: Total cost of all upgrades
 *                         grandTotal:
 *                           type: number
 *                           description: Final total price
 *                         unitPrice:
 *                           type: number
 *                           description: Price per unit
 *                     lineItems:
 *                       type: array
 *                       description: Detailed breakdown of charges
 *                       items:
 *                         type: object
 *                         properties:
 *                           description:
 *                             type: string
 *                           quantity:
 *                             type: integer
 *                           unitPrice:
 *                             type: number
 *                           total:
 *                             type: number
 *                     appliedUpgrades:
 *                       type: array
 *                       description: List of applied upgrades with details
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           cost:
 *                             type: number
 *                     engineMeta:
 *                       type: object
 *                       description: Metadata about the calculation
 *                       properties:
 *                         version:
 *                           type: string
 *                           example: "v1.0.0"
 *                         calcMs:
 *                           type: integer
 *                           description: Calculation time in milliseconds
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *             example:
 *               data:
 *                 inputs:
 *                   productId: "1"
 *                   productName: "Standard Business Cards"
 *                   quantity: 100
 *                   size: "Standard US"
 *                   paperId: "P001"
 *                   paperName: "Glossy"
 *                   upgrades: ["Rounded Corners"]
 *                 totals:
 *                   basePrice: 20
 *                   sizeMultiplier: 1
 *                   subtotal: 20
 *                   paperUpgrade: 0
 *                   upgradesCost: 2
 *                   grandTotal: 22
 *                   unitPrice: 0.22
 *                 lineItems:
 *                   - description: "Standard Business Cards - 100 units"
 *                     quantity: 100
 *                     unitPrice: 20
 *                     total: 20
 *                   - description: "Rounded Corners"
 *                     quantity: 1
 *                     unitPrice: 2
 *                     total: 2
 *                 appliedUpgrades:
 *                   - name: "Rounded Corners"
 *                     description: "Quarter-inch rounded edges for a modern look."
 *                     cost: 2
 *                 engineMeta:
 *                   version: "v1.0.0"
 *                   calcMs: 15
 *                   timestamp: "2025-10-01T12:00:00.000Z"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
 *                 message:
 *                   type: string
 *                   example: "Invalid input"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Product or resource not found
 *       500:
 *         description: Server error
 */
router.post('/calculate', optionalAuth, async (req, res) => {
    try {
        const result = await calculatorService.calculate(req.body);
        res.json({ data: result });
    } catch (error) {
        console.error('Error calculating price:', error);

        // Determine status code
        let statusCode = 500;
        let errorCode = 'SERVER_ERROR';

        if (error.statusCode === 400 || error.details) {
            statusCode = 400;
            errorCode = 'VALIDATION_ERROR';
        } else if (error.message.includes('not found') || error.message.includes('not available')) {
            statusCode = 404;
            errorCode = 'NOT_FOUND';
        }

        res.status(statusCode).json({
            error: errorCode,
            message: error.message,
            ...(error.details && { details: error.details })
        });
    }
});

/**
 * @swagger
 * /api/v1/papers:
 *   get:
 *     summary: Get all available papers
 *     description: Returns a list of all paper types available for printing
 *     tags: [Resources]
 *     responses:
 *       200:
 *         description: List of papers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       category:
 *                         type: string
 *                       thickness:
 *                         type: string
 *                       finish:
 *                         type: string
 *                       description:
 *                         type: string
 *                       upgradeCost:
 *                         type: number
 *       500:
 *         description: Server error
 */
router.get('/papers', async (req, res) => {
    try {
        const JsonDB = require('../utils/jsonDb');
        const paperData = new JsonDB('paper-data.json');
        const data = await paperData.readData();
        res.json({ data: data.papers });
    } catch (error) {
        console.error('Error fetching papers:', error);
        res.status(500).json({
            error: 'SERVER_ERROR',
            message: 'Failed to fetch papers',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/upgrades:
 *   get:
 *     summary: Get all available upgrades
 *     description: Returns a list of all upgrade options available
 *     tags: [Resources]
 *     responses:
 *       200:
 *         description: List of upgrades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       upgradeCost:
 *                         type: number
 *       500:
 *         description: Server error
 */
router.get('/upgrades', async (req, res) => {
    try {
        const JsonDB = require('../utils/jsonDb');
        const paperData = new JsonDB('paper-data.json');
        const data = await paperData.readData();
        res.json({ data: data.upgrades });
    } catch (error) {
        console.error('Error fetching upgrades:', error);
        res.status(500).json({
            error: 'SERVER_ERROR',
            message: 'Failed to fetch upgrades',
            details: error.message
        });
    }
});

module.exports = router;
