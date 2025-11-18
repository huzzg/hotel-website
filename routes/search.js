// routes/search.js
const express = require('express');
const router = express.Router();

const Room = require('../models/Room');
const Booking = require('../models/Booking');

// Kiểm tra có query thực sự hay không
const hasQuery = (q) => Object.keys(q || {}).some((k) => (q[k] ?? '') !== '');

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const type = (req.query.type || '').trim();       // Standard | Superior | Deluxe | Suite
    const city = (req.query.city || '').trim();       // Hà Nội / Đà Nẵng / TP.HCM / Phú Quốc ...
    const min = parseInt(req.query.min || '', 10);
    const max = parseInt(req.query.max || '', 10);
    const checkIn = (req.query.checkIn || '').trim();
    const checkOut = (req.query.checkOut || '').trim();
    const sort = (req.query.sort || 'priceAsc').trim();

    let rooms = [];
    let total = 0;

    if (hasQuery(req.query)) {
      // 1) Lọc cơ bản theo text / loại / địa điểm / khoảng giá
      const filter = {};
      if (q) {
        filter.$or = [
          { name: new RegExp(q, 'i') },
          { code: new RegExp(q, 'i') },
          { city: new RegExp(q, 'i') },
          { type: new RegExp(q, 'i') }
        ];
      }
      if (type) filter.type = type;
      if (city) filter.city = city;
      if (!Number.isNaN(min)) filter.price = { ...(filter.price || {}), $gte: min };
      if (!Number.isNaN(max)) filter.price = { ...(filter.price || {}), $lte: max };

      rooms = await Room.find(filter).lean();

      // 2) Loại trừ phòng đã bị đặt trùng ngày
      if (checkIn && checkOut) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);

        // điều kiện overlap: booking.checkIn < end && booking.checkOut > start
        const overlaps = await Booking.find({
          status: { $ne: 'cancelled' },
          checkIn: { $lt: end },
          checkOut: { $gt: start }
        })
          .select('roomId')
          .lean();

        const bookedIds = new Set(overlaps.map((b) => String(b.roomId)));
        rooms = rooms.filter((r) => !bookedIds.has(String(r._id)));
      }

      // 3) Sắp xếp
      switch (sort) {
        case 'priceDesc':
          rooms.sort((a, b) => (b.price || 0) - (a.price || 0));
          break;
        case 'nameAsc':
          rooms.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          break;
        case 'nameDesc':
          rooms.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
          break;
        default: // priceAsc
          rooms.sort((a, b) => (a.price || 0) - (b.price || 0));
          break;
      }

      total = rooms.length;
    }

    // Luôn render trang search (kể cả chưa nhập gì)
    res.render('search', {
      title: 'Tìm kiếm',
      rooms,
      total,
      query: {
        q,
        type,
        city,
        min: Number.isNaN(min) ? '' : min,
        max: Number.isNaN(max) ? '' : max,
        checkIn,
        checkOut,
        sort
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
