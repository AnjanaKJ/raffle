const { contract, ethers, provider } = require("../config/blockchain");

async function createRaffle(numWinners, prizeAmount, endTime) {
  const totalPrize = ethers.parseEther(prizeAmount.toString()) * BigInt(numWinners);

  const tx = await contract.createRaffle(
    numWinners,
    ethers.parseEther(prizeAmount.toString()),
    endTime,
    { value: totalPrize }
  );
  return await tx.wait();
}

async function enterRaffle(raffleId, userPrivateKey) {
  const userWallet = new ethers.Wallet(userPrivateKey, provider);
  const userContract = contract.connect(userWallet);

  const tx = await userContract.enterRaffle(raffleId);
  return await tx.wait();
}

async function revealWinners(raffleId) {
  const tx = await contract.revealWinners(raffleId);
  return await tx.wait();
}

async function getParticipants(raffleId) {
  return await contract.getParticipants(raffleId);
}

async function getWinners(raffleId) {
  return await contract.getWinners(raffleId);
}

module.exports = {
  createRaffle,
  enterRaffle,
  revealWinners,
  getParticipants,
  getWinners,
  contract
};
