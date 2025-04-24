import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

function WorkerDashboard() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/worker/attendance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const records = response.data.records;
      const activeRecord = records.find(record => !record.check_out_time);
      setStatus(activeRecord ? 'checked-in' : 'checked-out');
    } catch (err) {
      console.error('Error fetching status:', err);
      setError('Failed to fetch status');
      setStatus('error');
    }
  };

  const handleCheckIn = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/check-in', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setMessage('Successfully checked in!');
        setError('');
        setStatus('checked-in');
        // Notify admin dashboard of the change
        await notifyAdminDashboard();
      } else {
        setError(response.data.message || 'Failed to check in');
      }
    } catch (err) {
      console.error('Check-in error:', err);
      setError(err.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/check-out', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setMessage('Successfully checked out!');
        setError('');
        setStatus('checked-out');
        // Notify admin dashboard of the change
        await notifyAdminDashboard();
      } else {
        setError(response.data.message || 'Failed to check out');
      }
    } catch (err) {
      console.error('Check-out error:', err);
      setError(err.response?.data?.message || 'Failed to check out');
    }
  };

  const notifyAdminDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/notify-status-change', {
        workerId: user.id,
        status: status
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Error notifying admin dashboard:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-red-600 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Worker Dashboard</h2>
                <p className="text-red-100 mt-1">Welcome, {user?.name || 'Worker'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg text-green-700 text-sm">
                {message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckIn}
                disabled={status === 'checked-in'}
                className={`p-6 rounded-xl shadow-md ${
                  status === 'checked-in'
                    ? 'bg-gray-100 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                } text-white font-semibold text-lg`}
              >
                Check In
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckOut}
                disabled={status === 'checked-out'}
                className={`p-6 rounded-xl shadow-md ${
                  status === 'checked-out'
                    ? 'bg-gray-100 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600'
                } text-white font-semibold text-lg`}
              >
                Check Out
              </motion.button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Current Status</h3>
              <p className="text-gray-600">
                {status === 'checked-in' ? 'You are currently checked in' :
                 status === 'checked-out' ? 'You are currently checked out' :
                 status === 'loading' ? 'Loading status...' :
                 'Error loading status'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkerDashboard; 