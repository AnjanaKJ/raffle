// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ZkAssetRaffleFactory {
    struct Raffle {
        address owner;          // Merchant who created this raffle
        uint256 numWinners;     // Number of winners
        uint256 prizeAmount;    // Prize amount per winner
        uint256 endTime;        // End time (timestamp)
        address[] participants; // Registered participants
        address[] winners;      // Winners after reveal
        bool revealed;          // Whether winners are revealed
        uint256 totalFunded;    // Total AVAX funded for prizes
    }

    uint256 public raffleCount;
    mapping(uint256 => Raffle) public raffles;

    event RaffleCreated(uint256 raffleId, address owner, uint256 numWinners, uint256 prizeAmount, uint256 endTime);
    event Entered(uint256 raffleId, address participant);
    event WinnersRevealed(uint256 raffleId, address[] winners);

    modifier onlyOwner(uint256 raffleId) {
        require(msg.sender == raffles[raffleId].owner, "Not authorized");
        _;
    }

    modifier beforeEnd(uint256 raffleId) {
        require(block.timestamp < raffles[raffleId].endTime, "Raffle ended");
        _;
    }

    modifier afterEnd(uint256 raffleId) {
        require(block.timestamp >= raffles[raffleId].endTime, "Raffle still running");
        _;
    }

    // Create a new raffle
    function createRaffle(uint256 _numWinners, uint256 _prizeAmount, uint256 _endTime) external payable {
        require(msg.value == _numWinners * _prizeAmount, "Insufficient prize funding");

        raffleCount++;
        Raffle storage r = raffles[raffleCount];
        r.owner = msg.sender;
        r.numWinners = _numWinners;
        r.prizeAmount = _prizeAmount;
        r.endTime = _endTime;
        r.totalFunded = msg.value;

        emit RaffleCreated(raffleCount, msg.sender, _numWinners, _prizeAmount, _endTime);
    }

    // Users enter a raffle
    function enterRaffle(uint256 raffleId) external beforeEnd(raffleId) {
        Raffle storage r = raffles[raffleId];
        r.participants.push(msg.sender);
        emit Entered(raffleId, msg.sender);
    }

    // Owner reveals winners
    function revealWinners(uint256 raffleId) external onlyOwner(raffleId) afterEnd(raffleId) {
        Raffle storage r = raffles[raffleId];
        require(!r.revealed, "Already revealed");
        require(r.participants.length >= r.numWinners, "Not enough participants");

        for (uint256 i = 0; i < r.numWinners; i++) {
            uint256 randIndex = uint256(
                keccak256(abi.encodePacked(block.timestamp, block.prevrandao, i))
            ) % r.participants.length;

            address winner = r.participants[randIndex];
            r.winners.push(winner);

            // Send prize directly
            (bool sent, ) = winner.call{value: r.prizeAmount}("");
            require(sent, "Prize transfer failed");
        }

        r.revealed = true;
        emit WinnersRevealed(raffleId, r.winners);
    }

    // View participants
    function getParticipants(uint256 raffleId) external view returns (address[] memory) {
        return raffles[raffleId].participants;
    }

    // View winners
    function getWinners(uint256 raffleId) external view returns (address[] memory) {
        return raffles[raffleId].winners;
    }
}
