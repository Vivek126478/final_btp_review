import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Plus } from 'lucide-react';
import { rideAPI } from '../utils/api';
import toast from 'react-hot-toast';
import PlacesAutocompleteInput from '../components/PlacesAutocompleteInput';
import MapPreview from '../components/MapPreview';
import { loadGoogleMaps } from '../utils/googleMaps';

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

const PostRide = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locatingStart, setLocatingStart] = useState(false);
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
    vehiclePlate: ''
  });

  const handleTagToggle = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag]
    }));
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
        const google = await loadGoogleMaps();
        const geocoder = new google.maps.Geocoder();

        const results = await new Promise((resolve, reject) => {
          geocoder.geocode({ location: { lat, lng } }, (res, status) => {
            if (status === 'OK') return resolve(res);
            reject(new Error(status));
          });
        });

        if (Array.isArray(results) && results[0]?.formatted_address) {
          addressText = results[0].formatted_address;
        }
      } catch (e) {
        // Reverse geocoding is optional; fallback to plain text
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

  const buildRidePayload = () => ({
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
    vehicleInfo: {
      make: formData.vehicleMake,
      model: formData.vehicleModel,
      color: formData.vehicleColor,
      plate: formData.vehiclePlate
    }
  });

  const handleCreateRide = async (status) => {
    setLoading(true);

    try {
      await rideAPI.createRide({ ...buildRidePayload(), status });
      toast.success(status === 'draft' ? 'Ride saved as draft!' : 'Ride posted successfully!');
      navigate('/my-rides');
    } catch (error) {
      console.error('Error creating ride:', error);
      const msg = error.response?.data?.error || 'Failed to create ride';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3 mb-8">
          <Car className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Post a Ride</h1>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Route Information */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Route Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <PlacesAutocompleteInput
                  label="Start Location"
                  value={formData.startLocation}
                  onChange={(v) => setFormData({ ...formData, startLocation: v })}
                  onPlaceSelected={({ lat, lng }) =>
                    setFormData({
                      ...formData,
                      startLatitude: lat,
                      startLongitude: lng
                    })
                  }
                  required
                  placeholder="Search a location"
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
                <PlacesAutocompleteInput
                  label="End Location"
                  value={formData.endLocation}
                  onChange={(v) => setFormData({ ...formData, endLocation: v })}
                  onPlaceSelected={({ lat, lng }) =>
                    setFormData({
                      ...formData,
                      endLatitude: lat,
                      endLongitude: lng
                    })
                  }
                  required
                  placeholder="Search a location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.rideDateTime}
                  onChange={(e) =>
                    setFormData({ ...formData, rideDateTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Seats *
                </label>
                <input
                  type="number"
                  value={formData.totalSeats}
                  onChange={(e) =>
                    setFormData({ ...formData, totalSeats: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                  min="1"
                  max="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Seat (₹)
                </label>
                <input
                  type="number"
                  value={formData.pricePerSeat}
                  onChange={(e) =>
                    setFormData({ ...formData, pricePerSeat: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="mt-4">
              <MapPreview
                start={
                  formData.startLatitude && formData.startLongitude
                    ? { lat: Number(formData.startLatitude), lng: Number(formData.startLongitude) }
                    : null
                }
                end={
                  formData.endLatitude && formData.endLongitude
                    ? { lat: Number(formData.endLatitude), lng: Number(formData.endLongitude) }
                    : null
                }
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ride Tags
            </label>
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

          {/* Vehicle Information */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Vehicle Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Make
                </label>
                <input
                  type="text"
                  value={formData.vehicleMake}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleMake: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Toyota"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.vehicleModel}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleModel: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Camry"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  value={formData.vehicleColor}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleColor: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Plate
                </label>
                <input
                  type="text"
                  value={formData.vehiclePlate}
                  onChange={(e) =>
                    setFormData({ ...formData, vehiclePlate: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., ABC123"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows="4"
              placeholder="Any additional information for riders..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleCreateRide('active')}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-5 w-5" />
              <span>{loading ? 'Posting Ride...' : 'Post Ride'}</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleCreateRide('draft')}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-white text-primary-700 rounded-lg font-semibold border border-primary-300 hover:bg-primary-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Saving Draft...' : 'Save as Draft'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostRide;
