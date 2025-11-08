// middleware/requireAdmin.js
const jwt = require('jsonwebtoken');

module.exports = function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.redirect('/auth/login');

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).send('Forbidden');

    // Cho view dùng nếu cần
    res.locals.currentUser = {
      id: payload.id || payload._id,
      name: payload.name || payload.username || (payload.email ? payload.email.split('@')[0] : 'Người dùng'),
      email: payload.email || '',
      role: payload.role || 'user',
      avatar: payload.avatar || ''
    };
    next();
  } catch {
    return res.redirect('/auth/login');
  }
};
