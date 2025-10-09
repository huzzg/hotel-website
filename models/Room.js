const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: 'available' },
  location: { type: String, default: 'Unknown' }
});

module.exports = mongoose.model('Room', roomSchema);