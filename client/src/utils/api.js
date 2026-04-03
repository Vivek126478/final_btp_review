import axios from 'axios';
import { API_BASE_URL } from '../config/contracts';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add user ID to requests for authentication
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      config.headers['x-user-id'] = userData.id;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  checkEmail: (email) => api.get(`/auth/check-email?email=${email}`),
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  mintSBT: (data) => api.post('/auth/mint-sbt', data)
};

// Ride APIs
export const rideAPI = {
  createRide: (data) => api.post('/rides', data),
  searchRides: (params) => api.get('/rides/search', { params }),
  createSearchAlert: (filters) => api.post('/rides/search-alerts', { filters }),
  getRideById: (id) => api.get(`/rides/${id}`),
  getUserRides: (type) => api.get('/rides/user', { params: { type } }),
  publishDraftRide: (id) => api.post(`/rides/${id}/publish`),
  updateRide: (id, data) => api.put(`/rides/${id}`, data),
  inviteToRide: (id, data) => api.post(`/rides/${id}/invite`, data),
  joinRide: (id, seatsBooked = 1) => api.post(`/rides/${id}/join`, { seatsBooked }),
  cancelRideApplication: (id) => api.post(`/rides/${id}/application/cancel`),
  hideRide: (id) => api.post(`/rides/${id}/hide`),
  unhideRide: (id) => api.post(`/rides/${id}/unhide`),
  blockRider: (rideId, riderId) => api.post(`/rides/${rideId}/block/${riderId}`),
  unblockRider: (rideId, riderId) => api.post(`/rides/${rideId}/unblock/${riderId}`),
  startBoardingOTP: (id) => api.post(`/rides/${id}/boarding/start`),
  getBoardingStatus: (id) => api.get(`/rides/${id}/boarding/status`),
  verifyPassengerOTP: (id, participantId, otp) => api.post(`/rides/${id}/boarding/verify`, { participantId, otp }),
  acceptJoinRequest: (rideId, participantId) => api.post(`/rides/${rideId}/participants/${participantId}/accept`),
  rejectJoinRequest: (rideId, participantId) => api.post(`/rides/${rideId}/participants/${participantId}/reject`),
  leaveRide: (id) => api.post(`/rides/${id}/leave`),
  cancelRide: (id) => api.post(`/rides/${id}/cancel`),
  completeRide: (id) => api.post(`/rides/${id}/complete`),
  verifyZKProof: (id, zkProof, publicSignal) => api.post(`/rides/${id}/verify-zk-proof`, { zkProof, publicSignal })
};

// Rating APIs
export const ratingAPI = {
  submitRating: (data) => api.post('/ratings', data),
  getUserRatings: (userId) => api.get(`/ratings/user/${userId}`),
  canRate: (params) => api.get('/ratings/can-rate', { params })
};

// Complaint APIs
export const complaintAPI = {
  fileComplaint: (data) => api.post('/complaints', data),
  getAllComplaints: (params) => api.get('/complaints', { params }),
  getUserComplaints: () => api.get('/complaints/user'),
  updateComplaintStatus: (id, data) => api.put(`/complaints/${id}`, data)
};

// Admin APIs
export const adminAPI = {
  getAllUsers: (params) => api.get('/admin/users', { params }),
  getAllRides: (params) => api.get('/admin/rides', { params }),
  toggleUserBan: (userId, data) => api.put(`/admin/users/${userId}/ban`, data),
  getDashboardStats: () => api.get('/admin/stats'),
  // Merkle Audit Trail
  anchorMerkleRoot: () => api.post('/admin/merkle/anchor'),
  getMerkleProof: (rideId) => api.get(`/admin/merkle/proof/${rideId}`),
  verifyMerkleProof: (data) => api.post('/admin/merkle/verify', data),
  // CP-ABE Demo
  cpabeEncrypt: (data) => api.post('/admin/cpabe/encrypt', data),
  cpabeDecrypt: (data) => api.post('/admin/cpabe/decrypt', data),
  cpabeKeygen: (data) => api.post('/admin/cpabe/keygen', data),
  getRidesWithEncryption: () => api.get('/admin/cpabe/rides')
};

// SOS APIs with Shamir's Secret Sharing
export const sosAPI = {
  // Traditional SOS
  triggerSOS: (data) => api.post('/sos', data),
  getAlerts: (params) => api.get('/sos', { params }),
  resolveAlert: (id, data) => api.put(`/sos/${id}`, data),
  // Shamir's Secret Sharing
  configureSSS: (data) => api.post('/sos/sss/configure', data),
  getSSSConfig: () => api.get('/sos/sss/config'),
  triggerSSSAlert: (data) => api.post('/sos/sss/trigger', data),
  provideShare: (data) => api.post('/sos/sss/provide-share', data),
  demoSSS: (data) => api.post('/sos/sss/demo', data)
};

export default api;
