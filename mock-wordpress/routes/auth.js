const express = require('express');
const router = express.Router();
const { findUserByUsername } = require('../data/storage');

// GET /auth/login
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = findUserByUsername(username);

  if (!user || user.password !== password) {
    return res.render('login', { error: 'Invalid credentials' });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    company_id: user.company_id
  };

  res.redirect('/quote');
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
