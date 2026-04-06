import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import { connectWallet, getEthereumProvider } from '../utils/web3';
import toast from 'react-hot-toast';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if wallet is already connected
  useEffect(() => {
    checkConnection();
    setupEventListeners();
    
    // Cleanup event listeners on unmount
    return () => {
      const eth = getEthereumProvider();
      if (eth) {
        eth.removeListener('accountsChanged', handleAccountsChanged);
        eth.removeListener('chainChanged', handleChainChanged);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkConnection = async () => {
    try {
      const savedUser = localStorage.getItem('user');

      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupEventListeners = () => {
    const eth = getEthereumProvider();
    if (eth) {
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnect();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    // Disabled - not using wallet authentication
    // window.location.reload();
  };

  const requestWalletAddress = async () => {
    try {
      const address = await connectWallet();
      if (!address) {
        throw new Error('Failed to get wallet address');
      }
      setAccount(address);
      return address;
    } catch (err) {
      console.error('Wallet connection error:', err);
      throw err;
    }
  };

  const connect = async (username, email, password, additionalData = {}) => {
    setIsConnecting(true);
    try {
      let walletAddress = null;
      try {
        walletAddress = await requestWalletAddress();
      } catch (err) {
        toast.error(err?.message || 'MetaMask connection rejected or failed.');
        throw new Error('MetaMask connection failed');
      }

      // Register with backend (signup)
      const response = await authAPI.signup({
        username,
        email,
        password,
        walletAddress,
        ...additionalData
      });

      const { user: userData } = response.data;

      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      toast.success('Account created successfully!');

      return userData;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.response?.data?.error || 'Failed to create account');
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const login = async (email, password) => {
    setIsConnecting(true);
    try {
      let walletAddress = null;
      try {
        walletAddress = await requestWalletAddress();
      } catch (err) {
        toast.error('MetaMask connection rejected or failed.');
        throw new Error('MetaMask connection failed');
      }

      // Login with backend
      const response = await authAPI.login({
        email,
        password,
        walletAddress
      });

      const { user: userData } = response.data;

      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      
      toast.success('Login successful!');

      return userData;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setUser(null);
    localStorage.removeItem('user');
    toast.success('Disconnected');
  };

  const updateUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const reconnectWallet = async () => {
    setIsConnecting(true);
    try {
      const address = await requestWalletAddress();
      toast.success('Wallet reconnected!');
      return address;
    } catch (err) {
      toast.error(err?.message || 'Failed to reconnect wallet');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const value = {
    account,
    user,
    loading,
    isConnecting,
    isConnected: !!user, // User is considered connected if they're logged in, wallet is optional
    walletConnected: !!account,
    connect,
    login,
    disconnect,
    updateUser,
    reconnectWallet
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
