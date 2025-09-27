const JsonDB = require('../utils/jsonDb');
const adminsDb = new JsonDB('admins.json');
const productsDb = new JsonDB('products.json');
const paperDb = new JsonDB('paper-data.json');

const { generateToken, getCookieOptions } = require('../utils/jwt');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await adminsDb.findOne('admins', { username });

        if (!admin || admin.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(admin);

        // Set cookie with token
        res.cookie('authToken', token, getCookieOptions());

        // Update last login
        await adminsDb.update('admins', admin.id, {
            ...admin,
            lastLogin: new Date().toISOString()
        });

        // Redirect to dashboard
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('authToken');
    res.redirect('/admin/login');
};

exports.getDashboard = async (req, res) => {
    try {
        const products = await productsDb.findAll('products');
        const paperData = await paperDb.readData();
        res.render('admin/dashboard', {
            products,
            papers: paperData.papers,
            upgrades: paperData.upgrades
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAddProduct = async (req, res) => {
    try {
        const paperData = await paperDb.readData();
        res.render('admin/add-product', {
            papers: paperData.papers,
            upgrades: paperData.upgrades
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const body = req.body || {};

        // Normalize boolean
        const isActive = body.isActive === true || body.isActive === 'on' || body.isActive === 'true';

        // Helper to ensure we always get an array from a possibly object-indexed form structure
        const toArray = (maybeObj) => {
            if (!maybeObj) return [];
            if (Array.isArray(maybeObj)) return maybeObj;
            return Object.values(maybeObj);
        };

        // Parse sizes
        const sizes = toArray(body.sizes).map((s) => ({
            name: s.name,
            width: typeof s.width === 'string' ? parseFloat(s.width) : s.width,
            height: typeof s.height === 'string' ? parseFloat(s.height) : s.height,
            priceMultiplier: typeof s.priceMultiplier === 'string' ? parseFloat(s.priceMultiplier) : s.priceMultiplier
        })).filter((s) => s && s.name && !Number.isNaN(s.width) && !Number.isNaN(s.height) && !Number.isNaN(s.priceMultiplier));

        // Parse upgrades
        const upgrades = toArray(body.upgrades).map((u) => ({
            name: u.name,
            description: u.description,
            upgradeCost: typeof u.upgradeCost === 'string' ? parseFloat(u.upgradeCost) : u.upgradeCost
        })).filter((u) => u && u.name && u.description && !Number.isNaN(u.upgradeCost));

        // Parse quantity prices
        const quantityPrices = toArray(body.quantityPrices).map((qp) => ({
            quantity: typeof qp.quantity === 'string' ? parseInt(qp.quantity, 10) : qp.quantity,
            price: typeof qp.price === 'string' ? parseFloat(qp.price) : qp.price
        })).filter((qp) => qp && Number.isInteger(qp.quantity) && qp.quantity > 0 && !Number.isNaN(qp.price));

        // Parse selected paper IDs
        let selectedPaperIds = body.selectedPaperIds;
        if (typeof selectedPaperIds === 'string') {
            selectedPaperIds = selectedPaperIds
                .split(',')
                .map((id) => id.trim())
                .filter((id) => id.length > 0);
        }
        if (!Array.isArray(selectedPaperIds)) {
            selectedPaperIds = [];
        }

        const productToInsert = {
            name: body.name,
            description: body.description,
            isActive,
            sizes,
            upgrades,
            quantityPrices,
            selectedPaperIds,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Basic validation for required fields
        if (!productToInsert.name || !productToInsert.description) {
            return res.status(400).json({ message: 'Name and description are required' });
        }
        if (productToInsert.sizes.length === 0) {
            return res.status(400).json({ message: 'At least one size is required' });
        }
        if (productToInsert.quantityPrices.length === 0) {
            return res.status(400).json({ message: 'At least one quantity price is required' });
        }

        await productsDb.insert('products', productToInsert);
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getEditProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productsDb.findOne('products', { id });
        const paperData = await paperDb.readData();

        if (!product) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        res.render('admin/edit-product', {
            product,
            papers: paperData.papers,
            upgrades: paperData.upgrades
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productsDb.findOne('products', { id });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Normalize incoming payload
        const body = req.body || {};

        const toArray = (maybeObj) => {
            if (!maybeObj) return [];
            if (Array.isArray(maybeObj)) return maybeObj;
            return Object.values(maybeObj);
        };

        const isActive = body.isActive === true || body.isActive === 'on' || body.isActive === 'true';

        const sizes = toArray(body.sizes).map((s) => ({
            name: s.name,
            width: typeof s.width === 'string' ? parseFloat(s.width) : s.width,
            height: typeof s.height === 'string' ? parseFloat(s.height) : s.height,
            priceMultiplier: typeof s.priceMultiplier === 'string' ? parseFloat(s.priceMultiplier) : s.priceMultiplier
        })).filter((s) => s && s.name && !Number.isNaN(s.width) && !Number.isNaN(s.height) && !Number.isNaN(s.priceMultiplier));

        const upgrades = toArray(body.upgrades).map((u) => ({
            name: u.name,
            description: u.description,
            upgradeCost: typeof u.upgradeCost === 'string' ? parseFloat(u.upgradeCost) : u.upgradeCost
        })).filter((u) => u && u.name && u.description && !Number.isNaN(u.upgradeCost));

        const quantityPrices = toArray(body.quantityPrices).map((qp) => ({
            quantity: typeof qp.quantity === 'string' ? parseInt(qp.quantity, 10) : qp.quantity,
            price: typeof qp.price === 'string' ? parseFloat(qp.price) : qp.price
        })).filter((qp) => qp && Number.isInteger(qp.quantity) && qp.quantity > 0 && !Number.isNaN(qp.price));

        // Parse selected paper IDs
        let selectedPaperIds = body.selectedPaperIds;
        if (typeof selectedPaperIds === 'string') {
            selectedPaperIds = selectedPaperIds
                .split(',')
                .map((v) => v.trim())
                .filter((v) => v.length > 0);
        }
        if (!Array.isArray(selectedPaperIds)) {
            selectedPaperIds = [];
        }

        // Validate required fields after normalization
        if (!body.name || !body.description) {
            return res.status(400).json({ message: 'Name and description are required' });
        }
        if (sizes.length === 0) {
            return res.status(400).json({ message: 'At least one size is required' });
        }
        if (quantityPrices.length === 0) {
            return res.status(400).json({ message: 'At least one quantity price is required' });
        }

        // Update the product
        const updatedProduct = {
            name: body.name,
            description: body.description,
            isActive,
            sizes,
            upgrades,
            quantityPrices,
            selectedPaperIds,
            updatedAt: new Date().toISOString()
        };

        await productsDb.update('products', id, updatedProduct);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Failed to update product' });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await productsDb.delete('products', id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete product' });
    }
};

exports.duplicateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productsDb.findOne('products', { id });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Create a copy of the product with a new ID and name
        const newProduct = {
            ...product,
            id: Date.now().toString(), // Simple way to generate a unique ID
            name: `${product.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await productsDb.insert('products', newProduct);
        res.json({ success: true, product: newProduct });
    } catch (error) {
        res.status(500).json({ message: 'Failed to duplicate product' });
    }
};