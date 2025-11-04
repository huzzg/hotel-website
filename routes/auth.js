const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

router.get('/login', (req, res) => res.render('login'));
router.get('/register', (req, res) => res.render('register'));

router.post('/login', [
  body('username').notEmpty().trim().escape(),
  body('password').notEmpty().trim()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).render('login', { error: 'Dữ liệu không hợp lệ' });

  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).render('login', { error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });

    // SỬA: CHUYỂN VỀ TRANG CHỦ, KHÔNG PHẢI HỒ SƠ
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

router.post('/register', [
  body('username').notEmpty().trim().escape(),
  body('password').isLength({ min: 6 }),
  body('email').isEmail().normalizeEmail()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).render('register', { error: 'Dữ liệu không hợp lệ' });

  const { username, password, email } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).render('register', { error: 'Tên đăng nhập hoặc email đã tồn tại' });
    }

    const user = new User({ username, password, email, role: 'user' });
    await user.save();

    // CHUYỂN QUA TRANG THÔNG BÁO
    res.render('register-success', { username });
  } catch (err) {
    next(err);
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/auth/login');
});

module.exports = router;