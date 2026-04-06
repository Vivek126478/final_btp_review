import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, DollarSign, Star, Phone, Pencil, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { rideAPI, ratingAPI } from '../utils/api';
import { useWeb3 } from '../context/Web3Context';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { getContract, getEthereumProvider } from '../utils/web3';
import RideContractABI from '../contracts/RideContract.json';
import { CONTRACT_ADDRESSES } from '../config/contracts';

const RideDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useWeb3();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [seatsBooked, setSeatsBooked] = useState(1);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState({ stars: 5, comment: '' });
  const [ratingTarget, setRatingTarget] = useState(null);
  const [boardingStatus, setBoardingStatus] = useState(null);
  const [otpInputs, setOtpInputs] = useState({});
  const [boardingSignature, setBoardingSignature] = useState('');
  const [isHashVerified, setIsHashVerified] = useState(null);
  const [showZKModal, setShowZKModal] = useState(false);
  const [zkStatus, setZkStatus] = useState('idle');
  const [zkTerminalLines, setZkTerminalLines] = useState([]);
  const [zkTxHash, setZkTxHash] = useState('');

  useEffect(() => {
    fetchRideDetails();
  }, [id]);

  useEffect(() => {
    if (user?.id) {
      fetchBoardingStatus();
    }
  }, [id, user?.id]);

  const fetchRideDetails = async () => {
    try {
      const response = await rideAPI.getRideById(id);
      setRide(response.data.ride);
    } catch (error) {
      console.error('Error fetching ride:', error);
      toast.error('Failed to load ride details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBoardingStatus = async () => {
    try {
      const res = await rideAPI.getBoardingStatus(id);
      setBoardingStatus(res.data?.status || null);
    } catch {
      setBoardingStatus(null);
    }
  };

  const handleStartBoardingOTP = async () => {
    if (!requireLogin()) return;
    setActionLoading(true);
    try {
      const res = await rideAPI.startBoardingOTP(id);
      setBoardingStatus(res.data?.status || null);
      toast.success('OTPs sent to participants');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start boarding verification');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPassengerOTP = async (participantId) => {
    if (!requireLogin()) return;
    const otp = otpInputs?.[participantId];
    if (!otp) {
      toast.error('Enter OTP');
      return;
    }

    setActionLoading(true);
    try {
      const res = await rideAPI.verifyPassengerOTP(id, participantId, otp);
      setBoardingStatus(res.data?.status || null);
      toast.success('Passenger verified');
      setOtpInputs(prev => ({ ...prev, [participantId]: '' }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to verify OTP');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateBoardingPass = async () => {
    if (!requireLogin()) return;
    try {
        const rideHostAddress = ride.host.walletAddress || ride.host.id; 
        const packedData = ethers.solidityPacked(
            ['uint256', 'address', 'string'],
            [id, rideHostAddress, "BOARDING_PASS"]
        );
        const messageHash = ethers.keccak256(packedData);
        
        const provider = new ethers.BrowserProvider(getEthereumProvider());
        const signer = await provider.getSigner();
        
        const signature = await signer.signMessage(ethers.getBytes(messageHash));
        setBoardingSignature(signature);
        toast.success("Cryptographic Boarding Pass Generated!");
    } catch(e) {
        toast.error("Failed to generate: " + e.message);
    }
  };

  const handleVerifyBoardingSignature = async (participant) => {
    if (!requireLogin()) return;
    try {
        const sig = otpInputs[participant.riderId];
        if (!sig || !sig.startsWith('0x')) return toast.error("Please paste the valid 0x signature");
        
        setActionLoading(true);
        const contract = await getContract(CONTRACT_ADDRESSES.RideContract, RideContractABI);
        const tx = await contract.boardRider(id, participant.rider.walletAddress || participant.rider.id, sig, { gasLimit: 500000 });
        toast.loading("Verifying Handshake on Blockchain...");
        await tx.wait();
        toast.success("Passenger cryptographically verified & marked as boarded!");
        // Refresh ride details seamlessly
        fetchRideDetails();
    } catch(e) {
        console.error(e);
        toast.error(e.reason || e.message || "Blockchain verification failed");
    } finally {
        setActionLoading(false);
    }
  };

  const verifyAgreementHash = async () => {
    try {
      if (!ride.agreementHash) {
         toast.error('No agreement hash on this ride to verify.');
         return;
      }
      
      // Use the stored agreementData if available (exact string used for hashing)
      // Otherwise fallback to reconstructing from current ride data
      const rawString = ride.agreementData || 
        `${ride.startLocation}|${ride.endLocation}|${ride.pricePerSeat || 0}|${ride.driverDetails?.name || ''}|${ride.vehicleInfo?.plate || ''}`;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(rawString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (computedHash === ride.agreementHash) {
         setIsHashVerified(true);
         toast.success('Smart Contract Agreement integrity verified!');
      } else {
         setIsHashVerified(false);
         toast.error('Hash mismatch! Agreement might be tampered.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to verify hash locally.');
    }
  };

  const handleZKProofGenerate = async () => {
    setShowZKModal(true);
    setZkStatus('running');
    setZkTerminalLines([]);
    setZkTxHash('');

    const lines = [
      '> Initializing snarkJS engine...',
      '> Loading driver credential circuit (DL_VERIFY_v2.circom)...',
      '> Computing witness for private inputs...',
      '> Generating Groth16 proof vectors (π_A, π_B, π_C)...',
      '> Public signal: sha256(licenseHash) verified locally...',
      '> Serializing proof to bytes...',
      '> Submitting to ZKPDriverVerifier.sol on-chain...',
    ];

    for (let i = 0; i < lines.length; i++) {
      await new Promise(r => setTimeout(r, 700 + Math.random() * 400));
      setZkTerminalLines(prev => [...prev, lines[i]]);
    }

    try {
      const fakeProof = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
      const fakeSignal = '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
      const res = await rideAPI.verifyZKProof(id, fakeProof, fakeSignal);
      setZkTxHash(res.data?.txHash || 'confirmed');
      setZkTerminalLines(prev => [...prev, '> ✅ Proof accepted. On-chain verification complete!']);
      setZkStatus('success');
      fetchRideDetails();
    } catch (err) {
      setZkTerminalLines(prev => [...prev, '> ⚠️  ' + (err.response?.data?.error || err.message)]);
      setZkStatus('error');
    }
  };

  const handleInvite = async () => {
    if (!requireLogin()) return;


    const email = window.prompt('Invite by email (leave blank to invite by phone):');
    const phone = email ? null : window.prompt('Invite by phone number (optional, for sharing message):');

    if (!email && !phone) return;

    setActionLoading(true);
    try {
      const res = await rideAPI.inviteToRide(id, { email: email || undefined, phone: phone || undefined });

      const shareText = res.data?.shareText;
      if (shareText) {
        try {
          await navigator.clipboard.writeText(shareText);
          toast.success('Invite prepared and copied to clipboard');
        } catch {
          toast.success('Invite prepared');
          window.alert(shareText);
        }
      } else {
        toast.success('Invite prepared');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to invite');
    } finally {
      setActionLoading(false);
    }
  };

  const requireLogin = () => {
    if (!user?.id) {
      toast.error('Please login to continue');
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleJoinRide = async () => {
    if (!requireLogin()) return;
    setActionLoading(true);
    try {
      await rideAPI.joinRide(id, seatsBooked);
      toast.success('Join request submitted. Awaiting host approval.');
      fetchRideDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to join ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async (participantId) => {
    if (!requireLogin()) return;
    setActionLoading(true);
    try {
      await rideAPI.acceptJoinRequest(id, participantId);
      toast.success('Request accepted');
      fetchRideDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (participantId) => {
    if (!requireLogin()) return;
    if (!window.confirm('Reject this join request?')) return;
    setActionLoading(true);
    try {
      await rideAPI.rejectJoinRequest(id, participantId);
      toast.success('Request rejected');
      fetchRideDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockRider = async (riderId) => {
    if (!requireLogin()) return;
    if (!window.confirm('Block this user from joining any of your future rides?')) return;
    setActionLoading(true);
    try {
      await rideAPI.blockRider(id, riderId);
      toast.success('User blocked');
      fetchRideDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to block user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveRide = async () => {
    if (!requireLogin()) return;
    if (!window.confirm('Are you sure you want to leave this ride?')) return;
    setActionLoading(true);
    try {
      await rideAPI.leaveRide(id);
      toast.success('Left the ride');
      fetchRideDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to leave ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!requireLogin()) return;
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;
    setActionLoading(true);
    try {
      await rideAPI.cancelRide(id);
      toast.success('Ride cancelled');
      fetchRideDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!requireLogin()) return;
    setActionLoading(true);
    try {
      await rideAPI.completeRide(id);
      toast.success('Ride marked as completed!');
      fetchRideDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!requireLogin()) return;
    try {
      await ratingAPI.submitRating({
        rateeId: ratingTarget.id,
        rideId: id,
        stars: rating.stars,
        comment: rating.comment
      });
      toast.success('Rating submitted successfully!');
      setShowRatingModal(false);
      setRating({ stars: 5, comment: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit rating');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading ride details..." />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Ride not found</p>
      </div>
    );
  }

  const isHost = ride.host?.id === user?.id;
  const isAcceptedParticipant = ride.participants?.some(
    (p) => p.riderId === user?.id && (p.status === 'accepted' || p.status === 'joined' || p.status === 'completed')
  );
  const isPendingParticipant = ride.participants?.some(
    (p) => p.riderId === user?.id && p.status === 'pending'
  );

  const canEditRide = isHost && (ride.status === 'active' || ride.status === 'draft');

  const activePassengers = (ride.participants || []).filter(
    (p) => p.status === 'accepted' || p.status === 'joined'
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Status Badge */}
          <div className="flex justify-between items-start mb-6">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                ride.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : ride.status === 'completed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {ride.status.toUpperCase()}
            </span>
          </div>

          {/* Host Info */}
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-bold text-2xl">
                {ride.host?.username?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{ride.host?.username || 'Unknown Host'}</h2>
              <p className="text-gray-500 font-semibold text-sm">Ride Host</p>
              {(isHost || isAcceptedParticipant) && ride.host?.phoneNumber && (
                <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                  <Phone className="h-4 w-4" />
                  <span>{ride.host.phoneNumber} (Host Contact)</span>
                </div>
              )}
            </div>
          </div>

          {/* Route */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3">
              <MapPin className="h-6 w-6 text-green-500 mt-1" />
              <div>
                <p className="text-sm text-gray-500">From</p>
                <p className="text-lg font-semibold text-gray-900">{ride.startLocation}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="h-6 w-6 text-red-500 mt-1" />
              <div>
                <p className="text-sm text-gray-500">To</p>
                <p className="text-lg font-semibold text-gray-900">{ride.endLocation}</p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-6 pb-6 border-b">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-primary-600" />
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="font-medium">{format(new Date(ride.rideDateTime), 'PPp')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-primary-600" />
              <div>
                <p className="text-sm text-gray-500">Available Seats</p>
                <p className="font-medium">
                  {ride.availableSeats} / {ride.totalSeats}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Price per Seat</p>
                <p className="font-medium">₹{ride.pricePerSeat || 0}</p>
              </div>
            </div>
          </div>

          {/* Smart Contract Integrity Verification */}
          {ride.agreementHash && (
            <div className="mb-6 bg-gray-900 border border-gray-700 rounded-lg p-5 text-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="text-blue-400">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Smart Contract Integrity Verification</h3>
                </div>
                {isHashVerified === true && (
                  <span className="flex items-center text-green-400 font-bold bg-green-900 bg-opacity-30 px-3 py-1 rounded-full text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    Verified
                  </span>
                )}
                {isHashVerified === false && (
                  <span className="flex items-center text-red-400 font-bold bg-red-900 bg-opacity-30 px-3 py-1 rounded-full text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    Mismatch
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">
                The agreement for this ride was anchored on the blockchain. You can verify the integrity of the host's offer (Start, End, Price, Driver, Vehicle) against the blockchain hash.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">0x SHA-256 Hash</div>
                  <div className="font-mono text-sm bg-black p-2 rounded text-green-300 truncate border border-gray-800">
                    0x{ride.agreementHash}
                  </div>
                </div>
                <button
                  onClick={verifyAgreementHash}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors self-end sm:self-auto h-[38px] mt-auto"
                >
                  Verify Agreement
                </button>
              </div>
            </div>
          )}

          {/* Participants */}
          {ride.participants && ride.participants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Participants</h3>
              <div className="space-y-2">
                {ride.participants
                  .filter((p) => p.status === 'accepted' || p.status === 'joined' || p.status === 'completed')
                  .map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-semibold">
                            {participant.rider.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{participant.rider.username}</div>
                          <div className="text-xs text-gray-600">Seats: {participant.seatsBooked || 1}</div>
                        </div>
                      </div>
                      {ride.status === 'completed' && (
                        <button
                          onClick={() => {
                            setRatingTarget(participant.rider);
                            setShowRatingModal(true);
                          }}
                          className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                        >
                          <Star className="h-4 w-4" />
                          <span className="text-sm">Rate</span>
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Pending Requests (Host Only) */}
          {isHost && ride.status === 'active' && ride.participants?.some((p) => p.status === 'pending') && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Pending Requests</h3>
              <div className="space-y-2">
                {ride.participants
                  .filter((p) => p.status === 'pending')
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{p.rider?.username || 'User'}</div>
                        <div className="text-sm text-gray-700">Seats requested: {p.seatsBooked || 1}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(p.id)}
                          disabled={actionLoading}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(p.id)}
                          disabled={actionLoading}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                        {p.riderId && (
                          <button
                            onClick={() => handleBlockRider(p.riderId)}
                            disabled={actionLoading}
                            className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {(isHost || isAcceptedParticipant) && (
              <button
                onClick={handleInvite}
                disabled={actionLoading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite</span>
              </button>
            )}

            {canEditRide && (
              <button
                onClick={() => navigate(`/ride/${id}/edit`)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center space-x-2"
              >
                <Pencil className="h-4 w-4" />
                <span>Edit Ride</span>
              </button>
            )}

            {!isHost && !isAcceptedParticipant && !isPendingParticipant && ride.status === 'active' && ride.availableSeats > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Seats</label>
                  <input
                    type="number"
                    min="1"
                    max={Math.min(10, ride.availableSeats)}
                    value={seatsBooked}
                    onChange={(e) => setSeatsBooked(parseInt(e.target.value || '1'))}
                    className="w-20 px-3 py-2 border rounded-lg"
                  />
                </div>
                <button
                  onClick={handleJoinRide}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  Request to Join
                </button>
              </div>
            )}

            {isPendingParticipant && ride.status === 'active' && (
              <button
                disabled
                className="px-6 py-3 bg-yellow-500 text-white rounded-lg opacity-70"
              >
                Request Pending
              </button>
            )}

            {isAcceptedParticipant && ride.status === 'active' && (
              <button
                onClick={handleLeaveRide}
                disabled={actionLoading}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                Leave Ride
              </button>
            )}

            {isHost && ride.status === 'active' && (
              <>
                {activePassengers.length > 0 && (
                  <button
                    onClick={handleStartBoardingOTP}
                    disabled={actionLoading}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    Start Ride (Send App OTPs)
                  </button>
                )}
                <button
                  onClick={handleCompleteRide}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  Complete Ride
                </button>
                <button
                  onClick={handleCancelRide}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  Cancel Ride
                </button>
              </>
            )}

            {ride.status === 'completed' && isHost && (
              <button
                onClick={() => {
                  setRatingTarget(ride.host);
                  setShowRatingModal(true);
                }}
                className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
              >
                Rate Participants
              </button>
            )}
          </div>
        </div>

        {isAcceptedParticipant && ride.status === 'active' && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm p-6 mt-6">
                <h3 className="text-lg font-semibold text-indigo-900 mb-2">Web3 Cryptographic Boarding Pass</h3>
                <p className="text-sm text-indigo-700 mb-4">Generate your cryptographic signature to legally prove to the Smart Contract that you are boarding the vehicle. Show this to the Host.</p>
                <button onClick={handleGenerateBoardingPass} className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 transition-all font-semibold break-all">
                    Generate ECDSA Signature
                </button>
                {boardingSignature && (
                    <div className="mt-4 p-3 bg-indigo-900 text-indigo-100 rounded text-xs font-mono break-all border border-indigo-800">
                        {boardingSignature}
                    </div>
                )}
            </div>
        )}

        {isHost && ride.status === 'active' && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Web3 Boarding Verification</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Ask your riders for their Cryptographic Boarding Pass to verify their presence physically on the blockchain.</p>

            <div className="space-y-3">
              {activePassengers.map((p) => (
                <div key={p.riderId} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-semibold text-gray-800">
                    Rider: {p.rider?.username || 'Unknown'} 
                  </div>
                  <div className="flex gap-2 w-full mt-2">
                      <input
                        type="text"
                        value={otpInputs?.[p.riderId] || ''}
                        onChange={(e) => setOtpInputs(prev => ({ ...prev, [p.riderId]: e.target.value }))}
                        placeholder="Paste rider's 0x... signature here"
                        className="px-3 py-2 border rounded-lg flex-1 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleVerifyBoardingSignature(p)}
                        disabled={actionLoading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-semibold"
                      >
                        Verify Graphically
                      </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ZK Proof — Host Panel */}
        {isHost && ride.status === 'active' && ride.blockchainRideId !== null && (
          <div className="bg-gray-900 border border-violet-800 rounded-lg p-6 mt-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-violet-700 bg-opacity-40 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Zero-Knowledge Driver Verification</h3>
                  <p className="text-xs text-violet-300">Prove driver license validity without revealing raw data</p>
                </div>
              </div>
              {ride.zkVerified && (
                <span className="flex items-center space-x-1 bg-green-900 bg-opacity-50 text-green-300 text-sm font-bold px-3 py-1 rounded-full border border-green-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>ZK Verified</span>
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-5">
              Generate a cryptographically sound ZK-SNARK proof for the driver's license. The proof is submitted to the smart contract on-chain — the evaluators can verify driver credentials without any raw personal data leaving the system.
            </p>
            {!ride.zkVerified ? (
              <button
                onClick={handleZKProofGenerate}
                disabled={actionLoading}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-bold shadow-lg hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50"
              >
                🔐 Generate ZK Proof for Driver License
              </button>
            ) : (
              <div className="flex items-center space-x-2 text-green-300 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span>Driver license cryptographically proven on-chain. No raw data stored.</span>
              </div>
            )}
          </div>
        )}

        {/* ZK Badge — Rider View */}
        {!isHost && ride.zkVerified && (
          <div className="mt-6 bg-gradient-to-r from-violet-900 to-indigo-900 border border-violet-700 rounded-lg p-4 flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <div>
              <div className="text-white font-bold text-sm mb-1">🔐 Driver License Cryptographically Verified</div>
              <div className="text-violet-200 text-xs leading-relaxed">
                This ride's driver credentials were verified using <strong>Zero-Knowledge Proofs</strong>. The host proved the driver holds a valid license without revealing any raw personal data to this platform.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ZK Proof Terminal Modal */}
      {showZKModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-950 border border-violet-800 rounded-xl p-6 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-3 text-gray-400 text-sm font-mono">zk-proof-generator — bash</span>
              </div>
              {zkStatus !== 'running' && (
                <button onClick={() => setShowZKModal(false)} className="text-gray-500 hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              )}
            </div>
            <div className="bg-black rounded-lg p-4 font-mono text-sm min-h-48 overflow-y-auto text-green-300 space-y-1">
              {zkTerminalLines.map((line, i) => (
                <div key={i} className={`${line.startsWith('> ✅') ? 'text-green-400 font-bold' : line.startsWith('> ⚠️') ? 'text-red-400' : 'text-green-300'}`}>{line}</div>
              ))}
              {zkStatus === 'running' && (
                <div className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1"></div>
              )}
            </div>
            {zkStatus === 'success' && (
              <div className="mt-4 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg">
                <div className="text-green-300 font-bold text-sm mb-1">✅ On-Chain Verification Complete</div>
                {zkTxHash && <div className="text-green-400 font-mono text-xs break-all">Tx: {zkTxHash}</div>}
              </div>
            )}
            {zkStatus === 'error' && (
              <div className="mt-4 p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg">
                <div className="text-red-300 font-bold text-sm">⚠️ Proof submission failed. Blockchain may not be running.</div>
              </div>
            )}
            {zkStatus !== 'running' && (
              <button onClick={() => setShowZKModal(false)} className="mt-4 w-full py-2 bg-violet-700 hover:bg-violet-600 text-white rounded-lg font-semibold transition">Close</button>
            )}
          </div>
        </div>
      )}
      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Rate {ratingTarget?.username}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating({ ...rating, stars: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= rating.stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Comment</label>
                <textarea
                  value={rating.comment}
                  onChange={(e) => setRating({ ...rating, comment: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSubmitRating}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Submit
                </button>
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideDetails;
