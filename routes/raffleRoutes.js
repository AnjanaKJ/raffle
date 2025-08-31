const express = require("express");
const router = express.Router();
const raffleController = require("../controllers/raffleController");
const multer = require("multer");

// Configure multer storage
const upload = multer({ dest: "uploads/" });

// Existing raffle routes
router.post("/create", raffleController.createRaffle);
router.post("/:id/enter", raffleController.enterRaffle);
router.post("/:id/reveal", raffleController.revealWinners);
router.get("/:id/participants", raffleController.getParticipants);
router.get("/:id/winners", raffleController.getWinners);
router.post("/:id/generateQRCodes", raffleController.generateQRCodes);

// Deploy NFT with image (use multer to handle file upload)
router.post("/deployNFT", upload.single("image"), raffleController.deployNFTWithImage);

// Mint NFT to losers
router.post("/:id/mintNFTLosers", raffleController.mintNFTToLosers);

module.exports = router;
