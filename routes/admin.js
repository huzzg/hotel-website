// routes/admin.js
const express = require('express');
const router = express.Router();

const requireAdmin = require('../middleware/requireAdmin');
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Discount = require('../models/Discount');

// Bảo vệ tất cả route admin
router.use(requireAdmin);

// ========== DASHBOARD ==========
router.get('/dashboard', async (req, res, next) => {
  try {
    const [users, rooms, bookings, paidAgg] = await Promise.all([
      User.countDocuments({}),
      Room.countDocuments({}),
      Booking.countDocuments({}),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const revenue = paidAgg && paidAgg.length ? paidAgg[0].total : 0;

    const monthly = await Payment.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]);

    res.render('admin-dashboard', {
      title: 'Admin • Dashboard',
      stat: { users, rooms, bookings, revenue },
      monthly
    });
  } catch (err) {
    next(err);
  }
});

// ========== ROOMS ==========
router.get('/rooms', async (req, res, next) => {
  try {
    const rooms = await Room.find({}).sort({ createdAt: -1 });
    res.render('admin-rooms', { title: 'Admin • Quản lý phòng', rooms });
  } catch (e) { next(e); }
});

router.post('/rooms', async (req, res, next) => {
  try {
    const { roomNumber, type, price, status, location, image } = req.body;
    await Room.create({ roomNumber, type, price, status, location, image });
    res.redirect('/admin/rooms');
  } catch (e) { next(e); }
});

router.post('/rooms/:id', async (req, res, next) => {
  try {
    const { roomNumber, type, price, status, location, image } = req.body;
    await Room.findByIdAndUpdate(req.params.id, {
      roomNumber, type, price, status, location, image
    });
    res.redirect('/admin/rooms');
  } catch (e) { next(e); }
});

router.post('/rooms/:id/delete', async (req, res, next) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.redirect('/admin/rooms');
  } catch (e) { next(e); }
});

// ========== BOOKINGS ==========
router.get('/bookings', async (req, res, next) => {
  try {
    const bookings = await Booking.find({})
      .populate('userId', 'username email')
      .populate('roomId', 'roomNumber type price')
      .sort({ createdAt: -1 });

    res.render('admin-bookings', {
      title: 'Admin • Đơn đặt phòng',
      bookings
    });
  } catch (e) { next(e); }
});

router.post('/bookings/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body; // pending | checked_in | checked_out | cancelled
    await Booking.findByIdAndUpdate(req.params.id, { status });
    res.redirect('/admin/bookings');
  } catch (e) { next(e); }
});

// ========== USERS ==========
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.render('admin-users', { title: 'Admin • Khách hàng', users });
  } catch (e) { next(e); }
});

router.post('/users/:id/toggle', async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.redirect('/admin/users');
    const active = typeof u.active === 'boolean' ? !u.active : false;
    u.active = active;
    await u.save();
    res.redirect('/admin/users');
  } catch (e) { next(e); }
});

// ========== DISCOUNTS ==========
router.get('/discounts', async (req, res, next) => {
  try {
    const discounts = await Discount.find({}).sort({ createdAt: -1 });
    res.render('admin-discounts', { title: 'Admin • Mã giảm giá', discounts });
  } catch (e) { next(e); }
});

router.post('/discounts', async (req, res, next) => {
  try {
    const { code, percent, startDate, endDate, active } = req.body;
    await Discount.create({
      code,
      percent: Number(percent),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      active: active === 'on'
    });
    res.redirect('/admin/discounts');
  } catch (e) { next(e); }
});

router.post('/discounts/:id', async (req, res, next) => {
  try {
    const { code, percent, startDate, endDate, active } = req.body;
    await Discount.findByIdAndUpdate(req.params.id, {
      code,
      percent: Number(percent),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      active: active === 'on'
    });
    res.redirect('/admin/discounts');
  } catch (e) { next(e); }
});

router.post('/discounts/:id/delete', async (req, res, next) => {
  try {
    await Discount.findByIdAndDelete(req.params.id);
    res.redirect('/admin/discounts');
  } catch (e) { next(e); }
});

module.exports = router;
