import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { rideAPI } from '../utils/api';
import RideCard from '../components/RideCard';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useWeb3 } from '../context/Web3Context';
import api from '../utils/api';
import { Ticket, Clock, CheckCircle2 } from 'lucide-react';

const SearchRides = () => {
  const { user } = useWeb3();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  const [filters, setFilters] = useState({
    startLocation: '',
    endLocation: '',
    date: '',
    minSeats: '',
    tags: '',
    maxPrice: ''
  });

  useEffect(() => {
    checkTicketAndFetch();
  }, []);

  const checkTicketAndFetch = async () => {
    try {
      const res = await api.get('/tickets/active');
      const ticket = res.data.ticket;
      if (ticket) {
        setActiveTicket(ticket);
        const tDate = new Date(ticket.departureTime).toISOString().split('T')[0];
        
        const autoFilters = {
          startLocation: 'IIIT Kottayam',
          endLocation: ticket.departureStation,
          date: tDate,
          minSeats: '', tags: '', maxPrice: ''
        };
        setFilters(autoFilters);
        toast.success(`Active ${ticket.type} PNR found! Auto-mapping rides.`);
        fetchRides(autoFilters, ticket);
      } else {
        fetchRides();
      }
    } catch (e) {
      fetchRides();
    }
  };

  const fetchRides = async (searchFilters = {}, overridingTicket = null) => {
    try {
      setLoading(true);
      const ticketToUse = overridingTicket !== null ? overridingTicket : activeTicket;
      const response = await rideAPI.searchRides(searchFilters);
      let fetched = response.data.rides;

      // Smart 6-Hour Buffer Logic
      if (ticketToUse) {
        const ticketTime = new Date(ticketToUse.departureTime).getTime();
        fetched = fetched.filter(ride => {
           const rideTime = new Date(ride.rideDateTime).getTime();
           const diffHours = (ticketTime - rideTime) / (1000 * 60 * 60);
           // Must depart 1 to 9 hours before train (gives driving time + safe buffer)
           return diffHours > 0 && diffHours <= 9;
        });
      }

      setRides(fetched);
    } catch (error) {
      console.error('Error fetching rides:', error);
      toast.error('Failed to fetch rides');
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyMe = async () => {
    if (!user?.id) {
      toast.error('Please login to enable notifications');
      return;
    }

    const searchFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    );

    try {
      await rideAPI.createSearchAlert(searchFilters);
      toast.success('We will email you when a matching ride is available');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create alert');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const searchFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    );
    fetchRides(searchFilters);
  };

  const handleReset = () => {
    setFilters({
      startLocation: '',
      endLocation: '',
      date: '',
      minSeats: '',
      tags: '',
      maxPrice: ''
    });
    fetchRides();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Search Rides</h1>

        {activeTicket && (
          <div className="mb-8 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-100 rounded-full">
                <Ticket className="w-6 h-6 text-indigo-700" />
              </div>
              <div>
                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500"/>
                  Active {activeTicket.type.toUpperCase()} Journey Sync
                </h3>
                <p className="text-sm text-indigo-700 mt-1">
                  PNR <strong>{activeTicket.pnr}</strong> departing from <strong>{activeTicket.departureStation}</strong> at {new Date(activeTicket.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm font-semibold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
              <Clock className="w-4 h-4" />
              <span>Smart 6-Hour Arrival Buffer Applied</span>
            </div>
          </div>
        )}

        {/* Search Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From
                </label>
                <input
                  type="text"
                  value={filters.startLocation}
                  onChange={(e) =>
                    setFilters({ ...filters, startLocation: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Start location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <input
                  type="text"
                  value={filters.endLocation}
                  onChange={(e) =>
                    setFilters({ ...filters, endLocation: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="End location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) =>
                    setFilters({ ...filters, date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Seats
                </label>
                <input
                  type="number"
                  value={filters.minSeats}
                  onChange={(e) =>
                    setFilters({ ...filters, minSeats: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="1"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPrice: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="50"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={filters.tags}
                  onChange={(e) =>
                    setFilters({ ...filters, tags: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Office, Airport"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                <Search className="h-5 w-5" />
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center space-x-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                <Filter className="h-5 w-5" />
                <span>Reset</span>
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" text="Loading rides..." />
          </div>
        ) : rides.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No rides found</p>
            <p className="text-gray-400 mt-2">Try adjusting your search filters</p>

            <div className="mt-6">
              <button
                onClick={handleNotifyMe}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Notify me when available
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchRides;
