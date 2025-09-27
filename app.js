const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const JsonDB = require('./utils/jsonDb');

const app = express();
const port = process.env.PORT || 3000;
const paperData = new JsonDB('paper-data.json');

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware
app.use(cookieParser());

// Import routes
const adminRoutes = require('./routes/adminRoutes');

// Routes
app.use('/admin', adminRoutes);

// Simple favicon handler to avoid 404 noise
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

app.get('/', async (req, res) => {
    try {
        const data = await paperData.readData();
        res.render('index', {
            papers: data.papers,
            upgrades: data.upgrades
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
});

// API endpoints
app.get('/api/papers', async (req, res) => {
    try {
        const data = await paperData.readData();
        res.json(data.papers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/upgrades', async (req, res) => {
    try {
        const data = await paperData.readData();
        res.json(data.upgrades);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
