const JsonDB = require('../utils/jsonDb');
const adminsDb = new JsonDB('admins.json');
const productsDb = new JsonDB('products.json');
const paperDb = new JsonDB('paper-data.json');
const presetsDb = new JsonDB('size-presets.json');
const settingsDb = new JsonDB('settings.json');

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
        const settings = await settingsDb.readData();
        res.render('admin/dashboard', {
            products,
            papers: paperData.papers,
            upgrades: paperData.upgrades,
            settings
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
        console.log('=== CREATE PRODUCT DEBUG ===');
        console.log('Request body:', req.body);
        console.log('Request body keys:', Object.keys(req.body || {}));

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
        const quantityPrices = toArray(body.quantityPrices).map((qp) => {
            const entry = {
                quantity: typeof qp.quantity === 'string' ? parseInt(qp.quantity, 10) : qp.quantity,
                price: typeof qp.price === 'string' ? parseFloat(qp.price) : qp.price
            };
            if (qp.sheets != null) entry.sheets = typeof qp.sheets === 'string' ? parseInt(qp.sheets, 10) : qp.sheets;
            if (qp.paperCost != null) entry.paperCost = typeof qp.paperCost === 'string' ? parseFloat(qp.paperCost) : qp.paperCost;
            if (qp.clickCost != null) entry.clickCost = typeof qp.clickCost === 'string' ? parseFloat(qp.clickCost) : qp.clickCost;
            if (qp.totalCost != null) entry.totalCost = typeof qp.totalCost === 'string' ? parseFloat(qp.totalCost) : qp.totalCost;
            if (qp.markup != null) entry.markup = typeof qp.markup === 'string' ? parseFloat(qp.markup) : qp.markup;
            return entry;
        }).filter((qp) => qp && Number.isInteger(qp.quantity) && qp.quantity > 0 && !Number.isNaN(qp.price));

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

        // Parse click costs
        const clickCosts = {
            color: typeof body.clickCosts?.color === 'string' ? parseFloat(body.clickCosts.color) : (body.clickCosts?.color || 0.10),
            black: typeof body.clickCosts?.black === 'string' ? parseFloat(body.clickCosts.black) : (body.clickCosts?.black || 0.05)
        };

        const productToInsert = {
            name: body.name,
            description: body.description || '',
            isActive,
            sizes,
            upgrades,
            quantityPrices,
            selectedPaperIds,
            clickCosts,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log('=== PRODUCT TO INSERT ===');
        console.log('Product:', JSON.stringify(productToInsert, null, 2));

        // Basic validation for required fields
        if (!productToInsert.name) {
            console.log('=== VALIDATION FAILED: Missing name ===');
            return res.status(400).json({ message: 'Name is required' });
        }
        if (productToInsert.sizes.length === 0) {
            console.log('=== VALIDATION FAILED: No sizes ===');
            return res.status(400).json({ message: 'At least one size is required' });
        }
        if (productToInsert.quantityPrices.length === 0) {
            console.log('=== VALIDATION FAILED: No quantity prices ===');
            return res.status(400).json({ message: 'At least one quantity price is required' });
        }

        console.log('=== VALIDATION PASSED - INSERTING PRODUCT ===');

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

        const quantityPrices = toArray(body.quantityPrices).map((qp) => {
            const entry = {
                quantity: typeof qp.quantity === 'string' ? parseInt(qp.quantity, 10) : qp.quantity,
                price: typeof qp.price === 'string' ? parseFloat(qp.price) : qp.price
            };
            // Persist breakdown fields if present
            if (qp.sheets != null) entry.sheets = typeof qp.sheets === 'string' ? parseInt(qp.sheets, 10) : qp.sheets;
            if (qp.paperCost != null) entry.paperCost = typeof qp.paperCost === 'string' ? parseFloat(qp.paperCost) : qp.paperCost;
            if (qp.clickCost != null) entry.clickCost = typeof qp.clickCost === 'string' ? parseFloat(qp.clickCost) : qp.clickCost;
            if (qp.totalCost != null) entry.totalCost = typeof qp.totalCost === 'string' ? parseFloat(qp.totalCost) : qp.totalCost;
            if (qp.markup != null) entry.markup = typeof qp.markup === 'string' ? parseFloat(qp.markup) : qp.markup;
            return entry;
        }).filter((qp) => qp && Number.isInteger(qp.quantity) && qp.quantity > 0 && !Number.isNaN(qp.price));

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

        // Parse click costs
        const clickCosts = {
            color: typeof body.clickCosts?.color === 'string' ? parseFloat(body.clickCosts.color) : (body.clickCosts?.color || 0.10),
            black: typeof body.clickCosts?.black === 'string' ? parseFloat(body.clickCosts.black) : (body.clickCosts?.black || 0.05)
        };

        // Validate required fields after normalization
        if (!body.name) {
            return res.status(400).json({ message: 'Name is required' });
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
            description: body.description || '',
            isActive,
            sizes,
            upgrades,
            quantityPrices,
            selectedPaperIds,
            clickCosts,
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

exports.getPresets = async (req, res) => {
    try {
        const data = await presetsDb.readData();
        res.json(data.presets || {});
    } catch (error) {
        res.status(500).json({ message: 'Failed to load presets' });
    }
};

exports.savePreset = async (req, res) => {
    try {
        const { name, width, height, multiplier } = req.body;

        if (!name || !width || !height || !multiplier) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

        const data = await presetsDb.readData();
        if (!data.presets) data.presets = {};

        data.presets[key] = {
            name: name,
            width: parseFloat(width),
            height: parseFloat(height),
            multiplier: parseFloat(multiplier)
        };

        await presetsDb.writeData(data);
        res.json({ success: true, key, preset: data.presets[key] });
    } catch (error) {
        res.status(500).json({ message: 'Failed to save preset' });
    }
};

exports.deletePreset = async (req, res) => {
    try {
        const { key } = req.params;

        const data = await presetsDb.readData();
        if (!data.presets || !data.presets[key]) {
            return res.status(404).json({ message: 'Preset not found' });
        }

        delete data.presets[key];
        await presetsDb.writeData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete preset' });
    }
};

// Paper Management
exports.getAddPaper = async (req, res) => {
    try {
        res.render('admin/add-paper');
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createPaper = async (req, res) => {
    try {
        const { name, category, thickness, finish, description, parentSheetWidth, parentSheetHeight, cwtPrice, mWeight, upgradeCost } = req.body;

        // Validate required fields
        if (!name || !category || !thickness || !finish || !parentSheetWidth || !parentSheetHeight || !cwtPrice || !mWeight) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }

        // Read current paper data
        const paperData = await paperDb.readData();

        // Generate new paper ID
        const newId = 'P' + String(paperData.papers.length + 1).padStart(3, '0');

        // Calculate cost per sheet: (CWT price * M weight) / 100 = price per 1000, then / 1000
        const cwt = parseFloat(cwtPrice);
        const mWt = parseFloat(mWeight);
        const costPerSheet = (cwt * mWt) / 100 / 1000;

        // Create new paper object
        const newPaper = {
            id: newId,
            name,
            category,
            thickness,
            finish,
            description: description || '',
            parentSheetSize: {
                width: parseFloat(parentSheetWidth),
                height: parseFloat(parentSheetHeight)
            },
            cwtPrice: cwt,
            mWeight: mWt,
            costPerSheet: costPerSheet,
            sheetsPerPack: 100,
            costPerPack: costPerSheet * 100,
            upgradeCost: parseFloat(upgradeCost) || 0
        };

        // Add to papers array
        paperData.papers.push(newPaper);

        // Save back to file
        await paperDb.writeData(paperData);

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Error creating paper:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getEditPaper = async (req, res) => {
    try {
        const { id } = req.params;
        const paperData = await paperDb.readData();
        const paper = paperData.papers.find(p => p.id === id);

        if (!paper) {
            return res.status(404).render('error', { message: 'Paper not found' });
        }

        res.render('admin/edit-paper', { paper });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updatePaper = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, thickness, finish, description, parentSheetWidth, parentSheetHeight, cwtPrice, mWeight, upgradeCost } = req.body;

        // Validate required fields
        if (!name || !category || !thickness || !finish || !parentSheetWidth || !parentSheetHeight || !cwtPrice || !mWeight) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }

        // Read current paper data
        const paperData = await paperDb.readData();
        const paperIndex = paperData.papers.findIndex(p => p.id === id);

        if (paperIndex === -1) {
            return res.status(404).json({ message: 'Paper not found' });
        }

        // Calculate cost per sheet: (CWT price * M weight) / 100 = price per 1000, then / 1000
        const cwt = parseFloat(cwtPrice);
        const mWt = parseFloat(mWeight);
        const costPerSheet = (cwt * mWt) / 100 / 1000;

        // Update paper object
        paperData.papers[paperIndex] = {
            id,
            name,
            category,
            thickness,
            finish,
            description: description || '',
            parentSheetSize: {
                width: parseFloat(parentSheetWidth),
                height: parseFloat(parentSheetHeight)
            },
            cwtPrice: cwt,
            mWeight: mWt,
            costPerSheet: costPerSheet,
            sheetsPerPack: 100,
            costPerPack: costPerSheet * 100,
            upgradeCost: parseFloat(upgradeCost) || 0
        };

        // Save back to file
        await paperDb.writeData(paperData);

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Error updating paper:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deletePaper = async (req, res) => {
    try {
        const { id } = req.params;

        // Read current paper data
        const paperData = await paperDb.readData();
        const paperIndex = paperData.papers.findIndex(p => p.id === id);

        if (paperIndex === -1) {
            return res.status(404).json({ message: 'Paper not found' });
        }

        // Remove paper from array
        paperData.papers.splice(paperIndex, 1);

        // Save back to file
        await paperDb.writeData(paperData);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting paper:', error);
        res.status(500).json({ message: 'Failed to delete paper' });
    }
};

// Settings Management
exports.saveMarkup = async (req, res) => {
    try {
        const { percentage } = req.body;

        if (typeof percentage !== 'number' || percentage < 0) {
            return res.status(400).json({ message: 'Invalid markup percentage' });
        }

        const settings = await settingsDb.readData();
        settings.markup = {
            percentage,
            description: 'Global markup percentage applied to calculated costs'
        };

        await settingsDb.writeData(settings);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving markup:', error);
        res.status(500).json({ message: 'Failed to save markup' });
    }
};

exports.getSettings = async (req, res) => {
    try {
        const settings = await settingsDb.readData();
        res.json({ data: settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
};