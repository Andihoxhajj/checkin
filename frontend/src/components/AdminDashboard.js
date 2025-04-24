import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';

function AdminDashboard() {
  const location = useLocation();
  const user = location.state?.user;
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/workers', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setWorkers(response.data);
      } catch (err) {
        console.error('Error fetching workers:', err);
        setError(err.response?.data?.error || 'Failed to fetch workers');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, []);

  if (!user || user.role !== 'admin') {
    return <div>Unauthorized access</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Worker Management</h2>
            
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-red-700">{error}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {workers.map((worker) => (
                      <tr key={worker.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{worker.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.position}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            worker.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {worker.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard; 