// routes/search.js
const express = require('express');
const router = express.Router();

const Room = require('../models/Room');

// Thử nạp Booking nếu dự án có, nếu không có thì bỏ qua (không làm app crash)
let Booking = null;
try { Booking = require('../models/Booking'); } catch (_) { Booking = null; }

// GET /search
router.get('/search', async (req, res, next) => {
  try {
    const {
      q = '',
      type = '',
      location = '',
      minPrice = '',
      maxPrice = '',
      checkIn = '',
      checkOut = '',
      sort = 'price_asc',
    } = req.query;

    // --- Build filter ---
    const filter = {};
    // tìm theo text: name / type / roomNumber / location
    if (q) {
      const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name:       { $regex: esc(q), $options: 'i' } },
        { type:       { $regex: esc(q), $options: 'i' } },
        { roomNumber: { $regex: esc(q), $options: 'i' } },
        { location:   { $regex: esc(q), $options: 'i' } },
      ];
    }
    if (type)     filter.type     = new RegExp(type, 'i');
    if (location) filter.location = new RegExp(location, 'i');

    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      filter.price = {};
      if (!Number.isNaN(min)) filter.price.$gte = min;
      if (!Number.isNaN(max)) filter.price.$lte = max;
      if (Object.keys(filter.price).length === 0) delete filter.price;
    }

    // Mặc định chỉ lấy phòng available
    filter.status = 'available';

    // --- Loại các phòng đã bị đặt chồng ngày (nếu có model Booking) ---
    if (Booking && checkIn && checkOut) {
      const start = new Date(checkIn);
      const end   = new Date(checkOut);
      if (!isNaN(start) && !isNaN(end) && end > start) {
        // tìm các booking trùng khoảng (start <= b.end && end >= b.start)
        const conflicts = await Booking.find({
          $or: [
            { checkIn:  { $lte: end },   checkOut: { $gte: start } },
            { startDate:{ $lte: end },   endDate:  { $gte: start } }, // nếu DB dùng tên khác
          ],
          status: { $nin: ['cancelled'] }
        }).select('room').lean();

        const busyIds = conflicts.map(b => b.room).filter(Boolean);
        if (busyIds.length) {
          filter._id = { $nin: busyIds };
        }
      }
    }

    // --- Sort ---
    const sortOpt = { price: 1 };
    if (sort === 'price_desc')       Object.assign(sortOpt, { price: -1 });
    else if (sort === 'name_asc')    Object.assign(sortOpt, { name: 1 });
    else if (sort === 'name_desc')   Object.assign(sortOpt, { name: -1 });
    else                             Object.assign(sortOpt, { price: 1 });

    // --- Query ---
    const rooms = await Room.find(filter).sort(sortOpt).limit(60).lean();

    // Render trang search kèm lại query để fill form
    res.render('search', {
      title: 'Tìm kiếm phòng',
      rooms,
      query: { q, type, location, minPrice, maxPrice, checkIn, checkOut, sort }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
