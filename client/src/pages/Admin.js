import React, { useState, useEffect } from 'react';
import { adminAPI, complaintAPI, sosAPI } from '../utils/api';
import { Users, Car, AlertCircle, BarChart, Shield, GitBranch, Lock, Key, Unlock, Split, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, ridesRes, complaintsRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getAllUsers({ limit: 50 }),
        adminAPI.getAllRides({ limit: 50 }),
        complaintAPI.getAllComplaints()
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setRides(ridesRes.data.rides);
      setComplaints(complaintsRes.data.complaints);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to ban/unban ${username}?`)) return;

    try {
      await adminAPI.toggleUserBan(userId, {});
      toast.success('User status updated');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleUpdateComplaint = async (complaintId, status) => {
    try {
      await complaintAPI.updateComplaintStatus(complaintId, { status });
      toast.success('Complaint updated');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update complaint');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading admin panel..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 overflow-x-auto">
          {['stats', 'users', 'rides', 'complaints', 'merkle', 'cpabe', 'shamir'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab === 'merkle' ? '🌳 Merkle Audit' : tab === 'cpabe' ? '🔐 CP-ABE' : tab === 'shamir' ? '🔀 Shamir SSS' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8 text-primary-600" />
                <span className="text-sm text-gray-500">Users</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.users.total}</p>
              <p className="text-sm text-gray-500 mt-2">
                Active: {stats.users.active} | Banned: {stats.users.banned}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <Car className="h-8 w-8 text-green-600" />
                <span className="text-sm text-gray-500">Rides</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.rides.total}</p>
              <p className="text-sm text-gray-500 mt-2">
                Active: {stats.rides.active} | Completed: {stats.rides.completed}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <span className="text-sm text-gray-500">Complaints</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.complaints.total}</p>
              <p className="text-sm text-gray-500 mt-2">
                Pending: {stats.complaints.pending}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <BarChart className="h-8 w-8 text-yellow-600" />
                <span className="text-sm text-gray-500">Ratings</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.ratings.total}</p>
              <p className="text-sm text-gray-500 mt-2">Total ratings submitted</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Wallet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.walletAddress.substring(0, 10)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.isBanned
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {user.isBanned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleBanUser(user.id, user.username)}
                          className={`px-3 py-1 text-sm rounded ${
                            user.isBanned
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {user.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rides Tab */}
        {activeTab === 'rides' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Seats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rides.map((ride) => (
                    <tr key={ride.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{ride.host?.username || 'N/A'}</td>
                      <td className="px-6 py-4">
                        {ride.startLocation} → {ride.endLocation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(ride.rideDateTime).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ride.availableSeats}/{ride.totalSeats}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            ride.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : ride.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {ride.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Complaints Tab */}
        {activeTab === 'complaints' && (
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {complaint.complainant.username} reported {complaint.accused.username}
                    </p>
                    <p className="text-sm text-gray-500">
                      Category: {complaint.category} | {new Date(complaint.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-sm rounded-full ${
                      complaint.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : complaint.status === 'resolved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {complaint.status}
                  </span>
                </div>
                <p className="text-gray-700 mb-4">{complaint.description}</p>
                {complaint.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdateComplaint(complaint.id, 'investigating')}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Investigate
                    </button>
                    <button
                      onClick={() => handleUpdateComplaint(complaint.id, 'resolved')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleUpdateComplaint(complaint.id, 'dismissed')}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Merkle Audit Tab */}
        {activeTab === 'merkle' && (
          <MerkleAuditPanel />
        )}

        {/* CP-ABE Demo Tab */}
        {activeTab === 'cpabe' && (
          <CPABEPanel />
        )}

        {/* Shamir SSS Demo Tab */}
        {activeTab === 'shamir' && (
          <ShamirSSSPanel />
        )}
      </div>
    </div>
  );
};

// Merkle Audit Panel Component
const MerkleAuditPanel = () => {
  const [anchorLoading, setAnchorLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [lastAnchor, setLastAnchor] = useState(null);
  const [proofData, setProofData] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [rideIdToVerify, setRideIdToVerify] = useState('');

  const handleAnchorRides = async () => {
    setAnchorLoading(true);
    try {
      const res = await adminAPI.anchorMerkleRoot();
      setLastAnchor(res.data);
      if (res.data.batchId !== null) {
        toast.success(`Anchored ${res.data.rideCount} rides to blockchain!`);
      } else {
        toast.info(res.data.message || 'No rides to anchor');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to anchor rides');
    } finally {
      setAnchorLoading(false);
    }
  };

  const handleGetProof = async () => {
    if (!rideIdToVerify) {
      toast.error('Enter a ride ID');
      return;
    }
    setVerifyLoading(true);
    setProofData(null);
    setVerifyResult(null);
    try {
      const res = await adminAPI.getMerkleProof(rideIdToVerify);
      setProofData(res.data);
      toast.success('Merkle proof generated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to get proof');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyOnChain = async () => {
    if (!proofData) return;
    setVerifyLoading(true);
    try {
      const res = await adminAPI.verifyMerkleProof({
        rideId: proofData.rideId,
        rideHash: proofData.rideHash,
        proof: proofData.proof,
        batchId: proofData.batchId
      });
      setVerifyResult(res.data);
      if (res.data.isValid) {
        toast.success('Proof verified on-chain!');
      } else {
        toast.error('Proof verification failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Verification failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <GitBranch className="h-8 w-8" />
          <h2 className="text-2xl font-bold">Merkle Tree Audit Trail</h2>
        </div>
        <p className="text-emerald-100 mb-4">
          Anchor completed rides to the blockchain as a Merkle tree. This creates a tamper-proof audit trail 
          where any ride's existence can be verified with minimal on-chain data.
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <div className="font-semibold">🔒 Immutable</div>
            <div className="text-emerald-200">Once anchored, ride history cannot be altered</div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <div className="font-semibold">⚡ Efficient</div>
            <div className="text-emerald-200">Single hash stores hundreds of rides</div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <div className="font-semibold">✅ Verifiable</div>
            <div className="text-emerald-200">Anyone can verify a ride existed</div>
          </div>
        </div>
      </div>

      {/* Anchor Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Shield className="h-6 w-6 mr-2 text-emerald-600" />
          Anchor Completed Rides
        </h3>
        <p className="text-gray-600 mb-4">
          Build a Merkle tree from all completed rides that haven't been anchored yet, 
          then store the root hash on the blockchain.
        </p>
        <button
          onClick={handleAnchorRides}
          disabled={anchorLoading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {anchorLoading ? 'Anchoring...' : '🌳 Anchor Rides to Blockchain'}
        </button>

        {lastAnchor && lastAnchor.batchId !== null && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="text-emerald-800 font-semibold mb-2">✅ Successfully Anchored!</div>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Batch ID:</span> {lastAnchor.batchId}</div>
              <div><span className="font-medium">Rides:</span> {lastAnchor.rideCount}</div>
              <div className="md:col-span-2">
                <span className="font-medium">Merkle Root:</span>
                <code className="ml-2 text-xs bg-emerald-100 px-2 py-1 rounded break-all">{lastAnchor.merkleRoot}</code>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Tx Hash:</span>
                <code className="ml-2 text-xs bg-emerald-100 px-2 py-1 rounded break-all">{lastAnchor.txHash}</code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verify Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🔍 Verify Ride Existence</h3>
        <p className="text-gray-600 mb-4">
          Generate a Merkle proof for a specific ride and verify it on-chain. 
          This proves the ride existed at the time of anchoring.
        </p>
        
        <div className="flex gap-3 mb-4">
          <input
            type="number"
            value={rideIdToVerify}
            onChange={(e) => setRideIdToVerify(e.target.value)}
            placeholder="Enter Ride ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleGetProof}
            disabled={verifyLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            Generate Proof
          </button>
        </div>

        {proofData && (
          <div className="p-4 bg-gray-900 text-gray-100 rounded-lg mb-4">
            <div className="text-sm font-mono space-y-2">
              <div><span className="text-gray-400">Ride ID:</span> {proofData.rideId}</div>
              <div><span className="text-gray-400">Batch ID:</span> {proofData.batchId}</div>
              <div className="break-all"><span className="text-gray-400">Ride Hash:</span> <span className="text-green-400">{proofData.rideHash}</span></div>
              <div className="break-all"><span className="text-gray-400">Merkle Root:</span> <span className="text-yellow-400">{proofData.merkleRoot}</span></div>
              <div>
                <span className="text-gray-400">Proof Path ({proofData.proof?.length || 0} hashes):</span>
                <div className="ml-4 mt-1 space-y-1">
                  {proofData.proof?.map((hash, i) => (
                    <div key={i} className="text-blue-300 text-xs break-all">↳ {hash}</div>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleVerifyOnChain}
              disabled={verifyLoading}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50"
            >
              {verifyLoading ? 'Verifying...' : '✅ Verify On-Chain'}
            </button>
          </div>
        )}

        {verifyResult && (
          <div className={`p-4 rounded-lg ${verifyResult.isValid ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
            <div className={`font-bold text-lg ${verifyResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
              {verifyResult.isValid ? '✅ Proof Verified!' : '❌ Verification Failed'}
            </div>
            <p className={verifyResult.isValid ? 'text-green-700' : 'text-red-700'}>
              {verifyResult.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// CP-ABE Demo Panel Component
const CPABEPanel = () => {
  const [activeSection, setActiveSection] = useState('overview');
  
  // Keygen state
  const [attributes, setAttributes] = useState('ride_123_host');
  const [generatedKey, setGeneratedKey] = useState(null);
  
  // Encrypt state
  const [plaintext, setPlaintext] = useState('Vehicle: Toyota Camry, Plate: ABC-1234');
  const [policy, setPolicy] = useState('(ride_123_host) or (ride_123_accepted)');
  const [encryptResult, setEncryptResult] = useState(null);
  
  // Decrypt state
  const [decryptKey, setDecryptKey] = useState('');
  const [ciphertext, setCiphertext] = useState('');
  const [decryptResult, setDecryptResult] = useState(null);
  
  // Encrypted rides
  const [encryptedRides, setEncryptedRides] = useState([]);
  
  const [loading, setLoading] = useState(false);

  const handleKeygen = async () => {
    setLoading(true);
    try {
      const attrList = attributes.split(',').map(a => a.trim()).filter(Boolean);
      const res = await adminAPI.cpabeKeygen({ attributes: attrList });
      setGeneratedKey(res.data);
      setDecryptKey(res.data.secretKeyB64);
      toast.success('Key generated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Key generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEncrypt = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.cpabeEncrypt({ plaintext, policy });
      setEncryptResult(res.data);
      setCiphertext(res.data.ciphertextB64);
      toast.success('Data encrypted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Encryption failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    setLoading(true);
    setDecryptResult(null);
    try {
      const res = await adminAPI.cpabeDecrypt({ secretKeyB64: decryptKey, ciphertextB64: ciphertext });
      setDecryptResult(res.data);
      toast.success('Decryption successful!');
    } catch (error) {
      setDecryptResult({ success: false, error: error.response?.data?.error || 'Decryption failed', explanation: error.response?.data?.explanation });
      toast.error('Decryption failed - attributes don\'t satisfy policy');
    } finally {
      setLoading(false);
    }
  };

  const fetchEncryptedRides = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getRidesWithEncryption();
      setEncryptedRides(res.data.rides || []);
    } catch (error) {
      toast.error('Failed to fetch rides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'rides') {
      fetchEncryptedRides();
    }
  }, [activeSection]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="h-8 w-8" />
          <h2 className="text-2xl font-bold">CP-ABE Encryption Demo</h2>
        </div>
        <p className="text-purple-100">
          Ciphertext-Policy Attribute-Based Encryption - Data is encrypted with a <strong>policy</strong>, 
          and users with matching <strong>attributes</strong> can decrypt.
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'overview', label: '📖 How It Works', icon: null },
          { id: 'keygen', label: '🔑 Generate Key', icon: Key },
          { id: 'encrypt', label: '🔒 Encrypt', icon: Lock },
          { id: 'decrypt', label: '🔓 Decrypt', icon: Unlock },
          { id: 'rides', label: '🚗 Encrypted Rides', icon: Car }
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeSection === id
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">What is CP-ABE?</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-bold text-purple-800 mb-2">🔐 Traditional Encryption</h4>
              <p className="text-gray-700 text-sm mb-2">
                Encrypt for a <em>specific person</em> using their public key.
              </p>
              <code className="text-xs bg-gray-800 text-green-400 p-2 rounded block">
                encrypt(data, Alice_public_key) → ciphertext
              </code>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h4 className="font-bold text-indigo-800 mb-2">🎯 CP-ABE Encryption</h4>
              <p className="text-gray-700 text-sm mb-2">
                Encrypt with a <em>policy</em> - anyone with matching attributes can decrypt.
              </p>
              <code className="text-xs bg-gray-800 text-green-400 p-2 rounded block">
                encrypt(data, "host OR passenger") → ciphertext
              </code>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-900 text-gray-100 rounded-lg">
            <h4 className="font-bold text-yellow-400 mb-3">D-CARPOOL Use Case</h4>
            <div className="text-sm space-y-2 font-mono">
              <div>
                <span className="text-gray-400">// Encrypt vehicle info with policy:</span>
              </div>
              <div className="text-green-400">
                policy = "(ride_456_host) OR (ride_456_accepted)"
              </div>
              <div className="mt-2 text-gray-400">// Who can decrypt?</div>
              <div className="text-blue-400">✅ Host: has attribute [ride_456_host]</div>
              <div className="text-blue-400">✅ Accepted passenger: has [ride_456_accepted]</div>
              <div className="text-red-400">❌ Random user: no matching attributes</div>
              <div className="text-red-400">❌ Pending passenger: not accepted yet</div>
            </div>
          </div>
        </div>
      )}

      {/* Key Generation Section */}
      {activeSection === 'keygen' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Key className="h-6 w-6 text-purple-600" />
            Generate Secret Key with Attributes
          </h3>
          
          <p className="text-gray-600 mb-4">
            In CP-ABE, each user's secret key is embedded with their <strong>attributes</strong>. 
            The key can only decrypt ciphertexts whose policy is satisfied by these attributes.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attributes (comma-separated):
            </label>
            <input
              type="text"
              value={attributes}
              onChange={(e) => setAttributes(e.target.value)}
              placeholder="e.g., ride_123_host, verified_driver, admin"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: ride_123_host, ride_123_accepted, admin, verified_driver
            </p>
          </div>

          <button
            onClick={handleKeygen}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Generating...' : '🔑 Generate Secret Key'}
          </button>

          {generatedKey && (
            <div className="mt-4 p-4 bg-gray-900 text-gray-100 rounded-lg">
              <div className="text-sm font-mono space-y-2">
                <div>
                  <span className="text-gray-400">Attributes:</span>{' '}
                  <span className="text-green-400">[{generatedKey.attributes?.join(', ')}]</span>
                </div>
                <div>
                  <span className="text-gray-400">Secret Key (Base64):</span>
                  <div className="text-yellow-400 text-xs break-all mt-1 p-2 bg-gray-800 rounded">
                    {generatedKey.secretKeyB64}
                  </div>
                </div>
                {generatedKey.keyStructure && (
                  <div>
                    <span className="text-gray-400">Key Structure:</span>
                    <pre className="text-blue-300 text-xs mt-1 overflow-auto">
                      {JSON.stringify(generatedKey.keyStructure, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <p className="text-emerald-400 text-sm mt-3">✅ {generatedKey.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Encrypt Section */}
      {activeSection === 'encrypt' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="h-6 w-6 text-purple-600" />
            Encrypt Data with Policy
          </h3>
          
          <p className="text-gray-600 mb-4">
            Encrypt data with an access policy. Only users whose attributes satisfy the policy can decrypt.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plaintext Data:
              </label>
              <textarea
                value={plaintext}
                onChange={(e) => setPlaintext(e.target.value)}
                rows={2}
                placeholder="Enter sensitive data to encrypt..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Policy:
              </label>
              <input
                type="text"
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
                placeholder="e.g., (ride_123_host) or (ride_123_accepted)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supports: AND, OR operators. e.g., "(attr1 and attr2) or attr3"
              </p>
            </div>

            <button
              onClick={handleEncrypt}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Encrypting...' : '🔒 Encrypt Data'}
            </button>
          </div>

          {encryptResult && (
            <div className="mt-4 p-4 bg-gray-900 text-gray-100 rounded-lg">
              <div className="text-sm font-mono space-y-2">
                <div>
                  <span className="text-gray-400">Policy:</span>{' '}
                  <span className="text-yellow-400">"{encryptResult.policy}"</span>
                </div>
                <div>
                  <span className="text-gray-400">Ciphertext Length:</span>{' '}
                  <span className="text-blue-400">{encryptResult.ciphertextLength} bytes</span>
                </div>
                <div>
                  <span className="text-gray-400">Ciphertext (Base64):</span>
                  <div className="text-red-400 text-xs break-all mt-1 p-2 bg-gray-800 rounded max-h-24 overflow-auto">
                    {encryptResult.ciphertextB64}
                  </div>
                </div>
                {encryptResult.encryptedStructure && (
                  <div>
                    <span className="text-gray-400">Encrypted Structure:</span>
                    <pre className="text-green-300 text-xs mt-1 overflow-auto max-h-32">
                      {JSON.stringify(encryptResult.encryptedStructure, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <p className="text-emerald-400 text-sm mt-3">✅ {encryptResult.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Decrypt Section */}
      {activeSection === 'decrypt' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Unlock className="h-6 w-6 text-purple-600" />
            Decrypt Data with Secret Key
          </h3>
          
          <p className="text-gray-600 mb-4">
            Try to decrypt the ciphertext using your secret key. Decryption only succeeds if your 
            key's attributes satisfy the ciphertext's policy.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secret Key (Base64):
              </label>
              <textarea
                value={decryptKey}
                onChange={(e) => setDecryptKey(e.target.value)}
                rows={2}
                placeholder="Paste your secret key here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-xs font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Generate a key in the "Generate Key" tab first
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciphertext (Base64):
              </label>
              <textarea
                value={ciphertext}
                onChange={(e) => setCiphertext(e.target.value)}
                rows={3}
                placeholder="Paste ciphertext here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-xs font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Encrypt data in the "Encrypt" tab first
              </p>
            </div>

            <button
              onClick={handleDecrypt}
              disabled={loading || !decryptKey || !ciphertext}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Decrypting...' : '🔓 Attempt Decryption'}
            </button>
          </div>

          {decryptResult && (
            <div className={`mt-4 p-4 rounded-lg ${decryptResult.success ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
              {decryptResult.success ? (
                <div>
                  <div className="font-bold text-lg text-green-800 mb-2">✅ Decryption Successful!</div>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-medium">Decrypted Plaintext:</span>
                      <div className="bg-white p-2 rounded mt-1 text-green-800 font-mono">
                        {decryptResult.plaintext}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Your Attributes:</span>{' '}
                      <span className="text-green-700">[{decryptResult.keyAttributes?.join(', ')}]</span>
                    </div>
                    <div>
                      <span className="font-medium">Required Policy:</span>{' '}
                      <span className="text-green-700">"{decryptResult.policy}"</span>
                    </div>
                  </div>
                  <p className="text-green-700 text-sm mt-2">{decryptResult.explanation}</p>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-lg text-red-800 mb-2">❌ Decryption Failed!</div>
                  <p className="text-red-700">{decryptResult.error}</p>
                  <p className="text-red-600 text-sm mt-2">{decryptResult.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Encrypted Rides Section */}
      {activeSection === 'rides' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Car className="h-6 w-6 text-purple-600" />
            Rides with Encrypted Fields
          </h3>
          
          <p className="text-gray-600 mb-4">
            These rides have CP-ABE encrypted vehicle info and/or notes. Only the host and accepted 
            passengers can decrypt this sensitive information.
          </p>

          <button
            onClick={fetchEncryptedRides}
            disabled={loading}
            className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>

          {encryptedRides.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Lock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No rides with encrypted fields found.</p>
              <p className="text-sm">Create a new ride to see CP-ABE encryption in action!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {encryptedRides.map((ride) => (
                <div key={ride.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-gray-800">Ride #{ride.id}</span>
                      <span className="ml-2 text-sm text-gray-500">by {ride.host}</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ride.status === 'completed' ? 'bg-green-100 text-green-800' :
                      ride.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ride.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {ride.source} → {ride.destination}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 mt-3">
                    <div className={`p-2 rounded text-xs ${ride.vehicleInfoEncrypted ? 'bg-purple-50' : 'bg-gray-50'}`}>
                      <div className="font-medium mb-1 flex items-center gap-1">
                        {ride.vehicleInfoEncrypted ? <Lock className="h-3 w-3 text-purple-600" /> : null}
                        Vehicle Info:
                      </div>
                      <div className="font-mono text-gray-600 break-all">
                        {ride.vehicleInfoRaw || <span className="italic">Empty</span>}
                      </div>
                    </div>
                    
                    <div className={`p-2 rounded text-xs ${ride.notesEncrypted ? 'bg-purple-50' : 'bg-gray-50'}`}>
                      <div className="font-medium mb-1 flex items-center gap-1">
                        {ride.notesEncrypted ? <Lock className="h-3 w-3 text-purple-600" /> : null}
                        Notes:
                      </div>
                      <div className="font-mono text-gray-600 break-all">
                        {ride.notesRaw || <span className="italic">Empty</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Shamir's Secret Sharing Demo Panel
const ShamirSSSPanel = () => {
  const [secret, setSecret] = useState('Emergency Contact: +91-9876543210, Blood Group: O+');
  const [totalShares, setTotalShares] = useState(5);
  const [threshold, setThreshold] = useState(3);
  const [demoResult, setDemoResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedShares, setSelectedShares] = useState([]);

  const handleDemo = async () => {
    setLoading(true);
    setDemoResult(null);
    setSelectedShares([]);
    try {
      const res = await sosAPI.demoSSS({ secret, totalShares, threshold });
      setDemoResult(res.data.demo);
      toast.success('Secret split successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Demo failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleShareSelection = (index) => {
    setSelectedShares(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const canReconstruct = selectedShares.length >= threshold;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Split className="h-8 w-8" />
          <h2 className="text-2xl font-bold">Shamir's Secret Sharing (SSS)</h2>
        </div>
        <p className="text-orange-100">
          Split secrets into N shares where K shares are needed to reconstruct. 
          With K-1 shares, <strong>zero information</strong> about the secret is revealed.
        </p>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🔐 How It Works for SOS</h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-orange-50 rounded-lg text-center">
            <div className="text-3xl mb-2">👤</div>
            <h4 className="font-bold text-orange-800">1. User Sets Up</h4>
            <p className="text-sm text-gray-600">
              Emergency info (contact, medical, address) is split into 5 shares
            </p>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <div className="text-3xl mb-2">📤</div>
            <h4 className="font-bold text-yellow-800">2. Shares Distributed</h4>
            <p className="text-sm text-gray-600">
              Admin, User wallet, and 3 trusted contacts each get 1 share
            </p>
          </div>
          
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <div className="text-3xl mb-2">🚨</div>
            <h4 className="font-bold text-red-800">3. SOS Triggered</h4>
            <p className="text-sm text-gray-600">
              3 of 5 shares collected → Emergency data reconstructed
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-900 text-gray-100 rounded-lg">
          <h4 className="font-bold text-yellow-400 mb-2">Security Guarantee</h4>
          <ul className="text-sm space-y-1 font-mono">
            <li className="text-green-400">✓ 3+ shares → Full reconstruction</li>
            <li className="text-red-400">✗ 2 shares → Zero information leaked</li>
            <li className="text-red-400">✗ 1 share → Zero information leaked</li>
            <li className="text-blue-400">ℹ Information-theoretically secure (not just computationally)</li>
          </ul>
        </div>
      </div>

      {/* Interactive Demo */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-orange-600" />
          Interactive Demo
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secret Data (Emergency Info):
            </label>
            <textarea
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="Enter secret emergency data..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Shares (N):
              </label>
              <input
                type="number"
                value={totalShares}
                onChange={(e) => setTotalShares(Math.max(2, parseInt(e.target.value) || 2))}
                min={2}
                max={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Threshold (K):
              </label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Math.max(2, Math.min(totalShares, parseInt(e.target.value) || 2)))}
                min={2}
                max={totalShares}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            onClick={handleDemo}
            disabled={loading || !secret}
            className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition disabled:opacity-50"
          >
            {loading ? 'Splitting Secret...' : '🔀 Split Secret into Shares'}
          </button>
        </div>

        {/* Demo Results */}
        {demoResult && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-gray-900 text-gray-100 rounded-lg">
              <h4 className="font-bold text-green-400 mb-2">✅ Secret Split Successfully</h4>
              <div className="text-sm font-mono space-y-1">
                <div>
                  <span className="text-gray-400">Original Secret:</span>{' '}
                  <span className="text-yellow-400">"{demoResult.originalSecret}"</span>
                </div>
                <div>
                  <span className="text-gray-400">Secret Hash:</span>{' '}
                  <span className="text-blue-400">{demoResult.secretHash}</span>
                </div>
                <div>
                  <span className="text-gray-400">Configuration:</span>{' '}
                  <span className="text-purple-400">{demoResult.config.totalShares} shares, {demoResult.config.threshold} threshold</span>
                </div>
              </div>
            </div>

            {/* Shares Grid */}
            <div>
              <h4 className="font-bold text-gray-800 mb-2">
                Generated Shares (Click to select for reconstruction):
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {demoResult.shares.map((shareInfo, i) => (
                  <button
                    key={i}
                    onClick={() => toggleShareSelection(i)}
                    className={`p-3 rounded-lg border-2 text-left transition ${
                      selectedShares.includes(i)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50 hover:border-orange-300'
                    }`}
                  >
                    <div className="font-bold text-sm">Share {i + 1}</div>
                    <div className="text-xs text-gray-500 font-mono truncate">
                      {shareInfo.share}
                    </div>
                    <div className="text-xs mt-1">
                      {selectedShares.includes(i) ? '✅ Selected' : '⬜ Click to select'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reconstruction Status */}
            <div className={`p-4 rounded-lg ${canReconstruct ? 'bg-green-100 border border-green-300' : 'bg-yellow-100 border border-yellow-300'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold">
                    {selectedShares.length} / {threshold} shares selected
                  </span>
                  <p className="text-sm">
                    {canReconstruct 
                      ? '✅ Enough shares! Secret can be reconstructed.'
                      : `⚠️ Need ${threshold - selectedShares.length} more share(s) to reconstruct.`
                    }
                  </p>
                </div>
                {canReconstruct && (
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Reconstructed:</div>
                    <div className="font-mono text-green-800 font-bold">
                      {demoResult.reconstruction.reconstructedSecret}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Security Demonstration */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-bold text-red-800 mb-2">🔒 Security Proof</h4>
              <p className="text-sm text-red-700">
                Even with {threshold - 1} share(s), an attacker learns <strong>absolutely nothing</strong> about the secret.
                This is not computational security (like encryption) - it's <strong>information-theoretic security</strong>,
                meaning it cannot be broken even with unlimited computing power.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Use Case */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🚗 D-CARPOOL SOS Use Case</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Share #</th>
                <th className="px-4 py-2 text-left">Holder</th>
                <th className="px-4 py-2 text-left">When Released</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-2 font-mono">Share 1</td>
                <td className="px-4 py-2">Platform Admin</td>
                <td className="px-4 py-2">Auto-released on SOS</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-mono">Share 2</td>
                <td className="px-4 py-2">User's Wallet</td>
                <td className="px-4 py-2">Auto-released on SOS</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-mono">Share 3</td>
                <td className="px-4 py-2">Trusted Contact 1</td>
                <td className="px-4 py-2">After OTP verification</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-mono">Share 4</td>
                <td className="px-4 py-2">Trusted Contact 2</td>
                <td className="px-4 py-2">After OTP verification</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono">Share 5</td>
                <td className="px-4 py-2">Blockchain Backup</td>
                <td className="px-4 py-2">Emergency only</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <p className="mt-4 text-sm text-gray-600">
          <strong>Result:</strong> No single party (including the platform) can access emergency data without cooperation.
          In an emergency, shares are automatically collected from available sources.
        </p>
      </div>
    </div>
  );
};

export default Admin;
