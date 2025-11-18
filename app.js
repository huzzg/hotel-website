// app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const app = express();

// ===== View & static =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// ===== DB connect =====
require('./config/db');

// ===== Session =====
app.use(
  session({
    secret: 'phenikaa_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel',
      ttl: 24 * 60 * 60,
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

app.use(flash());

// Biến dùng chung cho view
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// ===== Models =====
const Room = require('./models/Room');

// ===== Routes =====
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const searchRoutes = require('./routes/search');
const paymentRoutes = require('./routes/payment');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);
app.use('/search', searchRoutes);
app.use('/payment', paymentRoutes);

// ===== Trang chủ (luôn truyền rooms, kể cả khi DB lỗi) =====
app.get('/', async (req, res, next) => {
  try {
    let rooms = [];
    try {
      // Lấy 2 phòng nổi bật để hiển thị; nếu DB chưa kết nối sẽ vào catch
      rooms = await Room.find().limit(2).lean();
    } catch (e) {
      rooms = []; // fallback an toàn để view không lỗi
    }
    res.render('index', { title: 'Khách sạn Phenikaa', rooms });
  } catch (err) {
    next(err);
  }
});

// ===== Error handler =====
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).send('Something went wrong!');
});

// ===== Start =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
