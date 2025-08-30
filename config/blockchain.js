require("dotenv").config();
const { ethers } = require("ethers");
const abi = require("./abi.json");

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

module.exports = { provider, wallet, contract, ethers };