const JsonDB = require('../utils/jsonDb');

class CalculatorService {
    constructor() {
        this.productsDb = new JsonDB('products.json');
        this.paperData = new JsonDB('paper-data.json');
    }

    /**
     * Calculate price for a print job
     * @param {Object} input - Calculation input
     * @param {string} input.productId - Product ID
     * @param {number} input.quantity - Quantity of items (must be > 0)
     * @param {string} input.size - Size name (e.g., "Standard US")
     * @param {string} input.paperId - Paper ID (e.g., "P001")
     * @param {string} input.colorFront - Front color (Color, Black, or No Print)
     * @param {string} input.colorBack - Back color (Color, Black, or No Print)
     * @param {Array<string>} input.upgradeNames - Array of upgrade names (optional)
     * @returns {Promise<Object>} Calculation result with totals and metadata
     */
    async calculate(input) {
        const startTime = Date.now();

        // Validate inputs
        this.validateInput(input);

        // Fetch product and paper data
        const products = await this.productsDb.findAll('products');
        const product = products.find(p => p.id === input.productId);

        if (!product) {
            throw new Error(`Product with ID "${input.productId}" not found`);
        }

        if (!product.isActive) {
            throw new Error(`Product "${product.name}" is not currently available`);
        }

        const paperDataObj = await this.paperData.readData();

        // Find matching quantity price
        const quantityPrice = product.quantityPrices.find(
            qp => qp.quantity === input.quantity
        );

        if (!quantityPrice) {
            const validQuantities = product.quantityPrices.map(qp => qp.quantity).join(', ');
            throw new Error(
                `Invalid quantity ${input.quantity}. Valid quantities: ${validQuantities}`
            );
        }

        // Find matching size
        const size = product.sizes.find(s => s.name === input.size);
        if (!size) {
            const validSizes = product.sizes.map(s => s.name).join(', ');
            throw new Error(
                `Invalid size "${input.size}". Valid sizes: ${validSizes}`
            );
        }

        // Find matching paper
        const paper = paperDataObj.papers.find(p => p.id === input.paperId);
        if (!paper) {
            throw new Error(`Paper with ID "${input.paperId}" not found`);
        }

        // Validate paper is selected for this product
        if (product.selectedPaperIds && product.selectedPaperIds.length > 0) {
            if (!product.selectedPaperIds.includes(input.paperId)) {
                throw new Error(
                    `Paper "${paper.name}" is not available for product "${product.name}"`
                );
            }
        }

        // Calculate number up (how many pieces fit on parent sheet)
        const bleed = 0.125;
        const jobWidth = size.width + (bleed * 2);
        const jobHeight = size.height + (bleed * 2);
        const acrossSheet = Math.floor(paper.parentSheetSize.width / jobWidth);
        const downSheet = Math.floor(paper.parentSheetSize.height / jobHeight);
        const numberUp = acrossSheet * downSheet;

        // Calculate sheets needed for quantity
        const sheetsNeeded = Math.ceil(input.quantity / numberUp);

        // Calculate paper cost
        const paperCostPerSheet = paper.costPerSheet || 0;
        const paperCostTotal = sheetsNeeded * paperCostPerSheet;

        // Calculate click costs
        const clickCosts = product.clickCosts || { color: 0.10, black: 0.05 };
        let clickCostPerSheet = 0;

        // Add front color cost
        if (input.colorFront === 'Color') {
            clickCostPerSheet += clickCosts.color;
        } else if (input.colorFront === 'Black') {
            clickCostPerSheet += clickCosts.black;
        }

        // Add back color cost
        if (input.colorBack === 'Color') {
            clickCostPerSheet += clickCosts.color;
        } else if (input.colorBack === 'Black') {
            clickCostPerSheet += clickCosts.black;
        }

        const clickCostTotal = sheetsNeeded * clickCostPerSheet;

        // Calculate base price (paper + click costs)
        const basePrice = paperCostTotal + clickCostTotal;

        // Calculate size multiplier adjustment
        const sizeMultiplier = size.priceMultiplier || 1;
        const sizeAdjustment = basePrice * (sizeMultiplier - 1);
        const subtotal = basePrice + sizeAdjustment;

        // Calculate paper upgrade cost (premium paper markup)
        const paperUpgradeCost = paper.upgradeCost || 0;

        // Calculate upgrades cost
        let upgradesCost = 0;
        const appliedUpgrades = [];

        if (input.upgradeNames && input.upgradeNames.length > 0) {
            for (const upgradeName of input.upgradeNames) {
                const upgrade = product.upgrades.find(u => u.name === upgradeName);
                if (!upgrade) {
                    const validUpgrades = product.upgrades.map(u => u.name).join(', ');
                    throw new Error(
                        `Invalid upgrade "${upgradeName}". Valid upgrades: ${validUpgrades}`
                    );
                }
                upgradesCost += upgrade.upgradeCost;
                appliedUpgrades.push({
                    name: upgrade.name,
                    description: upgrade.description,
                    cost: upgrade.upgradeCost
                });
            }
        }

        // Calculate grand total
        const grandTotal = subtotal + paperUpgradeCost + upgradesCost;
        const unitPrice = grandTotal / input.quantity;

        const calcMs = Date.now() - startTime;

        // Return structured payload
        return {
            inputs: {
                productId: input.productId,
                productName: product.name,
                quantity: input.quantity,
                size: input.size,
                paperId: input.paperId,
                paperName: paper.name,
                colorFront: input.colorFront || 'Not specified',
                colorBack: input.colorBack || 'Not specified',
                upgrades: input.upgradeNames || []
            },
            calculation: {
                numberUp: numberUp,
                sheetsNeeded: sheetsNeeded,
                paperCostPerSheet: parseFloat(paperCostPerSheet.toFixed(2)),
                paperCostTotal: parseFloat(paperCostTotal.toFixed(2)),
                clickCostPerSheet: parseFloat(clickCostPerSheet.toFixed(2)),
                clickCostTotal: parseFloat(clickCostTotal.toFixed(2))
            },
            totals: {
                basePrice: parseFloat(basePrice.toFixed(2)),
                sizeMultiplier: sizeMultiplier,
                sizeAdjustment: parseFloat(sizeAdjustment.toFixed(2)),
                subtotal: parseFloat(subtotal.toFixed(2)),
                paperUpgrade: parseFloat(paperUpgradeCost.toFixed(2)),
                upgradesCost: parseFloat(upgradesCost.toFixed(2)),
                grandTotal: parseFloat(grandTotal.toFixed(2)),
                unitPrice: parseFloat(unitPrice.toFixed(3))
            },
            lineItems: [
                {
                    description: `Paper Cost (${sheetsNeeded} sheets @ $${paperCostPerSheet.toFixed(2)})`,
                    quantity: sheetsNeeded,
                    unitPrice: paperCostPerSheet,
                    total: paperCostTotal
                },
                {
                    description: `Click Cost (${sheetsNeeded} sheets @ $${clickCostPerSheet.toFixed(2)})`,
                    quantity: sheetsNeeded,
                    unitPrice: clickCostPerSheet,
                    total: clickCostTotal
                },
                ...(sizeAdjustment !== 0 ? [{
                    description: `Size adjustment (${size.name}: ${sizeMultiplier}x)`,
                    quantity: 1,
                    unitPrice: sizeAdjustment,
                    total: sizeAdjustment
                }] : []),
                ...(paperUpgradeCost > 0 ? [{
                    description: `Paper upgrade (${paper.name})`,
                    quantity: 1,
                    unitPrice: paperUpgradeCost,
                    total: paperUpgradeCost
                }] : []),
                ...appliedUpgrades.map(upgrade => ({
                    description: `${upgrade.name}`,
                    quantity: 1,
                    unitPrice: upgrade.cost,
                    total: upgrade.cost
                }))
            ],
            appliedUpgrades,
            engineMeta: {
                version: 'v2.0.0',
                calcMs: calcMs,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Validate calculation input
     * @param {Object} input - Input to validate
     */
    validateInput(input) {
        const errors = [];

        if (!input.productId || typeof input.productId !== 'string') {
            errors.push('productId is required and must be a string');
        }

        if (!input.quantity || typeof input.quantity !== 'number' || input.quantity <= 0) {
            errors.push('quantity is required and must be a positive number');
        }

        if (!input.size || typeof input.size !== 'string') {
            errors.push('size is required and must be a string');
        }

        if (!input.paperId || typeof input.paperId !== 'string') {
            errors.push('paperId is required and must be a string');
        }

        const validColors = ['Color', 'Black', 'No Print'];
        if (input.colorFront && !validColors.includes(input.colorFront)) {
            errors.push('colorFront must be one of: Color, Black, No Print');
        }

        if (input.colorBack && !validColors.includes(input.colorBack)) {
            errors.push('colorBack must be one of: Color, Black, No Print');
        }

        if (input.upgradeNames && !Array.isArray(input.upgradeNames)) {
            errors.push('upgradeNames must be an array');
        }

        if (errors.length > 0) {
            const error = new Error('Validation failed');
            error.statusCode = 400;
            error.details = errors;
            throw error;
        }
    }

    /**
     * Get product by ID with full details
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} Product with available papers and upgrades
     */
    async getProductDetails(productId) {
        const products = await this.productsDb.findAll('products');
        const product = products.find(p => p.id === productId);

        if (!product) {
            throw new Error(`Product with ID "${productId}" not found`);
        }

        if (!product.isActive) {
            throw new Error(`Product "${product.name}" is not currently available`);
        }

        const paperDataObj = await this.paperData.readData();

        // Filter papers based on product's selectedPaperIds
        let availablePapers = paperDataObj.papers;
        if (product.selectedPaperIds && product.selectedPaperIds.length > 0) {
            availablePapers = paperDataObj.papers.filter(
                paper => product.selectedPaperIds.includes(paper.id)
            );
        }

        return {
            id: product.id,
            name: product.name,
            description: product.description,
            sizes: product.sizes,
            quantityPrices: product.quantityPrices,
            upgrades: product.upgrades || [],
            availablePapers: availablePapers
        };
    }

    /**
     * Get all active products (summary only)
     * @returns {Promise<Array>} List of active products
     */
    async getAllProducts() {
        const products = await this.productsDb.findAll('products');
        return products
            .filter(p => p.isActive)
            .map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            }));
    }
}

module.exports = new CalculatorService();
