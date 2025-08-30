const mongoose = require('mongoose');

const raffleSchema = new mongoose.Schema({
    raffleId: { type: Number, required: true, unique: true }, // on-chain ID or backend generated
    ownerAddress: { type: String, required: true },          // Merchant wallet
    prizeAmount: { type: String, required: true },           // e.g., in wei
    numWinners: { type: Number, required: true },
    endTime: { type: Number, required: true },               // timestamp
    numEntries: { type: Number, required: true },            // total QR codes generated
    createdAt: { type: Date, default: Date.now },
    revealed: { type: Boolean, default: false },
    revealTxHash: { type: String, default: null }            // store tx hash for reveal
});

module.exports = mongoose.model('Raffle', raffleSchema);
