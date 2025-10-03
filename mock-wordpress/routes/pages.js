const express = require('express');
const router = express.Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const { getQuotesByUser } = require('../data/storage');

router.use(attachUser);

// Redirect root to quote page
router.get('/', (req, res) => {
  res.redirect('/quote');
});

// Quote page (widget mounts here)
router.get('/quote', requireAuth, (req, res) => {
  res.render('quote-page', {
    calculatorHost: process.env.CALCULATOR_HOST
  });
});

// My Quotes dashboard
router.get('/my-quotes', requireAuth, (req, res) => {
  const user = req.session.user;
  const quotes = getQuotesByUser(user.id, user.role, user.company_id);
  res.render('my-quotes', { quotes });
});

module.exports = router;
