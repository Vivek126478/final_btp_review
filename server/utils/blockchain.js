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
  delete require.cache[require.resolve(abiPath)]; // Clear cache to get fresh ABI
  return require(abiPath);
};

const loadContractAddresses = () => {
  try {
    const addressPath = path.join(__dirname, '..', '..', 'contracts', 'deployments', 'contract-addresses.json');
    delete require.cache[require.resolve(addressPath)]; // Clear cache for fresh addresses
    return require(addressPath);
  } catch (e) {
    console.warn('Could not load contract-addresses.json:', e.message);
    return {};
  }
};

exports.getEthers = () => {
  // Lazy require so server can still start even if ethers isn't installed yet
  // (but blockchain features will fail clearly)
  // eslint-disable-next-line global-require
  return require('ethers');
};

// Create a fresh provider each time to avoid stale connections
exports.getProvider = () => {
  const { JsonRpcProvider } = exports.getEthers();
  return new JsonRpcProvider(getRpcUrl());
};

// Create a fresh wallet each time to avoid nonce caching issues
// This ensures we always get the latest nonce from the network
exports.getWallet = () => {
  const { Wallet } = exports.getEthers();
  const pk = normalizePrivateKey(process.env.PRIVATE_KEY);
  if (!pk) {
    throw new Error('PRIVATE_KEY is not configured');
  }
  // Create fresh provider and wallet to avoid nonce caching
  const provider = exports.getProvider();
  return new Wallet(pk, provider);
};

// Helper to get a contract with a fresh wallet (avoids nonce issues)
const getContractWithFreshWallet = (address, abi) => {
  const { Contract } = exports.getEthers();
  const wallet = exports.getWallet();
  return new Contract(address, abi, wallet);
};

exports.getRideContract = () => {
  const addresses = loadContractAddresses();
  const address = process.env.RIDE_CONTRACT_ADDRESS || addresses.RideContract;
  if (!address) throw new Error('RIDE_CONTRACT_ADDRESS is not configured');
  const abi = loadAbi('RideContract.json');
  return getContractWithFreshWallet(address, abi);
};

exports.getDisputeResolutionContract = () => {
  const addresses = loadContractAddresses();
  const address = process.env.DISPUTE_RESOLUTION_CONTRACT_ADDRESS || addresses.DisputeResolution;
  if (!address) throw new Error('DISPUTE_RESOLUTION_CONTRACT_ADDRESS is not configured');
  const abi = loadAbi('DisputeResolution.json');
  return getContractWithFreshWallet(address, abi);
};

exports.getUserIdentityContract = () => {
  const addresses = loadContractAddresses();
  const address = process.env.USER_IDENTITY_CONTRACT_ADDRESS || addresses.UserIdentity;
  if (!address) throw new Error('USER_IDENTITY_CONTRACT_ADDRESS is not configured');
  const abi = loadAbi('UserIdentity.json');
  return getContractWithFreshWallet(address, abi);
};

exports.getZKPDriverVerifierContract = () => {
  const addresses = loadContractAddresses();
  const address = process.env.ZKP_DRIVER_VERIFIER_CONTRACT_ADDRESS || addresses.ZKPDriverVerifier;
  if (!address) throw new Error('ZKP_DRIVER_VERIFIER_CONTRACT_ADDRESS is not configured. Please redeploy contracts.');
  const abi = loadAbi('ZKPDriverVerifier.json');
  return getContractWithFreshWallet(address, abi);
};

exports.getDPoSGovernanceContract = () => {
  const addresses = loadContractAddresses();
  const address = process.env.DPOS_GOVERNANCE_CONTRACT_ADDRESS || addresses.DPoSGovernance;
  if (!address) throw new Error('DPOS_GOVERNANCE_CONTRACT_ADDRESS is not configured');
  const abi = loadAbi('DPoSGovernance.json');
  return getContractWithFreshWallet(address, abi);
};

exports.getMerkleAuditTrailContract = () => {
  const addresses = loadContractAddresses();
  const address = process.env.MERKLE_AUDIT_TRAIL_CONTRACT_ADDRESS || addresses.MerkleAuditTrail;
  if (!address) throw new Error('MERKLE_AUDIT_TRAIL_CONTRACT_ADDRESS is not configured. Please redeploy contracts.');
  const abi = loadAbi('MerkleAuditTrail.json');
  return getContractWithFreshWallet(address, abi);
};
