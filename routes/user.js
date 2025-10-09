const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

router.get('/profile', async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).send('User not authenticated');
    }
    const user = await User.findById(req.user.id).select('username email profile role');
    res.render('profile', { user: user || { role: 'guest', username: 'Unknown' } });
  } catch (err) {
    console.error('Profile error:', err);
    next(err);
  }
});

router.post('/profile', async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).send('User not authenticated');
    }
    const { name, phone } = req.body.profile;
    await User.findByIdAndUpdate(req.user.id, { 'profile.name': name, 'profile.phone': phone }, { new: true });
    res.redirect('/user/profile');
  } catch (err) {
    next(err);
  }
});

router.get('/rooms', async (req, res, next) => {
  try {
    const rooms = await Room.find();
    res.render('booking', { rooms, user: req.user }); // Truyền req.user
  } catch (err) {
    next(err);
  }
});

router.post('/book', async (req, res, next) => {
  try {
    const { roomId, checkIn, checkOut } = req.body;
    const room = await Room.findById(roomId);
    if (!room || room.status !== 'available') return res.status(400).send('Room not available');
    const booking = new Booking({ userId: req.user.id, roomId, checkIn: new Date(checkIn), checkOut: new Date(checkOut) });
    await booking.save();
    await Room.findByIdAndUpdate(roomId, { status: 'booked' });
    res.redirect('/user/history');
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).populate('roomId', 'type roomNumber location price');
    res.render('history', { bookings, user: req.user }); // Truyền req.user
  } catch (err) {
    next(err);
  }
});

router.get('/review', async (req, res, next) => {
  try {
    const rooms = await Room.find();
    res.render('review', { rooms, user: req.user }); // Truyền req.user
  } catch (err) {
    next(err);
  }
});

router.post('/review', async (req, res, next) => {
  try {
    const { roomId, rating, comment } = req.body;
    if (rating < 1 || rating > 5) return res.status(400).send('Rating must be between 1 and 5');
    const review = new Review({ userId: req.user.id, roomId, rating, comment });
    await review.save();
    res.redirect('/user/history');
  } catch (err) {
    next(err);
  }
});

module.exports = router;