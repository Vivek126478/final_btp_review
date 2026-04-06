import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { Car, User, LogOut, Shield, Wallet } from 'lucide-react';
import { formatAddress } from '../utils/web3';

const Navbar = () => {
  const { user, isConnected, walletConnected, account, disconnect, reconnectWallet, isConnecting } = useWeb3();
  const navigate = useNavigate();
  const [reconnecting, setReconnecting] = useState(false);

  const handleReconnectWallet = async () => {
    setReconnecting(true);
    try {
      await reconnectWallet();
    } catch (_) {
      // error already toasted in context
    } finally {
      setReconnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Car className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold text-primary-600">D-CARPOOL</span>
          </Link>

          {/* Navigation Links */}
          {isConnected && (
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/search"
                className="text-gray-700 hover:text-primary-600 transition"
              >
                Search Rides
              </Link>
              <Link
                to="/post-ride"
                className="text-gray-700 hover:text-primary-600 transition"
              >
                Post Ride
              </Link>
              <Link
                to="/my-rides"
                className="text-gray-700 hover:text-primary-600 transition"
              >
                My Rides
              </Link>
              <Link
                to="/governance"
                className="text-gray-700 hover:text-primary-600 transition"
              >
                Governance
              </Link>

                {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
              )}
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <>
                {!walletConnected && (
                  <button
                    onClick={handleReconnectWallet}
                    disabled={reconnecting || isConnecting}
                    className="flex items-center space-x-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition border border-amber-200 disabled:opacity-50"
                  >
                    <Wallet className="h-5 w-5" />
                    <span className="hidden md:inline">
                      {reconnecting ? 'Connecting...' : 'Connect Wallet'}
                    </span>
                  </button>
                )}
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <User className="h-5 w-5 text-gray-600" />
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                    <p className="text-xs text-gray-500">
                      {walletConnected ? formatAddress(account) : formatAddress(user?.walletAddress)}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden md:inline">Disconnect</span>
                </button>
              </>
            ) : (
              <Link
                to="/"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Connect Wallet
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
