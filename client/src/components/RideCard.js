import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, IndianRupee, Tag } from 'lucide-react';
import { format } from 'date-fns';

const RideCard = ({ ride }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/ride/${ride.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer border border-gray-200"
    >
      {/* Driver Info */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
          {ride.driver?.profilePicture ? (
            <img
              src={ride.driver.profilePicture}
              alt={ride.driver.username}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <span className="text-primary-600 font-semibold text-lg">
              {ride.driver?.username?.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{ride.driver?.username}</p>
          <p className="text-sm text-gray-500">Driver</p>
        </div>
      </div>

      {/* Route */}
      <div className="space-y-2 mb-4">
        <div className="flex items-start space-x-2">
          <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-500">From</p>
            <p className="font-medium text-gray-900">{ride.startLocation}</p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-500">To</p>
            <p className="font-medium text-gray-900">{ride.endLocation}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 text-gray-600">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {format(new Date(ride.rideDateTime), 'MMM dd, yyyy HH:mm')}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600">
          <Users className="h-4 w-4" />
          <span className="text-sm">
            {ride.availableSeats} / {ride.totalSeats} seats
          </span>
        </div>
      </div>

      {/* Tags */}
      {ride.tags && ride.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {ride.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
            >
              <Tag className="h-3 w-3" />
              <span>{tag}</span>
            </span>
          ))}
        </div>
      )}

      {/* Price and Status */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <IndianRupee className="h-5 w-5 text-green-600" />
          <span className="text-lg font-semibold text-gray-900">
            ₹{ride.pricePerSeat || 0}
          </span>
          <span className="text-sm text-gray-500">per seat</span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            ride.status === 'active'
              ? 'bg-green-100 text-green-800'
              : ride.status === 'draft'
              ? 'bg-yellow-100 text-yellow-800'
              : ride.status === 'completed'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {ride.status}
        </span>
      </div>
    </div>
  );
};

export default RideCard;
