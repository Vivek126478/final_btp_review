import deployedAddresses from '../contracts/contract-addresses.json';

export const CONTRACT_ADDRESSES = {
  UserIdentity: process.env.REACT_APP_USER_IDENTITY_CONTRACT || deployedAddresses.UserIdentity,
  RideContract: process.env.REACT_APP_RIDE_CONTRACT || deployedAddresses.RideContract,
  Reputation: process.env.REACT_APP_REPUTATION_CONTRACT || deployedAddresses.Reputation,
  DPoSGovernance: process.env.REACT_APP_DPOS_GOVERNANCE_CONTRACT || deployedAddresses.DPoSGovernance,
  DisputeResolution: process.env.REACT_APP_DISPUTE_RESOLUTION_CONTRACT || deployedAddresses.DisputeResolution,
  ZKPDriverVerifier: process.env.REACT_APP_ZKP_DRIVER_VERIFIER_CONTRACT || deployedAddresses.ZKPDriverVerifier
};

export const BLOCKCHAIN_CONFIG = {
  rpcUrl: process.env.REACT_APP_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  chainId: parseInt(process.env.REACT_APP_CHAIN_ID || '11155111'),
  chainName: process.env.REACT_APP_CHAIN_NAME || 'Sepolia',
  blockExplorerUrl: 'https://sepolia.etherscan.io'
};

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
