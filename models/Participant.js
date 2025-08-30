const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    raffleId: { type: Number, required: true, ref: 'Raffle' },
    qrId: { type: String, required: true, ref: 'QRCode' },
    userAddress: { type: String, required: true },     // Wallet of participant
    enteredAt: { type: Date, default: Date.now },
    txHash: { type: String, required: true },         // store entry tx hash
    winner: { type: Boolean, default: false }        // whether participant is a winner
});

module.exports = mongoose.model('Participant', participantSchema);
