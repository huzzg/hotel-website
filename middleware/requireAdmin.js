// middleware/requireAdmin.js
const jwt = require('jsonwebtoken');

module.exports = function requireAdmin(req, res, next) {
  try {
    const bearer = req.headers['authorization'];
    const token = req.cookies?.token || (bearer && bearer.startsWith('Bearer ') ? bearer.slice(7) : null);

    if (!token) return res.redirect('/auth/login');

    const p = jwt.verify(token, process.env.JWT_SECRET);
    if (p.role !== 'admin') return res.redirect('/');

    req.user = { id: p.id || p._id, role: 'admin', email: p.email, name: p.name || p.username };
    res.locals.currentUser = {
      id: req.user.id,
      role: 'admin',
      email: req.user.email || '',
      name: req.user.name || (req.user.email ? req.user.email.split('@')[0] : 'Admin')
    };
    return next();
  } catch {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    return res.redirect('/auth/login');
  }
};
