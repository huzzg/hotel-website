// routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Discount = require('../models/Discount');

router.get('/profile', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('username email profile role');
    res.render('profile', { user: user || { role: 'guest', username: 'Unknown' } });
  } catch (err) {
    next(err);
  }
});

router.post('/profile', async (req, res, next) => {
  try {
    const { name, phone } = req.body.profile;
    await User.findByIdAndUpdate(req.user.id, { 'profile.name': name, 'profile.phone': phone });
    res.redirect('/user/profile');
  } catch (err) {
    next(err);
  }
});

router.get('/rooms', async (req, res, next) => {
  try {
    const rooms = await Room.find();
    res.render('booking', { rooms });
  } catch (err) {
    next(err);
  }
});

router.get('/room-detail/:id', async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).render('error', { message: 'Phòng không tồn tại' });
    res.render('room-detail', { room });
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  const { location, type, checkIn, checkOut } = req.query;
  try {
    let query = { status: 'available' };
    if (location) query.location = { $regex: location, $options: 'i' };
    if (type) query.type = type;
    const rooms = await Room.find(query);
    res.render('index', { rooms });
  } catch (err) {
    next(err);
  }
});

router.post('/book', async (req, res, next) => {
  try {
    const { roomId, checkIn, checkOut, discountCode } = req.body;
    const room = await Room.findById(roomId);
    if (!room || room.status !== 'available') {
      return res.status(400).send('Phòng không khả dụng');
    }

    const nights = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
    let totalPrice = room.price * nights;
    let discountApplied = 0;

    if (discountCode) {
      const discount = await Discount.findOne({
        code: discountCode.toUpperCase(),
        isActive: true,
        expiresAt: { $gt: new Date() }
      });
      if (discount && !discount.usedBy.includes(req.user.id)) {
        discountApplied = totalPrice * (discount.discountPercent / 100);
        totalPrice -= discountApplied;
      }
    }

    // TẠO BOOKING TẠM (chưa xác nhận)
    const booking = new Booking({
      userId: req.user.id,
      roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      totalPrice,
      discountCode: discountCode || null,
      discountApplied,
      status: 'pending'
    });
    await booking.save();

    // KHÔNG ĐÁNH DẤU PHÒNG BOOKED NGAY
    // await Room.findByIdAndUpdate(roomId, { status: 'booked' });

    // CHUYỂN QUA TRANG XÁC NHẬN
    res.redirect(`/user/confirm/${booking._id}`);
  } catch (err) {
    next(err);
  }
});

// TRANG XÁC NHẬN
router.get('/confirm/:id', async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('roomId', 'roomNumber type location price');
    if (!booking || booking.userId.toString() !== req.user.id) {
      return res.status(404).render('error', { message: 'Không tìm thấy đặt phòng' });
    }
    res.render('booking-confirm', { booking });
  } catch (err) {
    next(err);
  }
});

// THANH TOÁN
router.post('/pay/:id', async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.status !== 'pending') {
      return res.status(400).send('Đặt phòng không hợp lệ');
    }

    await Booking.findByIdAndUpdate(req.params.id, { status: 'confirmed' });
    await Room.findByIdAndUpdate(booking.roomId, { status: 'booked' });

    res.redirect('/user/history?success=1');
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('roomId', 'type roomNumber location price')
      .sort({ createdAt: -1 });
    res.render('history', { bookings });
  } catch (err) {
    next(err);
  }
});

router.get('/review', async (req, res, next) => {
  try {
    const rooms = await Room.find();
    res.render('review', { rooms });
  } catch (err) {
    next(err);
  }
});

router.post('/review', async (req, res, next) => {
  try {
    const { roomId, rating, comment } = req.body;
    if (rating < 1 || rating > 5) return res.status(400).send('Điểm phải từ 1-5');
    const review = new Review({ userId: req.user.id, roomId, rating, comment });
    await review.save();
    res.redirect('/user/history');
  } catch (err) {
    next(err);
  }
});

module.exports = router;