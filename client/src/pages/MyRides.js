import React, { useState, useEffect } from 'react';
import { rideAPI } from '../utils/api';
import RideCard from '../components/RideCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Car, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const MyRides = () => {
  const [activeTab, setActiveTab] = useState('driver');
  const [driverRides, setDriverRides] = useState([]);
  const [riderRides, setRiderRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchMyRides();
  }, []);

  const fetchMyRides = async () => {
    try {
      setLoading(true);
      const response = await rideAPI.getUserRides('all');
      setDriverRides(response.data.driverRides);
      setRiderRides(response.data.riderRides);
    } catch (error) {
      console.error('Error fetching rides:', error);
      toast.error('Failed to fetch your rides');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (rideId, participantId) => {
    setActionLoading(true);
    try {
      await rideAPI.acceptJoinRequest(rideId, participantId);
      toast.success('Request accepted');
      fetchMyRides();
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to accept request';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (rideId, participantId) => {
    if (!window.confirm('Reject this join request?')) return;
    setActionLoading(true);
    try {
      await rideAPI.rejectJoinRequest(rideId, participantId);
      toast.success('Request rejected');
      fetchMyRides();
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to reject request';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelApplication = async (rideId) => {
    if (!window.confirm('Cancel your application for this ride?')) return;
    setActionLoading(true);
    try {
      await rideAPI.cancelRideApplication(rideId);
      toast.success('Application cancelled');
      fetchMyRides();
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to cancel application';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHideRide = async (rideId) => {
    if (!window.confirm('Hide this ride from your dashboard?')) return;
    setActionLoading(true);
    try {
      await rideAPI.hideRide(rideId);
      toast.success('Ride hidden');
      fetchMyRides();
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to hide ride';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishDraft = async (rideId) => {
    try {
      await rideAPI.publishDraftRide(rideId);
      toast.success('Ride published successfully');
      fetchMyRides();
    } catch (error) {
      console.error('Error publishing draft:', error);
      const msg = error.response?.data?.error || 'Failed to publish draft ride';
      toast.error(msg);
    }
  };

  const currentRides = activeTab === 'driver' ? driverRides : riderRides;
  const activeRide = activeTab === 'driver' ? driverRides.find(r => r.status === 'active') : null;
  const draftRides = activeTab === 'driver' ? driverRides.filter(r => r.status === 'draft') : [];

  const getParticipationLabel = (participation) => {
    const status = participation?.status;
    if (!status) return null;
    if (status === 'pending') return { text: 'Applied (Pending)', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (status === 'accepted') return { text: 'Selected (Accepted)', cls: 'bg-green-100 text-green-800 border-green-200' };
    if (status === 'rejected') return { text: 'Rejected', cls: 'bg-red-100 text-red-800 border-red-200' };
    if (status === 'expired') return { text: 'Expired', cls: 'bg-gray-100 text-gray-800 border-gray-200' };
    if (status === 'joined') return { text: 'Joined', cls: 'bg-green-100 text-green-800 border-green-200' };
    if (status === 'left') return { text: 'Left', cls: 'bg-gray-100 text-gray-800 border-gray-200' };
    if (status === 'completed') return { text: 'Completed', cls: 'bg-gray-100 text-gray-800 border-gray-200' };
    return { text: status, cls: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Rides</h1>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('driver')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'driver'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Car className="h-5 w-5" />
            <span>As Driver ({driverRides.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rider')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'rider'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>As Rider ({riderRides.length})</span>
          </button>
        </div>

        {/* Rides List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" text="Loading your rides..." />
          </div>
        ) : currentRides.length > 0 ? (
          <>
            {activeTab === 'driver' && (
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Active ride rule:</span> you can have only one active ride at a time.
                  </p>
                  {activeRide ? (
                    <p className="mt-1 text-gray-600">
                      You currently have an <span className="font-medium">active</span> ride. You can still save drafts, but publishing will be blocked until the active ride is cancelled/completed.
                    </p>
                  ) : draftRides.length > 0 ? (
                    <p className="mt-1 text-gray-600">
                      You have {draftRides.length} draft ride(s). You can publish one now.
                    </p>
                  ) : (
                    <p className="mt-1 text-gray-600">You have no active ride currently.</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentRides.map((ride) => (
                <div key={ride.id} className="relative">
                  <RideCard ride={ride} />

                  {activeTab === 'rider' && ride.participation && (
                    <div className="mt-3">
                      {(() => {
                        const label = getParticipationLabel(ride.participation);
                        if (!label) return null;
                        return (
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium ${label.cls}`}>
                            {label.text}
                            {typeof ride.participation.seatsBooked === 'number' && (
                              <span className="ml-2 text-xs text-gray-600">Seats: {ride.participation.seatsBooked}</span>
                            )}
                          </div>
                        );
                      })()}

                      {ride.participation?.status === 'pending' && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => handleCancelApplication(ride.id)}
                            disabled={actionLoading}
                            className="w-full px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50"
                          >
                            Cancel Application
                          </button>
                        </div>
                      )}

                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => handleHideRide(ride.id)}
                          disabled={actionLoading}
                          className="w-full px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition disabled:opacity-50"
                        >
                          Hide
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'driver' && ride.status === 'draft' && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handlePublishDraft(ride.id)}
                        className="w-full px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition"
                      >
                        Publish Draft
                      </button>
                    </div>
                  )}

                  {activeTab === 'driver' && ride.status === 'active' && Array.isArray(ride.participants) && ride.participants.some(p => p.status === 'pending') && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-900 mb-2">Pending Requests</div>
                      <div className="space-y-2">
                        {ride.participants
                          .filter(p => p.status === 'pending')
                          .map(p => (
                            <div key={p.id} className="flex items-center justify-between gap-3">
                              <div className="text-sm text-gray-800">
                                <span className="font-medium">{p.rider?.username || 'User'}</span>
                                <span className="text-gray-600"> — Seats: {p.seatsBooked || 1}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptRequest(ride.id, p.id)}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectRequest(ride.id, p.id)}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No rides found</p>
            <p className="text-gray-400 mt-2">
              {activeTab === 'driver'
                ? 'You haven\'t posted any rides yet'
                : 'You haven\'t applied to any rides yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRides;
