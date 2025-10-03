const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

// Redirect root admin to dashboard or login
router.get('/', (req, res) => {
  if (req.session && req.session.admin) {
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin/login');
  }
});

// Auth routes
router.get('/login', (req, res) => res.render('admin/login'));
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);

// Protected routes
router.get('/dashboard', auth, adminController.getDashboard);
router.get('/products/add', auth, adminController.getAddProduct);
router.get('/products/edit/:id', auth, adminController.getEditProduct);
router.post('/products', auth, adminController.createProduct);
router.put('/products/:id', auth, adminController.updateProduct);
router.delete('/products/:id', auth, adminController.deleteProduct);
router.post('/products/:id/duplicate', auth, adminController.duplicateProduct);

// Size preset routes
router.get('/presets', auth, adminController.getPresets);
router.post('/presets', auth, adminController.savePreset);
router.delete('/presets/:key', auth, adminController.deletePreset);

module.exports = router;