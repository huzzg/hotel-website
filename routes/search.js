// routes/search.js
const express = require('express');
const router = express.Router();

const Room = require('../models/Room');
const Booking = require('../models/Booking');

// GET /search?checkIn=&checkOut=&q=&type=&location=&minPrice=&maxPrice=&sort=
router.get('/search', async (req, res, next) => {
  try {
    let {
      checkIn,
      checkOut,
      q = '',          // từ khóa: tên phòng, roomNumber, type, location
      type = '',
      location = '',
      minPrice = '',
      maxPrice = '',
      sort = 'price_asc'   // price_asc | price_desc | name_asc | name_desc
    } = req.query || {};

    // --- Chuẩn hoá ngày ---
    const hasDates = checkIn && checkOut;
    let inDate, outDate;
    if (hasDates) {
      inDate = new Date(checkIn);
      outDate = new Date(checkOut);
      if (isNaN(inDate) || isNaN(outDate) || outDate <= inDate) {
        return res.status(400).render('search', {
          title: 'Kết quả tìm kiếm',
          error: 'Khoảng ngày không hợp lệ',
          rooms: [],
          query: { checkIn, checkOut, q, type, location, minPrice, maxPrice, sort }
        });
      }
    }

    // --- Tìm các phòng đang bận trong khoảng ngày (pending/confirmed) ---
    let unavailableRoomIds = [];
    if (hasDates) {
      const overlapping = await Booking.find({
        status: { $in: ['pending', 'confirmed'] },
        // (booking.checkIn < outDate) && (booking.checkOut > inDate)
        checkIn: { $lt: outDate },
        checkOut: { $gt: inDate }
      }).select('roomId');

      unavailableRoomIds = overlapping.map(b => b.roomId);
    }

    // --- Lọc phòng ---
    const filter = {};

    // Chỉ lấy phòng đang available (nếu business của bạn yêu cầu)
    filter.status = 'available';

    // Loại bỏ phòng bận
    if (hasDates && unavailableRoomIds.length) {
      filter._id = { $nin: unavailableRoomIds };
    }

    // Từ khóa tìm theo tên phòng / mã phòng / loại / địa điểm
    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [
        { name: rx },        // nếu schema có name
        { roomNumber: rx },
        { type: rx },
        { location: rx }
      ];
    }

    // Lọc chính xác theo type/location nếu có
    if (type && type.trim()) filter.type = type.trim();
    if (location && location.trim()) filter.location = new RegExp(location.trim(), 'i');

    // Khoảng giá
    const priceQuery = {};
    if (minPrice !== '') priceQuery.$gte = Number(minPrice);
    if (maxPrice !== '') priceQuery.$lte = Number(maxPrice);
    if (Object.keys(priceQuery).length) filter.price = priceQuery;

    // --- Sắp xếp ---
    let sortQuery = {};
    switch (sort) {
      case 'price_desc': sortQuery = { price: -1 }; break;
      case 'name_asc':   sortQuery = { name: 1, roomNumber: 1 }; break;
      case 'name_desc':  sortQuery = { name: -1, roomNumber: 1 }; break;
      default:           sortQuery = { price: 1 }; // price_asc
    }

    // --- Truy vấn ---
    const rooms = await Room
      .find(filter)
      .sort(sortQuery)
      .lean();

    return res.render('search', {
      title: 'Kết quả tìm kiếm',
      rooms,
      query: { checkIn, checkOut, q, type, location, minPrice, maxPrice, sort }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
