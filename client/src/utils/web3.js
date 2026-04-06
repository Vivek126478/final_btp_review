import { ethers } from 'ethers';
import { BLOCKCHAIN_CONFIG } from '../config/contracts';

// Resolve the correct ethereum provider, handling multi-wallet (EIP-6963)
// and delayed injection scenarios.
export const getEthereumProvider = () => {
  if (window.ethereum?.providers?.length) {
    // Multiple wallet extensions installed – pick MetaMask specifically
    return window.ethereum.providers.find((p) => p.isMetaMask) || window.ethereum;
  }
  return window.ethereum;
};

// Wait for MetaMask to inject window.ethereum (handles delayed injection)
const waitForEthereum = (timeout = 3000) =>
  new Promise((resolve, reject) => {
    const provider = getEthereumProvider();
    if (provider) {
      resolve(provider);
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(
          new Error(
            'MetaMask not installed. Please install MetaMask to use wallet features.'
          )
        );
      }
    }, timeout);

    // MetaMask fires this event when injection finishes after page load
    window.addEventListener(
      'ethereum#initialized',
      () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(getEthereumProvider());
        }
      },
      { once: true }
    );
  });

// Connects to MetaMask and switches to the correct chain.
// Returns the wallet address on success.
// Throws an error if MetaMask is unavailable or user rejects the connection.
export const connectWallet = async () => {
  const provider = await waitForEthereum();

  if (!provider) {
    throw new Error('MetaMask not installed. Please install MetaMask to use wallet features.');
  }

  try {
    // Request account access
    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock MetaMask.');
    }

    // Try to switch to the correct network (best-effort, don't block login)
    try {
      const chainId = await provider.request({ method: 'eth_chainId' });
      const expectedChainId = `0x${BLOCKCHAIN_CONFIG.chainId.toString(16)}`;

      if (chainId !== expectedChainId) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChainId }]
          });
        } catch (switchError) {
          // Chain doesn't exist – try to add it
          if (switchError.code === 4902) {
            try {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: expectedChainId,
                  chainName: BLOCKCHAIN_CONFIG.chainName,
                  rpcUrls: [BLOCKCHAIN_CONFIG.rpcUrl],
                  nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                  blockExplorerUrls: [BLOCKCHAIN_CONFIG.blockExplorerUrl]
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
  const eth = getEthereumProvider();
  if (!eth) return null;
  return new ethers.BrowserProvider(eth);
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
