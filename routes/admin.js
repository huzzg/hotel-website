// routes/admin.js
const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin'); // bạn đã có file này
const Room = require('../models/Room');

// nạp mềm User/Booking nếu có
let User = null, Booking = null;
try { User = require('../models/User'); } catch (_) {}
try { Booking = require('../models/Booking'); } catch (_) {}

/* ========== PAGES ========== */

// Dashboard
router.get(['/', '/dashboard'], requireAdmin, async (req, res, next) => {
  try {
    const [totalRooms, availableRooms, totalUsers, totalBookings] = await Promise.all([
      Room.countDocuments({}),
      Room.countDocuments({ status: 'available' }),
      User ? User.countDocuments({ role: { $ne: 'admin' } }) : Promise.resolve(0),
      Booking ? Booking.countDocuments({}) : Promise.resolve(0),
    ]);

    // doanh thu 7 ngày (nếu có Booking)
    let revenueSeries = [];
    if (Booking) {
      const since = new Date(); since.setDate(since.getDate() - 6); since.setHours(0,0,0,0);
      const agg = await Booking.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$totalPrice" } } },
        { $sort: { _id: 1 } }
      ]);
      for (let i=6;i>=0;i--){
        const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
        const key = d.toISOString().slice(0,10);
        const hit = agg.find(a => a._id === key);
        revenueSeries.push({ date: key.slice(5), total: hit ? hit.total : 0 });
      }
    }

    res.render('admin-dashboard', {
      title: 'Bảng điều khiển',
      stats: { totalRooms, availableRooms, totalUsers, totalBookings },
      revenueSeries
    });
  } catch (e) { next(e); }
});

// Trang quản lý phòng
router.get('/rooms', requireAdmin, async (req, res, next) => {
  try {
    const rooms = await Room.find({}).sort({ createdAt: -1 }).lean();
    res.render('admin-rooms', { title: 'Quản lý phòng', rooms });
  } catch (e) { next(e); }
});

// Trang khách hàng
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const users = User
      ? await User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 }).lean()
      : [];
    res.render('admin-users', { title: 'Khách hàng', users, note: User ? null : 'Chưa có model User.' });
  } catch (e) { next(e); }
});

/* ========== API ========== */

// API rooms (list + filter)
router.get('/api/rooms', requireAdmin, async (req, res) => {
  const { type, status, q } = req.query;
  const filter = {};
  if (type) filter.type = new RegExp(type, 'i');
  if (status) filter.status = status;
  if (q) filter.$or = [
    { name: new RegExp(q, 'i') },
    { roomNumber: new RegExp(q, 'i') },
    { type: new RegExp(q, 'i') },
    { location: new RegExp(q, 'i') },
  ];
  const rooms = await Room.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, rooms });
});

// create room
router.post('/api/rooms', requireAdmin, async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.json({ ok: true, room });
  } catch (e) { res.status(400).json({ ok: false, message: e.message }); }
});

// update room
router.put('/api/rooms/:id', requireAdmin, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    res.json({ ok: true, room });
  } catch (e) { res.status(400).json({ ok: false, message: e.message }); }
});

// delete room
router.delete('/api/rooms/:id', requireAdmin, async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ ok: false, message: e.message }); }
});

// API users (nếu có model User)
router.get('/api/users', requireAdmin, async (req, res) => {
  if (!User) return res.json({ ok: true, users: [] });
  const { q } = req.query;
  const filter = q ? { $or: [{ username: new RegExp(q,'i') }, { email: new RegExp(q,'i') }] } : {};
  const users = await User.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, users });
});

router.delete('/api/users/:id', requireAdmin, async (req, res) => {
  if (!User) return res.status(400).json({ ok:false, message:'No User model' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
