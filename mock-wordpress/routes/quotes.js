const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { saveQuote, getQuotesByUser } = require('../data/storage');

// POST /api/quotes/save
router.post('/save', requireAuth, (req, res) => {
  try {
    const payload = req.body;
    const user = req.session.user;

    // Validate payload
    if (!payload.productId || !payload.quantity || !payload.totals) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload structure'
      });
    }

    // Create quote record
    const quote = {
      user_id: user.id,
      company_id: user.company_id,
      payload: payload,
      status: 'draft'
    };

    const saved = saveQuote(quote);

    res.json({
      success: true,
      quote_id: saved.id,
      message: 'Quote saved successfully'
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/quotes/list (optional: for AJAX loading)
router.get('/list', requireAuth, (req, res) => {
  const user = req.session.user;
  const quotes = getQuotesByUser(user.id, user.role, user.company_id);
  res.json({ success: true, quotes });
});

module.exports = router;
