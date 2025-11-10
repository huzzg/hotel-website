// models/Room.js
const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },         // "Deluxe - 102"
    type: { type: String, required: true },         // Standard | Superior | Deluxe | Suite
    roomNumber: { type: String },                   // "102"
    location: { type: String, default: '' },        // Hà Nội / Đà Nẵng / TP.HCM / Phú Quốc...
    price: { type: Number, required: true },        // VND/đêm
    status: { type: String, enum: ['available','booked','maintenance'], default: 'available' },
    image: { type: String, default: '/images/room1.jpeg' }, // ảnh đại diện
    images: [{ type: String }],                     // ảnh bổ sung
    capacity: { type: Number, default: 2 },
    amenities: [{ type: String }],
    description: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', RoomSchema);
