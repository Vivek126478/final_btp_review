import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ratingAPI, authAPI } from '../utils/api';
import { User, Star, AlertTriangle, Edit2 } from 'lucide-react';
import { formatAddress } from '../utils/web3';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useWeb3();
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({ totalRatings: 0, averageRating: '0.00' });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    bio: ''
  });
  const [sbtStatus, setSbtStatus] = useState('unminted');
  const [mintProgress, setMintProgress] = useState(0);
  const [mintMessage, setMintMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserData();
      setFormData({
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || ''
      });
      setSbtStatus(localStorage.getItem(`sbt_${user.id}`) || 'unminted');
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const response = await ratingAPI.getUserRatings(user.id);
      setRatings(response.data.ratingsReceived);
      setStats(response.data.statistics);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await authAPI.updateProfile(formData);
      await updateUser();
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleMintSBT = async () => {
    setSbtStatus('minting');
    setMintProgress(10);
    setMintMessage('Authenticating .edu domain...');
    
    setTimeout(() => {
       setMintProgress(50);
       setMintMessage('Minting Token to Blockchain...');
       
       authAPI.mintSBT({ walletAddress: user?.walletAddress || user?.id }).then(res => {
          setMintProgress(100);
          setMintMessage('Token Minted Successfully!');
          setTimeout(() => {
             setSbtStatus('minted');
             if(user?.id) localStorage.setItem(`sbt_${user.id}`, 'minted');
          }, 1500);
       }).catch(err => {
          toast.error(err.response?.data?.error || 'Failed to mint SBT');
          setSbtStatus('unminted');
       });
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="h-10 w-10 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user?.username}</h1>
                <p className="text-gray-500">{formatAddress(user?.walletAddress)}</p>
                <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              <Edit2 className="h-4 w-4" />
              <span>{editing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>

          {editing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows="3"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              {user?.phoneNumber && (
                <p className="text-gray-700">
                  <span className="font-medium">Phone:</span> {user.phoneNumber}
                </p>
              )}
              {user?.bio && (
                <p className="text-gray-700">
                  <span className="font-medium">Bio:</span> {user.bio}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Soulbound Token (SBT) Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Academic Identity SBT</span>
          </h2>
          
          {sbtStatus === 'unminted' && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 flex flex-col items-center">
               <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.092 2.022-.27 3.012m-2.275 6.002c.15-.22.285-.453.407-.698M16 11a4 4 0 10-8 0m8 0c0 1.017-.092 2.022-.27 3.012"></path></svg>
               </div>
               <h3 className="text-lg font-semibold text-gray-700 mb-2">Unminted Identity</h3>
               <p className="text-gray-500 mb-6 max-w-md">Mint your Soulbound Token to permanently verify your .edu academic credentials on the blockchain.</p>
               <button onClick={handleMintSBT} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold shadow-lg transform hover:scale-105 transition-all">
                 Mint My SBT Target
               </button>
            </div>
          )}

          {sbtStatus === 'minting' && (
            <div className="border border-indigo-100 rounded-lg p-8 text-center bg-indigo-50 flex flex-col items-center">
               <div className="text-lg font-semibold text-indigo-700 mb-4">{mintMessage}</div>
               <div className="w-full max-w-md bg-gray-200 rounded-full h-4 mb-2 overflow-hidden shadow-inner">
                 <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-500 ease-out" style={{ width: `${mintProgress}%` }}></div>
               </div>
               <div className="text-sm text-indigo-500 animate-pulse">Communicating with Smart Contract node...</div>
            </div>
          )}

          {sbtStatus === 'minted' && (
            <div className="relative overflow-hidden rounded-xl p-8 text-white shadow-2xl" style={{background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'}}>
               <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
               <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white opacity-20 rounded-full blur-xl"></div>
               <div className="relative z-10 flex items-center justify-between">
                 <div>
                   <div className="flex items-center space-x-2 mb-1">
                     <span className="bg-white text-indigo-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Verified Holder</span>
                   </div>
                   <h3 className="text-2xl font-black tracking-tight mb-2 holographic-text">Academic Soulbound Token</h3>
                   <p className="text-indigo-100 font-medium">Immutable .edu Identity</p>
                 </div>
                 <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white border-opacity-30">
                   <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                 </div>
               </div>
               <div className="mt-6 pt-6 border-t border-indigo-400 border-opacity-30 flex justify-between items-end relative z-10">
                  <div>
                    <div className="text-xs text-indigo-200 uppercase tracking-widest mb-1">Wallet Address</div>
                    <div className="font-mono text-sm tracking-wider">{formatAddress(user?.walletAddress)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-indigo-400 uppercase tracking-widest ml-auto text-right">Non-Transferable</div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex justify-center mb-2">
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.averageRating}</p>
            <p className="text-gray-500">Average Rating</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex justify-center mb-2">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalRatings}</p>
            <p className="text-gray-500">Total Ratings</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex justify-center mb-2">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{user?.cancellationCount || 0}</p>
            <p className="text-gray-500">Cancellations</p>
          </div>
        </div>

        {/* Ratings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Ratings Received</h2>
          {ratings.length > 0 ? (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{rating.rater.username}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rating.stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(rating.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {rating.comment && <p className="text-gray-700">{rating.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No ratings yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
