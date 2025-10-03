require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/', require('./routes/pages'));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mock WordPress running on http://localhost:${PORT}`);
  console.log(`Calculator host: ${process.env.CALCULATOR_HOST}`);
  console.log('\nTest users:');
  console.log('  - customer1 / pass123 (customer role)');
  console.log('  - agent1 / pass123 (agent role)');
  console.log('  - admin / pass123 (admin role)');
});
