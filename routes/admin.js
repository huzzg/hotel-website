const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { body, validationResult } = require('express-validator');

router.get('/dashboard', async (req, res, next) => {
  try {
    const [rooms, bookings] = await Promise.all([
      Room.find(),
      Booking.find().populate('roomId', 'type roomNumber status location price')
    ]);
    const revenue = await Booking.aggregate([
      { $lookup: { from: 'rooms', localField: 'roomId', foreignField: '_id', as: 'room' } },
      { $unwind: '$room' },
      { $group: { _id: null, total: { $sum: '$room.price' } } }
    ]);
    const occupancyRate = (bookings.length / rooms.length) * 100 || 0;
    res.render('admin-dashboard', {
      rooms,
      bookings,
      revenue: revenue[0]?.total || 0,
      occupancyRate: occupancyRate.toFixed(2)
    });
  } catch (err) {
    next(err);
  }
});

router.post('/create-room', [
  body('roomNumber').notEmpty().trim().escape(),
  body('type').notEmpty().trim().escape(),
  body('price').isInt({ min: 0 }),
  body('location').notEmpty().trim().escape()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).render('admin-dashboard', { error: 'Invalid room data' });

  const { roomNumber, type, price, location } = req.body;
  try {
    const existingRoom = await Room.findOne({ roomNumber });
    if (existingRoom) return res.status(400).render('admin-dashboard', { error: 'Room number already exists' });
    const room = new Room({ roomNumber, type, price, location });
    await room.save();
    res.redirect('/admin/dashboard');
  } catch (err) {
    next(err);
  }
});

router.post('/release-room/:id', async (req, res, next) => {
  try {
    const roomId = req.params.id;
    await Room.findByIdAndUpdate(roomId, { status: 'available' });
    await Booking.deleteMany({ roomId, status: 'confirmed' }); // Xóa booking liên quan
    res.redirect('/admin/dashboard');
  } catch (err) {
    next(err);
  }
});

module.exports = router;