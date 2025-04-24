import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import Navbar from './Navbar';

function WorkerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [message, setMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`http://localhost:5000/api/attendance/status/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setCheckedIn(response.data.data.isCheckedIn);
        if (response.data.data.lastCheckIn) {
          setLastCheckIn(new Date(response.data.data.lastCheckIn));
        }
      }
    } catch (err) {
      console.error('Error fetching status:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'worker') {
      navigate('/login');
      return;
    }

    fetchStatus();

    // Set up polling to check status every 30 seconds
    const intervalId = setInterval(fetchStatus, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [user, navigate]);

  const handleCheckIn = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post('http://localhost:5000/api/checkin', {
        workerId: user.id
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setMessage(response.data.message);
        setCheckedIn(true);
        setLastCheckIn(new Date(response.data.data.checkInTime));
      } else {
        setError(response.data.message || 'Failed to check in');
      }
    } catch (err) {
      console.error('Check-in error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to check in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Attempting checkout for worker:', user.id);
      
      const response = await axios.post('http://localhost:5000/api/checkout', {
        workerId: user.id
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Checkout response:', response.data);
      
      if (response.data.success) {
        setMessage(response.data.message);
        setCheckedIn(false);
        setLastCheckIn(null);
        // Immediately fetch the latest status
        await fetchStatus();
      } else {
        console.error('Checkout failed:', response.data);
        setError(response.data.message || 'Failed to check out');
      }
    } catch (err) {
      console.error('Check-out error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to check out. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user || user.role !== 'worker') {
    return <div>Unauthorized access</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h2>
              <p className="text-gray-600 mt-2">{user.position} - {user.department}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col items-center space-y-4">
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckIn}
                  disabled={loading || checkedIn}
                  className={`w-32 py-3 px-4 rounded-md text-white font-medium ${
                    loading || checkedIn
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    'Check In'
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckOut}
                  disabled={loading || !checkedIn}
                  className={`w-32 py-3 px-4 rounded-md text-white font-medium ${
                    loading || !checkedIn
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    'Check Out'
                  )}
                </motion.button>
              </div>

              {message && (
                <div className="p-3 bg-green-50 rounded-lg text-green-700 text-sm">
                  {message}
                </div>
              )}

              {lastCheckIn && (
                <div className="text-center text-sm text-gray-500">
                  <p>Last check-in: {lastCheckIn.toLocaleString()}</p>
                </div>
              )}

              <div className="mt-8 w-full max-w-xs">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Today's Status</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Current Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      checkedIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {checkedIn ? 'Checked In' : 'Checked Out'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkerDashboard; 