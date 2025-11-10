// app.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { connectDB } = require('./config/db');
const Room = require('./models/Room');

// ROUTES sẵn có của bạn
const authRoutes  = require('./routes/auth');
const userRoutes  = require('./routes/user');
const adminRoutes = require('./routes/admin'); // UI + API admin (đã gộp)

// ROUTES tuỳ tồn tại
let apiRouter = null;
let searchRouter = null;
let paymentRouter = null;
try { apiRouter     = require('./routes/api'); }      catch (_) {}
try { searchRouter  = require('./routes/search'); }   catch (_) {}
try { paymentRouter = require('./routes/payment'); }  catch (_) {}

// MIDDLEWARE
const { attachUser, requireAuth } = require('./middleware/authMiddleware');
const requireAdmin               = require('./middleware/requireAdmin');
const errorHandler               = require('./middleware/errorHandler');

const app = express();
connectDB();

// View + static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Bảo đảm luôn có currentUser trong EJS (kể cả chưa đăng nhập)
app.use((req, res, next) => { res.locals.currentUser = null; next(); });
// Gắn user từ JWT (không redirect)
app.use(attachUser);

// Các route public
if (searchRouter) app.use('/', searchRouter);   // /search
if (apiRouter)    app.use('/', apiRouter);      // /api/...
app.use('/auth', authRoutes);

// Trang chủ – lấy phòng nổi bật từ DB
app.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find({ status: { $ne: 'maintenance' } })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    res.render('index', { title: 'Trang chủ', rooms });
  } catch (err) { next(err); }
});

// Khu vực người dùng (nếu có yêu cầu đăng nhập)
if (userRoutes) app.use('/user', requireAuth, userRoutes);

// Khu vực Admin (CHỈ mount 1 lần)
app.use('/admin', requireAdmin, adminRoutes);

// Thanh toán (nếu có) – cần đăng nhập
if (paymentRouter) app.use('/payment', requireAuth, paymentRouter);

// Error handler
app.use(errorHandler);

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy tại http://localhost:${PORT}`));
