import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Car, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { rideAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useWeb3 } from '../context/Web3Context';
import LocationAutocomplete from '../components/LocationAutocomplete';
import OpenStreetMapPreview from '../components/OpenStreetMapPreview';

const RIDE_TAGS = [
  'Office Commute',
  'Airport Drop',
  'College Ride',
  'Weekend Trip',
  'Shopping',
  'Event',
  'Daily',
  'One-time'
];

const EditRide = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useWeb3();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locatingStart, setLocatingStart] = useState(false);
  const [ride, setRide] = useState(null);
  const [formData, setFormData] = useState({
    startLocation: '',
    endLocation: '',
    startLatitude: null,
    startLongitude: null,
    endLatitude: null,
    endLongitude: null,
    rideDateTime: '',
    totalSeats: 1,
    pricePerSeat: 0,
    tags: [],
    notes: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    vehiclePlate: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchRide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRide = async () => {
    try {
      setLoading(true);
      const response = await rideAPI.getRideById(id);
      const r = response.data.ride;
      setRide(r);

      if (r.hostId !== user?.id) {
        toast.error('You are not allowed to edit this ride');
        navigate('/my-rides');
        return;
      }

      const dt = r.rideDateTime ? new Date(r.rideDateTime) : null;
      const localDateTime = dt ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

      setFormData({
        startLocation: r.startLocation || '',
        endLocation: r.endLocation || '',
        startLatitude: r.startLatitude ?? null,
        startLongitude: r.startLongitude ?? null,
        endLatitude: r.endLatitude ?? null,
        endLongitude: r.endLongitude ?? null,
        rideDateTime: localDateTime,
        totalSeats: r.totalSeats || 1,
        pricePerSeat: Number(r.pricePerSeat || 0),
        tags: Array.isArray(r.tags) ? r.tags : [],
        notes: r.notes || '',
        vehicleMake: r.vehicleInfo?.make || '',
        vehicleModel: r.vehicleInfo?.model || '',
        vehicleColor: r.vehicleInfo?.color || '',
        vehiclePlate: r.vehicleInfo?.plate || '',
        status: r.status || 'draft'
      });
    } catch (error) {
      console.error('Error fetching ride:', error);
      toast.error(error.response?.data?.error || 'Failed to load ride');
      navigate('/my-rides');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setLocatingStart(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      let addressText = 'Current location';

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { 'User-Agent': 'D-Carpool-App' } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.display_name) {
            addressText = data.display_name;
          }
        }
      } catch (e) {
        // Reverse geocoding is optional
      }

      setFormData((prev) => ({
        ...prev,
        startLocation: addressText,
        startLatitude: lat,
        startLongitude: lng
      }));
    } catch (error) {
      console.error('Geolocation error:', error);
      toast.error('Unable to access current location');
    } finally {
      setLocatingStart(false);
    }
  };

  const handleTagToggle = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await rideAPI.updateRide(id, {
        startLocation: formData.startLocation,
        endLocation: formData.endLocation,
        startLatitude: formData.startLatitude,
        startLongitude: formData.startLongitude,
        endLatitude: formData.endLatitude,
        endLongitude: formData.endLongitude,
        rideDateTime: formData.rideDateTime,
        totalSeats: formData.totalSeats,
        pricePerSeat: formData.pricePerSeat,
        tags: formData.tags,
        notes: formData.notes,
        status: formData.status,
        vehicleInfo: {
          make: formData.vehicleMake,
          model: formData.vehicleModel,
          color: formData.vehicleColor,
          plate: formData.vehiclePlate
        }
      });

      toast.success('Ride updated successfully');
      navigate(`/ride/${id}`);
    } catch (error) {
      console.error('Error updating ride:', error);
      toast.error(error.response?.data?.error || 'Failed to update ride');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading ride..." />
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3 mb-8">
          <Car className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Edit Ride</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <LocationAutocomplete
                label="Start Location"
                value={formData.startLocation}
                onChange={(v) => setFormData({ ...formData, startLocation: v })}
                onPlaceSelected={({ address, lat, lng }) =>
                  setFormData({
                    ...formData,
                    startLocation: address,
                    startLatitude: lat,
                    startLongitude: lng
                  })
                }
                required
                placeholder="Search pickup location..."
              />
              <button
                type="button"
                disabled={locatingStart}
                onClick={handleUseCurrentLocation}
                className="mt-2 text-sm text-primary-700 hover:text-primary-800 underline disabled:opacity-50"
              >
                {locatingStart ? 'Getting location...' : 'Use my current location'}
              </button>
            </div>

            <div>
              <LocationAutocomplete
                label="End Location"
                value={formData.endLocation}
                onChange={(v) => setFormData({ ...formData, endLocation: v })}
                onPlaceSelected={({ address, lat, lng }) =>
                  setFormData({
                    ...formData,
                    endLocation: address,
                    endLatitude: lat,
                    endLongitude: lng
                  })
                }
                required
                placeholder="Search drop-off location..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time *</label>
              <input
                type="datetime-local"
                value={formData.rideDateTime}
                onChange={(e) => setFormData({ ...formData, rideDateTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Seats *</label>
              <input
                type="number"
                value={formData.totalSeats}
                onChange={(e) => setFormData({ ...formData, totalSeats: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
                min="1"
                max="10"
              />
              <p className="mt-1 text-xs text-gray-500">Cannot be less than already joined participants.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price per Seat (₹)</label>
              <input
                type="number"
                value={formData.pricePerSeat}
                onChange={(e) => setFormData({ ...formData, pricePerSeat: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          <OpenStreetMapPreview
            start={
              formData.startLatitude && formData.startLongitude
                ? { lat: Number(formData.startLatitude), lng: Number(formData.startLongitude), address: formData.startLocation }
                : null
            }
            end={
              formData.endLatitude && formData.endLongitude
                ? { lat: Number(formData.endLatitude), lng: Number(formData.endLongitude), address: formData.endLocation }
                : null
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ride Tags</label>
            <div className="flex flex-wrap gap-2">
              {RIDE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    formData.tags.includes(tag)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Vehicle Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                <input
                  type="text"
                  value={formData.vehicleMake}
                  onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <input
                  type="text"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <input
                  type="text"
                  value={formData.vehicleColor}
                  onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Plate</label>
                <input
                  type="text"
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows="4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => navigate(`/ride/${id}`)}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditRide;
