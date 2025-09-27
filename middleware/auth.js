const { verifyToken } = require('../utils/jwt');

module.exports = (req, res, next) => {
    try {
        // Get token from cookies
        const token = req.cookies.authToken;

        if (!token) {
            return res.redirect('/admin/login');
        }

        // Verify token
        const decoded = verifyToken(token);
        if (!decoded) {
            res.clearCookie('authToken');
            return res.redirect('/admin/login');
        }

        // Add user info to request
        req.user = decoded;
        next();
    } catch (error) {
        res.clearCookie('authToken');
        res.redirect('/admin/login');
    }
};