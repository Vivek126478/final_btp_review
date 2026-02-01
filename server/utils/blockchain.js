const path = require('path');

const getRpcUrl = () => {
  return process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
};

const normalizePrivateKey = (pk) => {
  if (!pk) return null;
  const trimmed = String(pk).trim();
  if (!trimmed) return null;
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
};

const loadAbi = (filename) => {
  // Use ABI JSON produced by hardhat deploy script.
  // Path is relative to server/ directory.
  const abiPath = path.join(__dirname, '..', '..', 'contracts', 'deployments', 'abis', filename);
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(abiPath);
};

exports.getEthers = () => {
  // Lazy require so server can still start even if ethers isn't installed yet
  // (but blockchain features will fail clearly)
  // eslint-disable-next-line global-require
  return require('ethers');
};

exports.getProvider = () => {
  const { JsonRpcProvider } = exports.getEthers();
  return new JsonRpcProvider(getRpcUrl());
};

exports.getWallet = () => {
  const { Wallet } = exports.getEthers();
  const pk = normalizePrivateKey(process.env.PRIVATE_KEY);
  if (!pk) {
    throw new Error('PRIVATE_KEY is not configured');
  }
  const provider = exports.getProvider();
  return new Wallet(pk, provider);
};

exports.getRideContract = () => {
  const { Contract } = exports.getEthers();
  const address = process.env.RIDE_CONTRACT_ADDRESS;
  if (!address) throw new Error('RIDE_CONTRACT_ADDRESS is not configured');
  const abi = loadAbi('RideContract.json');
  return new Contract(address, abi, exports.getWallet());
};

exports.getDisputeResolutionContract = () => {
  const { Contract } = exports.getEthers();
  const address = process.env.DISPUTE_RESOLUTION_CONTRACT_ADDRESS;
  if (!address) throw new Error('DISPUTE_RESOLUTION_CONTRACT_ADDRESS is not configured');
  const abi = loadAbi('DisputeResolution.json');
  return new Contract(address, abi, exports.getWallet());
};
