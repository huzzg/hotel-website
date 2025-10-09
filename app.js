const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken'); // Thêm để verify token

dotenv.config();
const app = express();

// Kết nối database
connectDB();

// Cấu hình view engine và static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Middleware kiểm tra đăng nhập
const authMiddleware = require('./middleware/authMiddleware');

// Seed data
const seedData = async () => {
  const User = require('./models/User');
  const Room = require('./models/Room');
  const existingUser = await User.countDocuments();
  if (existingUser === 0) {
    const admin = new User({ username: 'admin', password: 'admin123', email: 'admin@hotel.com', role: 'admin' });
    await admin.save();
    console.log('Admin user seeded');
  }
  const existingRoom = await Room.countDocuments();
  if (existingRoom === 0) {
    await Room.insertMany([
      { roomNumber: "101", type: "Standard", price: 100, status: "available", location: "Đà Nẵng" },
      { roomNumber: "102", type: "Deluxe", price: 150, status: "available", location: "Hà Nội" },
      { roomNumber: "103", type: "Suite", price: 200, status: "available", location: "Phuket" },
    ]);
    console.log('Rooms seeded');
  }
};
seedData().catch(err => console.error('Seed error:', err));

// Route chính với caching
const NodeCache = require('node-cache');
const roomCache = new NodeCache({ stdTTL: 300 });
app.get('/', async (req, res, next) => {
  let user = null;
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = { id: decoded.id, role: decoded.role }; // Gán user từ token
    } catch (err) {
      console.error('Token verification error:', err);
    }
  }

  const cachedRooms = roomCache.get('availableRooms');
  if (cachedRooms) {
    return res.render('index', { rooms: cachedRooms, user });
  }

  try {
    const Room = require('./models/Room');
    const rooms = await Room.find({ status: 'available' });
    roomCache.set('availableRooms', rooms);
    res.render('index', { rooms, user });
  } catch (err) {
    next(err);
  }
});

// Route cho các module
app.use('/auth', authRoutes);
app.use('/user', authMiddleware, userRoutes);
app.use('/admin', authMiddleware, adminRoutes);

// Middleware xử lý lỗi tập trung
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));