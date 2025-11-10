const jwt = require('jsonwebtoken');

function attachUser(req, res, next) {
  // Đặt mặc định để EJS không lỗi nếu chưa đăng nhập
  res.locals.currentUser = null;

  const bearer = req.headers['authorization'];
  const token =
    req.cookies?.token ||
    (bearer && bearer.startsWith('Bearer ') ? bearer.slice(7) : null);

  if (!token) return next();

  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: p.id || p._id,
      role: p.role || 'user',
      email: p.email,
      name: p.name || p.username
    };
    res.locals.currentUser = {
      id: req.user.id,
      role: req.user.role,
      email: req.user.email || '',
      name: req.user.name || (req.user.email ? req.user.email.split('@')[0] : 'Người dùng')
    };
  } catch {
    // Token hỏng -> xoá để tránh redirect loop
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    req.user = null;
    res.locals.currentUser = null;
  }
  next();
}

const OPEN_PATHS = [
  '/', '/search', '/auth/login', '/auth/register', '/auth/logout',
  /^\/images\//, /^\/css\//, /^\/js\//, /^\/uploads\//, /^\/public\//
];

function isOpenPath(path) {
  return OPEN_PATHS.some(p => (p instanceof RegExp ? p.test(path) : p === path));
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  if (isOpenPath(req.path)) return next();
  return res.redirect('/auth/login');
}

module.exports = { attachUser, requireAuth };
