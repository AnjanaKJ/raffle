// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ZkAssetRaffleFactory {
    struct Raffle {
        address owner;
        uint256 numWinners;
        uint256 prizeAmount;
        uint256 endTime;
        address[] participants;
        address[] winners;
        bool revealed;
        uint256 totalFunded;
        string nftName;
        string nftSymbol;
        string nftBaseURI;
        mapping(uint256 => address) nftOwners;
        uint256 nextTokenId;
    }

    uint256 public raffleCount;
    mapping(uint256 => Raffle) public raffles;

    // Events
    event RaffleCreated(uint256 raffleId, address owner, uint256 numWinners, uint256 prizeAmount, uint256 endTime);
    event NFTDeployed(uint256 raffleId, string name, string symbol, string baseURI);
    event NFTMintedToLosers(uint256 raffleId);
    event Entered(uint256 raffleId, address participant);
    event WinnersRevealed(uint256 raffleId, address[] winners);

    // Modifiers
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

    // Create raffle
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

    // Deploy NFT for raffle
    // Deploy NFT for raffle
function deployNFTForRaffle(
    uint256 raffleId,
    string memory name,
    string memory symbol,
    string memory _baseURI
) external onlyOwner(raffleId) {
    Raffle storage r = raffles[raffleId];
    require(bytes(r.nftName).length == 0, "NFT already deployed");

    r.nftName = name;
    r.nftSymbol = symbol;
    r.nftBaseURI = _baseURI; // use the renamed parameter

    emit NFTDeployed(raffleId, name, symbol, _baseURI);
}


    // Mint NFTs to losers
    function mintNFTToLosers(uint256 raffleId) external onlyOwner(raffleId) {
        Raffle storage r = raffles[raffleId];
        require(bytes(r.nftName).length != 0, "NFT not deployed yet");
        require(r.revealed, "Winners not revealed yet");

        for (uint256 i = 0; i < r.participants.length; i++) {
            bool isWinner = false;
            for (uint256 j = 0; j < r.winners.length; j++) {
                if (r.participants[i] == r.winners[j]) {
                    isWinner = true;
                    break;
                }
            }
            if (!isWinner) {
                r.nftOwners[r.nextTokenId] = r.participants[i];
                r.nextTokenId++;
            }
        }

        emit NFTMintedToLosers(raffleId);
    }

    // Enter raffle
    function enterRaffle(uint256 raffleId) external beforeEnd(raffleId) {
        raffles[raffleId].participants.push(msg.sender);
        emit Entered(raffleId, msg.sender);
    }

    // Reveal winners and send prize
    function revealWinners(uint256 raffleId) external onlyOwner(raffleId) afterEnd(raffleId) {
        Raffle storage r = raffles[raffleId];
        require(!r.revealed, "Already revealed");
        require(r.participants.length >= r.numWinners, "Not enough participants");

        for (uint256 i = 0; i < r.numWinners; i++) {
            uint256 randIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, i))) % r.participants.length;
            address winner = r.participants[randIndex];
            r.winners.push(winner);
            (bool sent, ) = winner.call{value: r.prizeAmount}("");
            require(sent, "Prize transfer failed");
        }

        r.revealed = true;
        emit WinnersRevealed(raffleId, r.winners);
    }

    // Get NFT owner by tokenId
    function ownerOfNFT(uint256 raffleId, uint256 tokenId) external view returns (address) {
        Raffle storage r = raffles[raffleId];
        require(tokenId < r.nextTokenId, "ERC721: token does not exist");
        return r.nftOwners[tokenId];
    }

    // Get baseURI for a raffle NFT
    function baseURI(uint256 raffleId) external view returns (string memory) {
        return raffles[raffleId].nftBaseURI;
    }

    function getParticipants(uint256 raffleId) external view returns (address[] memory) {
        return raffles[raffleId].participants;
    }

    function getWinners(uint256 raffleId) external view returns (address[] memory) {
        return raffles[raffleId].winners;
    }

    function getRaffleCount() external view returns (uint256) {
        return raffleCount;
    }
}
