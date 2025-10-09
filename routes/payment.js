const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

const router = express.Router();

// Trang thanh toán
router.get('/:bookingId', async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId).populate('roomId');
  const amount = booking.roomId.price * ((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)); // Tính ngày
  res.render('payment', { booking, amount, stripePublicKey: 'pk_test_...' }); // Lấy public key từ Stripe dashboard
});

// Xử lý thanh toán (POST từ form)
router.post('/:bookingId', async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  const amount = /* tính như trên */;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // cents
      currency: 'usd',
      payment_method: req.body.payment_method_id,
      confirm: true,
      return_url: 'http://localhost:3000/payment/success' // Redirect sau thành công
    });
    const payment = new Payment({ bookingId: booking._id, amount, status: 'paid' });
    await payment.save();
    await Booking.findByIdAndUpdate(booking._id, { status: 'confirmed' });
    res.redirect('/user/history');
  } catch (err) {
    res.status(500).send('Payment error');
  }
});

module.exports = router;