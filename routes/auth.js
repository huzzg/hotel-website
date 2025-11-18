// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');

// Helper
const t = (v) => (typeof v === 'string' ? v.trim() : '');

// ========== GET: Login ==========
router.get('/login', (req, res) => {
  res.render('login', { title: 'Đăng nhập', error: null, identifier: '' });
});

// ========== POST: Login ==========
router.post('/login', async (req, res, next) => {
  try {
    const identifier = t(req.body.identifier);
    const password = t(req.body.password);

    if (!identifier || !password) {
      return res.status(400).render('login', {
        title: 'Đăng nhập',
        error: 'Vui lòng nhập đầy đủ thông tin',
        identifier
      });
    }

    const query = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : { username: identifier };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(400).render('login', {
        title: 'Đăng nhập',
        error: 'Email hoặc tên đăng nhập không tồn tại',
        identifier
      });
    }

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) {
      return res.status(400).render('login', {
        title: 'Đăng nhập',
        error: 'Mật khẩu không đúng',
        identifier
      });
    }

    req.session.user = {
      _id: user._id,
      username: user.username,
      role: user.role || 'user',
      email: user.email
    };
    res.locals.currentUser = req.session.user;

    return res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/');
  } catch (err) {
    next(err);
  }
});

// ========== GET: Register ==========
router.get('/register', (req, res) => {
  res.render('register', { title: 'Đăng ký', error: null });
});

// ========== POST: Register ==========
router.post('/register', async (req, res, next) => {
  try {
    const name = t(req.body.name);
    const email = t(req.body.email).toLowerCase();
    const phone = t(req.body.phone);
    const password = t(req.body.password);

    if (!name || !email || !password) {
      return res.render('register', {
        title: 'Đăng ký',
        error: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    const existed = await User.findOne({ email });
    if (existed) {
      return res.render('register', {
        title: 'Đăng ký',
        error: 'Email đã tồn tại'
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const username = email.split('@')[0];

    const user = await User.create({
      username,
      email,
      password: hash,
      role: 'user',
      active: true,
      profile: { name, phone }
    });

    req.session.user = {
      _id: user._id,
      username: user.username,
      role: 'user',
      email: user.email
    };

    res.locals.currentUser = req.session.user;
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

// ========== GET: Logout ==========
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
});

module.exports = router;
