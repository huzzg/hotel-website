// app.js
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const authMiddleware = require('./middleware/authMiddleware');

// Truyền user cho mọi template
app.use((req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.locals.user = { id: decoded.id, role: decoded.role };
    } catch (err) { }
  }
  next();
});

// Routes
app.get('/', async (req, res, next) => {
  try {
    const Room = require('./models/Room');
    const rooms = await Room.find({ status: 'available' });
    res.render('index', { rooms });
  } catch (err) { next(err); }
});

app.use('/auth', authRoutes);
app.use('/user', authMiddleware, userRoutes);
app.use('/admin', authMiddleware, adminRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));