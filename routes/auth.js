// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// GET: Login
router.get("/login", (req, res) => {
  res.render("login", { title: "Đăng nhập", authPage: true, error: null, email: "" });
});

// POST: Login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render("login", {
        title: "Đăng nhập",
        authPage: true,
        error: "Vui lòng nhập đầy đủ thông tin",
        email
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render("login", {
        title: "Đăng nhập",
        authPage: true,
        error: "Email không tồn tại",
        email
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).render("login", {
        title: "Đăng nhập",
        authPage: true,
        error: "Sai mật khẩu",
        email
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    if (user.role === "admin") return res.redirect("/admin");
    return res.redirect("/");
  } catch (err) { next(err); }
});

// GET: Register
router.get("/register", (req, res) => {
  res.render("register", { title: "Đăng ký", authPage: true, error: null });
});

// POST: Register
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).render("register", {
        title: "Đăng ký",
        authPage: true,
        error: "Vui lòng điền họ tên, email và mật khẩu"
      });
    }

    const existed = await User.findOne({ email });
    if (existed) {
      return res.status(400).render("register", {
        title: "Đăng ký",
        authPage: true,
        error: "Email đã tồn tại"
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      phone,
      password: hashed,
      role: "user",
    });

    await newUser.save();
    return res.redirect("/auth/login");
  } catch (err) { next(err); }
});

// Logout
router.get("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
  res.redirect("/");
});

module.exports = router;
