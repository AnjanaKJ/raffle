const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
    qrId: { type: String, required: true, unique: true },   // UUID for QR code
    raffleId: { type: Number, required: true, ref: 'Raffle' }, 
    used: { type: Boolean, default: false },               // whether QR is scanned
    createdAt: { type: Date, default: Date.now },
    scannedAt: { type: Date }                               // timestamp when scanned
});

module.exports = mongoose.model('QRCode', qrCodeSchema);
