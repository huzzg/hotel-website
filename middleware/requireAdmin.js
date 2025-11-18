// middleware/requireAdmin.js
module.exports = (req, res, next) => {
  const user = req.session ? req.session.user : null;

  if (!user) {
    return res.redirect('/auth/login');
  }

  if (user.role !== 'admin') {
    return res.redirect('/');
  }

  // cho views (EJS) dùng
  res.locals.user = user;
  next();
};
