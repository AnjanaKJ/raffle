const express = require("express");
const router = express.Router();
const raffleController = require("../controllers/raffleController");

router.post("/create", raffleController.createRaffle);
router.post("/:id/enter", raffleController.enterRaffle);
router.post("/:id/reveal", raffleController.revealWinners);
router.get("/:id/participants", raffleController.getParticipants);
router.get("/:id/winners", raffleController.getWinners);
router.post("/:id/generateQRCodes", raffleController.generateQRCodes);

module.exports = router;
