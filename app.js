// app.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./config/db');

// ROUTES BẮT BUỘC
const authRoutes  = require('./routes/auth');
const userRoutes  = require('./routes/user');
const adminRoutes = require('./routes/admin');

// ROUTES TUỲ CHỌN (có thì require, KHÔNG thì bỏ qua) — đặt tên KHÁC nhau, tránh trùng
let apiRouter   = null;
let searchRouter = null;
let paymentRouter = null;

try { apiRouter    = require('./routes/api'); }     catch (_) {}
try { searchRouter = require('./routes/search'); }  catch (_) {}
try { paymentRouter = require('./routes/payment'); }catch (_) {}

let authMiddleware = (req,res,next)=>next();
try { authMiddleware = require('./middleware/authMiddleware'); } catch (_) {}

let requireAdmin = (req,res,next)=>next();
try { requireAdmin = require('./middleware/requireAdmin'); } catch (_) {}

let errorHandler = (err, req, res, next) => { console.error(err); res.status(500).send('Internal Server Error'); };
try { errorHandler = require('./middleware/errorHandler'); } catch (_) {}

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

// Gắn user từ cookie JWT cho EJS
app.use((req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (token) {
      const p = jwt.verify(token, process.env.JWT_SECRET);
      res.locals.currentUser = {
        id: p.id || p._id,
        name: p.name || p.username || (p.email ? p.email.split('@')[0] : 'Người dùng'),
        email: p.email || '',
        role: p.role || 'user',
        avatar: p.avatar || ''
      };
    } else res.locals.currentUser = null;
  } catch { res.locals.currentUser = null; }
  next();
});

// Trang chủ (rooms demo)
app.get('/', async (req, res, next) => {
  try {
    const Room = require('./models/Room');
    const rooms = await Room.find({ status: 'available' }).sort({ price: 1 }).limit(9).lean();
    res.render('index', { title: 'Trang chủ', rooms });
  } catch (e) { next(e); }
});

// Mount ROUTES — CHỈ 1 LẦN, TÊN BIẾN KHÁC NHAU
if (searchRouter) app.use('/', searchRouter);  // /search
if (apiRouter)    app.use('/', apiRouter);     // /api/...
app.use('/auth', authRoutes);
app.use('/user', authMiddleware, userRoutes);
app.use('/admin', requireAdmin, adminRoutes);
if (paymentRouter) app.use('/payment', authMiddleware, paymentRouter);

// Error handler
app.use(errorHandler);

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy tại http://localhost:${PORT}`));
