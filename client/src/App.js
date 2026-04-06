import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './context/Web3Context';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import EmailVerification from './pages/EmailVerification';
import SignupLogin from './pages/SignupLogin';
import Login from './pages/Login';
import Home from './pages/Home';
import SearchRides from './pages/SearchRides';
import PostRide from './pages/PostRide';
import RideDetails from './pages/RideDetails';
import EditRide from './pages/EditRide';
import TicketCheck from './pages/TicketCheck';

import MyRides from './pages/MyRides';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Governance from './pages/Governance';

function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Home/Landing Page */}
            <Route path="/" element={<Home />} />
            
            {/* Email Verification - For new user signup */}
            <Route path="/verify-email" element={<EmailVerification />} />
            
            {/* Signup - Second Step (for new users) */}
            <Route path="/signup" element={<SignupLogin />} />
            
            {/* Login - For existing users */}
            <Route path="/login" element={<Login />} />
            
            {/* PNR Check (Post-login) */}
            <Route
              path="/ticket-check"
              element={
                <>
                  <Navbar />
                  <ProtectedRoute>
                    <TicketCheck />
                  </ProtectedRoute>
                </>
              }
            />
            <Route
              path="/search"
              element={
                <>
                  <Navbar />
                  <SearchRides />
                </>
              }
            />
            <Route
              path="/post-ride"
              element={
                <>
                  <Navbar />
                  <ProtectedRoute>
                    <PostRide />
                  </ProtectedRoute>
                </>
              }
            />
            <Route
              path="/ride/:id"
              element={
                <>
                  <Navbar />
                  <RideDetails />
                </>
              }
            />
            <Route
              path="/ride/:id/edit"
              element={
                <>
                  <Navbar />
                  <ProtectedRoute>
                    <EditRide />
                  </ProtectedRoute>
                </>
              }
            />
            <Route
              path="/my-rides"
              element={
                <>
                  <Navbar />
                  <ProtectedRoute>
                    <MyRides />
                  </ProtectedRoute>
                </>
              }
            />
            <Route
              path="/profile"
              element={
                <>
                  <Navbar />
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                </>
              }
            />
            <Route
              path="/admin"
              element={
                <>
                  <Navbar />
                  <ProtectedRoute adminOnly>
                    <Admin />
                  </ProtectedRoute>
                </>
              }
            />
            <Route
              path="/governance"
              element={
                <>
                  <Navbar />
                  <ProtectedRoute>
                    <Governance />
                  </ProtectedRoute>
                </>
              }
            />

          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </Web3Provider>
  );
}

export default App;
