import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { Car, Shield, Star, Users } from 'lucide-react';

const Home = () => {
  const { isConnected } = useWeb3();
  const navigate = useNavigate();

  // If already logged in, redirect to search page
  useEffect(() => {
    if (isConnected) {
      navigate('/search');
    }
  }, [isConnected, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Car className="h-20 w-20 text-primary-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to D-CARPOOL
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Peer-to-peer carpooling platform for IIIT Kottayam students
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure & Transparent</h3>
            <p className="text-gray-600">
              All rides and user identities are securely stored with verified email authentication
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="flex justify-center mb-4">
              <Star className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Reputation System</h3>
            <p className="text-gray-600">
              Rate your rides and build trust through our on-chain reputation system
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Community Driven</h3>
            <p className="text-gray-600">
              Join a community of verified drivers and riders sharing their journeys
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6">Get Started</h2>
          <div className="space-y-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/verify-email')}
              className="w-full py-3 border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition"
            >
              Sign Up
            </button>
            <button
              onClick={() => navigate('/search')}
              className="w-full py-3 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Continue as Guest
            </button>
          </div>
          <p className="text-sm text-gray-500 text-center mt-4">
            Join the IIIT Kottayam carpooling community
          </p>
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-4">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-3xl font-bold text-primary-600 mb-2">1</div>
              <p className="text-sm">Sign up with your IIIT email</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-3xl font-bold text-primary-600 mb-2">2</div>
              <p className="text-sm">Create or search for rides</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-3xl font-bold text-primary-600 mb-2">3</div>
              <p className="text-sm">Join rides and travel together</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-3xl font-bold text-primary-600 mb-2">4</div>
              <p className="text-sm">Rate and build reputation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
