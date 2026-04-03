import { ethers } from 'ethers';
import { BLOCKCHAIN_CONFIG } from '../config/contracts';

// Connects to MetaMask and switches to the correct chain.
// Returns the wallet address on success.
// Throws an error if MetaMask is unavailable or user rejects the connection.
export const connectWallet = async () => {
  if (!window.ethereum) {
    // MetaMask is not installed – throw so callers can handle gracefully
    throw new Error('MetaMask not installed. Please install MetaMask to use wallet features.');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock MetaMask.');
    }

    // Try to switch to the correct network (best-effort, don't block login)
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const expectedChainId = `0x${BLOCKCHAIN_CONFIG.chainId.toString(16)}`;

      if (chainId !== expectedChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChainId }]
          });
        } catch (switchError) {
          // Chain doesn't exist – try to add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: expectedChainId,
                  chainName: BLOCKCHAIN_CONFIG.chainName,
                  rpcUrls: [BLOCKCHAIN_CONFIG.rpcUrl],
                  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
                }]
              });
            } catch (addErr) {
              console.warn('Could not add network to MetaMask:', addErr.message);
            }
          }
          // Other switch errors are ignored – the user is still connected to *some* network
        }
      }
    } catch (networkErr) {
      console.warn('Network check failed (non-fatal):', networkErr.message);
    }

    return accounts[0];
  } catch (error) {
    // User rejected the MetaMask popup
    if (error.code === 4001) {
      throw new Error('MetaMask connection rejected by user.');
    }
    console.error('connectWallet error:', error);
    throw error;
  }
};

export const getProvider = () => {
  if (!window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum);
};

export const getSigner = async () => {
  const provider = getProvider();
  if (!provider) return null;
  try {
    return await provider.getSigner();
  } catch (_) {
    return null;
  }
};

export const getContract = async (address, abi) => {
  const signer = await getSigner();
  if (!signer) return null;
  return new ethers.Contract(address, abi, signer);
};

export const formatAddress = (address) => {
  if (!address) return 'No Wallet';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const formatEther = (value) => {
  return ethers.formatEther(value);
};

export const parseEther = (value) => {
  return ethers.parseEther(value.toString());
};
