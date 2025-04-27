import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

function DepartmentDetail() {
  const { department } = useParams();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    fetchWorkers();

    // Set up polling to refresh worker status every 2 seconds
    const intervalId = setInterval(fetchWorkers, 2000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [department]);

  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/workers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // Filter workers by department and parse latest_attendance
        const departmentWorkers = response.data.workers
          .filter(worker => worker.department === decodeURIComponent(department))
          .map(worker => ({
            ...worker,
            latest_attendance: worker.latest_attendance ? JSON.parse(worker.latest_attendance) : null
          }));
        setWorkers(departmentWorkers);
      } else {
        setError(response.data.message || 'Failed to fetch workers');
      }
    } catch (err) {
      console.error('Error fetching workers:', err);
      setError(err.response?.data?.message || 'Failed to fetch workers');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'No check-in record';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      // Convert to local timezone (CET)
      const localDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Sarajevo' }));
      
      return localDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Sarajevo'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  if (!user || user.role !== 'admin') {
    return <div>Unauthorized access</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-red-600 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">{decodeURIComponent(department)}</h2>
                <p className="text-red-100 mt-1">Department Details</p>
              </div>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workers.map((worker) => (
                    <motion.div
                      key={worker.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
                    >
                      <div className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 text-xl font-semibold">
                              {worker.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{worker.name}</h3>
                            <p className="text-gray-600">{worker.position}</p>
                            <p className="text-sm text-gray-500">{worker.email}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                            worker.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {worker.status}
                          </span>
                          <div className="text-sm text-gray-500">
                            Last check-in: {formatDateTime(worker.latest_attendance?.check_in_time)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DepartmentDetail; 