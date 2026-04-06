import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Shield, CheckCircle, ArrowRight, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/contracts';
import LoadingSpinner from '../components/LoadingSpinner';
import { useWeb3 } from '../context/Web3Context';

const EmailVerification = () => {
  const navigate = useNavigate();
  const { isConnected } = useWeb3();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emailExists, setEmailExists] = useState(false);

  // If already logged in, redirect to search
  useEffect(() => {
    if (isConnected) {
      navigate('/search');
    }
  }, [isConnected, navigate]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!email.endsWith('@iiitkottayam.ac.in')) {
      toast.error('Only @iiitkottayam.ac.in emails are allowed');
      return;
    }

    setLoading(true);
    try {
      // Check if email already exists
      const checkResponse = await axios.get(`${API_BASE_URL}/auth/check-email?email=${email}`);
      
      if (checkResponse.data.exists) {
        // Email exists, show button to navigate to login instead of auto-redirect
        setEmailExists(true);
        localStorage.setItem('loginEmail', email);
        toast('Email already registered. Please sign in.', { icon: 'ℹ️' });
        setLoading(false);
        return;
      }

      // Email doesn't exist, send OTP for signup
      setEmailExists(false);
      await axios.post(`${API_BASE_URL}/email-verification/send-otp`, { email });
      toast.success('OTP sent to your email!');
      setStep('otp');
      startResendCountdown();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToLogin = () => {
    localStorage.setItem('loginEmail', email);
    navigate('/login');
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/email-verification/verify-otp`, { email, otp });
      toast.success('Email verified successfully!');
      // Store verified email in localStorage
      localStorage.setItem('verifiedEmail', email);
      // Navigate to signup page
      setTimeout(() => navigate('/signup'), 1000);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Invalid OTP';
      const attemptsLeft = error.response?.data?.attemptsLeft;
      if (attemptsLeft !== undefined) {
        toast.error(`${errorMsg}. ${attemptsLeft} attempts left.`);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendDisabled) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/email-verification/resend-otp`, { email });
      toast.success('New OTP sent to your email!');
      setOtp('');
      startResendCountdown();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const startResendCountdown = () => {
    setResendDisabled(true);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Campus Wheels</h1>
          <p className="text-gray-600">IIIT Kottayam Carpooling Platform</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 'email' ? (
            <>
              <div className="text-center mb-6">
                <Mail className="h-12 w-12 text-primary-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
                <p className="text-gray-600">
                  Enter your IIIT Kottayam email address to get started
                </p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailExists(false); // Reset email exists state when user changes email
                    }}
                    placeholder="yourname@iiitkottayam.ac.in"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Only @iiitkottayam.ac.in emails are allowed
                  </p>
                </div>

                {emailExists ? (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-blue-800 mb-3">
                        This email is already registered. Please sign in to continue.
                      </p>
                      <button
                        type="button"
                        onClick={handleNavigateToLogin}
                        className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition flex items-center justify-center space-x-2"
                      >
                        <LogIn className="h-5 w-5" />
                        <span>Go to Sign In Page</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailExists(false);
                        setEmail('');
                      }}
                      className="w-full text-gray-600 hover:text-gray-700 text-sm font-medium"
                    >
                      Use a different email
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                )}
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <CheckCircle className="h-12 w-12 text-primary-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter OTP</h2>
                <p className="text-gray-600">
                  We've sent a 6-digit code to
                </p>
                <p className="text-primary-600 font-medium mt-1">{email}</p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    One-Time Password
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-center text-2xl font-mono tracking-widest"
                    maxLength="6"
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    ⏱️ OTP expires in 10 minutes
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <span>Verify OTP</span>
                      <CheckCircle className="h-5 w-5" />
                    </>
                  )}
                </button>

                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendDisabled || loading}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendDisabled ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                  </button>
                  
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setOtp('');
                      }}
                      className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                    >
                      Change Email
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-gray-600">
            Secure verification powered by Campus Wheels
          </p>
          {step === 'email' && (
            <div>
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-primary-600 hover:text-primary-700 font-medium underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
