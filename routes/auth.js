// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');

// GET /auth/login
router.get('/login', (req, res) => {
  try {
    const token = req.cookies?.token;
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.role === 'admin') return res.redirect('/admin/dashboard');
      return res.redirect('/');
    }
  } catch {}
  return res.render('login', { error: null, email: '' });
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).render('login', { error: 'Email không tồn tại', email });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).render('login', { error: 'Mật khẩu không đúng', email });
    }

    const payload = {
      id: user._id,
      email: user.email,
      name: user.profile?.name || user.username || '',
      username: user.username || '',
      role: user.role || 'user',
      avatar: user.avatar || ''
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    if ((user.role || 'user') === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/');
  } catch (err) {
    next(err);
  }
});

// GET /auth/register
router.get('/register', (req, res) => {
  res.render('register', { error: null, formData: {} });
});

// POST /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body || {};
    const existed = await User.findOne({ email });
    if (existed) {
      return res.status(400).render('register', { error: 'Email đã tồn tại', formData: req.body });
    }
    const hash = await bcrypt.hash(password, 10);
    await User.create({
      username: email.split('@')[0],
      email,
      password: hash,
      role: 'user',
      profile: { name, phone }
    });
    return res.redirect('/auth/login');
  } catch (err) {
    next(err);
  }
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.redirect('/');
});

module.exports = router;
