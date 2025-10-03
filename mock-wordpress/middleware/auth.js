function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
}

function attachUser(req, res, next) {
  if (req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
}

module.exports = { requireAuth, attachUser };
