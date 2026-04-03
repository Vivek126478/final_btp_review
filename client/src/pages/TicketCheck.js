import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Train, Plane, ArrowRight, SkipForward } from 'lucide-react';

const TicketCheck = () => {
  const navigate = useNavigate();
  const [ticketType, setTicketType] = useState('railway'); // 'flight' or 'railway'
  const [pnr, setPnr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pnr.trim()) {
      toast.error('Please enter a valid PNR number');
      return;
    }

    setLoading(true);
    try {
      // POST the PNR to our new backend route
      const res = await api.post('/tickets', { pnr, type: ticketType });
      toast.success(res.data.message);
      
      // Navigate to search rides where the smart filter will automatically lock onto their Ticket
      navigate('/search');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to sync PNR');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/search');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Upcoming Journey?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sync your Train or Flight PNR to find rides perfectly timed for your departure.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          
          <div className="flex justify-center space-x-6 mb-6">
            <button
              type="button"
              onClick={() => setTicketType('railway')}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                ticketType === 'railway'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-500 hover:border-indigo-300'
              }`}
            >
              <Train className="w-8 h-8 mb-2" />
              <span className="font-semibold text-sm">Train Ticket</span>
            </button>
            <button
              type="button"
              onClick={() => setTicketType('flight')}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                ticketType === 'flight'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-500 hover:border-indigo-300'
              }`}
            >
              <Plane className="w-8 h-8 mb-2" />
              <span className="font-semibold text-sm">Flight Ticket</span>
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="pnr" className="block text-sm font-medium text-gray-700">
                {ticketType === 'railway' ? 'Train PNR Number' : 'Flight PNR Number'}
              </label>
              <div className="mt-1 relative">
                <input
                  id="pnr"
                  name="pnr"
                  type="text"
                  required
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono tracking-widest uppercase"
                  placeholder="ENTER 10 DIGIT PNR"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
              >
                {loading ? 'Syncing with API...' : 'Sync Journey & Find Rides'}
                {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
              </button>
              
              <button
                type="button"
                onClick={handleSkip}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                Skip for now
                <SkipForward className="ml-2 w-5 h-5 text-gray-400" />
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default TicketCheck;
