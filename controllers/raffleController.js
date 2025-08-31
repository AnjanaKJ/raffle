const raffleService = require("../services/raffleService");
const QRCode = require('../models/QRCode');
const Raffle = require('../models/Raffle');
const Participant = require('../models/Participant');
const { v4: uuidv4 } = require('uuid');
const QRCodeImage = require('qrcode');
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

async function createRaffle(req, res) {
  try {
    const { numWinners, prizeAmount, endTime, ownerAddress } = req.body;

    const currentTime = Math.floor(Date.now() / 1000); 
    const shortEndTime = currentTime + 240;
    const receipt = await raffleService.createRaffle(numWinners, prizeAmount, shortEndTime);

    let raffleId;

    for (const log of receipt.logs) {
        try {
            if (log.fragment && log.fragment.name === "RaffleCreated") {
                raffleId = typeof log.args.raffleId !== "undefined"
                    ? Number(log.args.raffleId)
                    : Number(log.args[0]);
                break;
            }
        } catch (err) {
            console.log("Skipping log:", log);
        }
    }
    if (typeof raffleId === "undefined") {
        return res.status(500).json({ error: "RaffleCreated event not found" });
    }

    const raffle = await Raffle.create({
      raffleId,
      ownerAddress,
      numWinners,
      prizeAmount,
      endTime,
      numEntries: 0
    });

    res.json({
      message: "Raffle created successfully",
      txHash: receipt.logs[0]?.transactionHash || receipt.hash,
      raffleId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function enterRaffle(req, res) {
    try {
        const { id } = req.params; 
        const { userPrivateKey, qrId } = req.body;

        const qr = await QRCode.findOne({ qrId, raffleId: id });
        if (!qr) return res.status(404).json({ error: 'QR code not found' });
        if (qr.used) return res.status(400).json({ error: 'QR code already used' });

        const receipt = await raffleService.enterRaffle(id, userPrivateKey);

        // Mark QR as used
        qr.used = true;
        qr.userAddress = receipt.from || qr.userAddress;
        await qr.save();

        // Save participant entry
        const participant = await Participant.create({
            raffleId: Number(id),
            qrId,
            userAddress: qr.userAddress,
            txHash: receipt.hash
        });

        res.json({
            message: "Entered raffle successfully",
            txHash: receipt.hash,
            participant
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function revealWinners(req, res) {
    try {
        const { id } = req.params;

        const receipt = await raffleService.revealWinners(id);

        let winners = [];
        for (const log of receipt.logs) {
            if (log.fragment && log.fragment.name === "WinnersRevealed") {
                winners = Array.isArray(log.args.winners)
                    ? log.args.winners
                    : log.args[1];
                break;
            }
        }

        if (!winners || winners.length === 0) {
            return res.status(500).json({ error: "WinnersRevealed event not found or no winners" });
        }

        await Participant.updateMany(
            { raffleId: Number(id), userAddress: { $in: winners } },
            { $set: { winner: true } }
        );

        const updatedRaffle = await Raffle.findOneAndUpdate(
            { raffleId: Number(id) },
            { $set: { revealed: true, revealTxHash: receipt.hash } },
            { new: true }
        );

        if (!updatedRaffle) {
            return res.status(404).json({ error: "Raffle not found" });
        }

        res.json({
            message: "Winners revealed",
            txHash: receipt.hash,
            raffleId: id,
            winners
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getParticipants(req, res) {
    try {
        const { id } = req.params;
        const participants = await raffleService.getParticipants(id);
        res.json({ participants });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getWinners(req, res) {
    try {
        const { id } = req. params;
        const winners = await raffleService.getWinners(id);
        res.json({ winners });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function generateQRCodes(req, res) {
    try {
        const raffleId = Number(req.params.id);
        const { numQRCodes } = req.body;

        const raffle = await Raffle.findOne({ raffleId });
        if (!raffle) {
            return res.status(404).json({ error: 'Raffle not found' });
        }

        if (!numQRCodes || numQRCodes <= 0) {
            return res.status(400).json({ error: 'Invalid number of QR codes' });
        }

        const qrList = [];
        const qrImages = [];

        for (let i = 0; i < numQRCodes; i++) {
            const qrId = uuidv4();

            // Data to encode in the QR
            const qrData = { qrId, raffleId };

            // Generate QR code as base64
            const qrImage = await QRCodeImage.toDataURL(JSON.stringify(qrData));

            qrList.push({
                raffleId,
                qrId,
                used: false
            });

            qrImages.push({
                qrId,
                raffleId,
                qrImage
            });
        }

        // Insert QR codes in DB
        await QRCode.insertMany(qrList);

        // Update raffle.numEntries (increment by number of QR codes generated)
        raffle.numEntries += numQRCodes;
        await raffle.save();

        res.status(201).json({
            message: `${numQRCodes} QR codes generated successfully`,
            totalEntries: raffle.numEntries,
            qrCodes: qrImages   // includes qrId, raffleId, and QR image
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function deployNFTWithImage(req, res) {
    try {
        const { raffleId, name, symbol } = req.body;
        if (!raffleId) return res.status(400).json({ error: "Missing raffleId" });

        if (!req.file) return res.status(400).json({ error: "Image file is required" });

        const filePath = req.file.path;
        const fileName = req.file.originalname;

        // Upload to Pinata
        const ipfsURL = await uploadToPinata(filePath, fileName);

        // Use image URL as baseURI for NFT
        const tx = await raffleService.deployNFTForRaffle(raffleId, name, symbol, ipfsURL);

        res.json({
            message: "NFT deployed successfully",
            txHash: tx.hash,
            ipfsURL
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

async function uploadToPinata(filePath, fileName) {
    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    // Optional metadata
    const metadata = JSON.stringify({
        name: fileName,
        keyvalues: {
            app: "raffle-system",
            timestamp: new Date().toISOString()
        }
    });
    formData.append("pinataMetadata", metadata);

    // Optional options
    const pinataOptions = JSON.stringify({
        cidVersion: 0,
        wrapWithDirectory: false
    });
    formData.append("pinataOptions", pinataOptions);

    const response = await axios.post(url, formData, {
        maxBodyLength: "Infinity", // Required for large files
        headers: {
            "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_API_KEY
        },
        timeout: 30000 // 30s
    });

    // Returns IPFS hash and URL
    return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
}

async function mintNFTToLosers(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Missing raffleId" });
        }

        const tx = await raffleService.mintNFTToLosers(id);
        res.json({
            message: "NFT minted to losers successfully",
            txHash: tx.hash
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


module.exports = {
    createRaffle,
    enterRaffle,
    revealWinners,
    getParticipants,
    getWinners,
    generateQRCodes,
    deployNFTWithImage,
    mintNFTToLosers
};
