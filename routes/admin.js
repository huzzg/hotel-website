// routes/admin.js
const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Discount = require('../models/Discount');

router.get('/dashboard', async (req, res, next) => {
  try {
    const [rooms, users, bookings, reviews, discounts] = await Promise.all([
      Room.find(),
      User.find({ role: 'user' }),
      Booking.find().populate('roomId userId'),
      Review.find().populate('roomId userId'),
      Discount.find().sort({ createdAt: -1 })
    ]);

    const revenue = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const occupancyRate = rooms.length > 0
      ? (bookings.filter(b => b.roomId.status === 'booked').length / rooms.length * 100).toFixed(2)
      : 0;

    res.render('admin-dashboard', {
      rooms, users, bookings, reviews, discounts,
      revenue: revenue[0]?.total || 0,
      occupancyRate
    });
  } catch (err) {
    next(err);
  }
});

// Tạo phòng
router.post('/create-room', async (req, res, next) => {
  try {
    const { roomNumber, type, price, location } = req.body;
    const room = new Room({ roomNumber, type, price: Number(price), location, status: 'available' });
    await room.save();
    res.redirect('/admin/dashboard');
  } catch (err) {
    next(err);
  }
});

// Giải phóng phòng
router.post('/release-room/:id', async (req, res, next) => {
  await Room.findByIdAndUpdate(req.params.id, { status: 'available' });
  res.redirect('/admin/dashboard');
});

// Tạo mã giảm giá
router.post('/discount/create', async (req, res, next) => {
  try {
    const { code, discountPercent, expiresAt } = req.body;
    const discount = new Discount({
      code: code.toUpperCase(),
      discountPercent: Number(discountPercent),
      expiresAt
    });
    await discount.save();
    res.redirect('/admin/dashboard');
  } catch (err) {
    next(err);
  }
});

// Xóa mã
router.post('/discount/delete/:id', async (req, res, next) => {
  await Discount.findByIdAndDelete(req.params.id);
  res.redirect('/admin/dashboard');
});

module.exports = router;