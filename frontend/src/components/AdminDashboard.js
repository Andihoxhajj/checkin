import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

function AdminDashboard() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    password: ''
  });
  const [createUserError, setCreateUserError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    fetchWorkers();

    // Set up polling to refresh worker status every 2 seconds
    const intervalId = setInterval(fetchWorkers, 2000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/workers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setWorkers(response.data.workers);
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateUserError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/workers', newUser, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setShowCreateUserModal(false);
        setNewUser({
          name: '',
          email: '',
          department: '',
          position: '',
          password: ''
        });
        fetchWorkers(); // Refresh the worker list
      } else {
        setCreateUserError(response.data.message || 'Failed to create user');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setCreateUserError(err.response?.data?.message || 'Failed to create user');
    }
  };

  // Group workers by department
  const workersByDepartment = workers.reduce((acc, worker) => {
    const dept = worker.department || 'Unassigned';
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(worker);
    return acc;
  }, {});

  const handleSeeMore = (department) => {
    navigate(`/admin/department/${encodeURIComponent(department)}`);
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
                <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
                <p className="text-red-100 mt-1">Welcome, {user.name}</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Create User
                </button>
                <button
                  onClick={() => navigate('/reports')}
                  className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Reports
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Create User Modal */}
          {showCreateUserModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Create New User</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      id="email"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
                    <input
                      type="text"
                      id="department"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      value={newUser.department}
                      onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700">Position</label>
                    <input
                      type="text"
                      id="position"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      value={newUser.position}
                      onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      id="password"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  {createUserError && (
                    <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                      {createUserError}
                    </div>
                  )}
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Create User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.entries(workersByDepartment).map(([department, departmentWorkers]) => (
                  <motion.div
                    key={department}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDepartment(selectedDepartment === department ? null : department)}
                    className={`bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer border-2 transition-all duration-300 ${
                      selectedDepartment === department 
                        ? 'border-red-400 shadow-xl' 
                        : 'border-gray-100 hover:border-red-200'
                    }`}
                  >
                    <div className="p-6 bg-gradient-to-br from-red-500 to-red-600">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-white">{department}</h3>
                          <p className="text-red-100 mt-1">{departmentWorkers.length} employees</p>
                        </div>
                        <div className="bg-white/20 rounded-lg px-3 py-1">
                          <span className="text-white text-sm font-medium">
                            {departmentWorkers.filter(w => w.status === 'Active').length} Active
                          </span>
                        </div>
                      </div>
                    </div>
                    {selectedDepartment === department && (
                      <div className="p-6 border-t border-gray-100">
                        <div className="space-y-4">
                          {departmentWorkers.map((worker) => (
                            <div 
                              key={worker.id} 
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                  <span className="text-red-600 font-semibold">
                                    {worker.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{worker.name}</p>
                                  <p className="text-sm text-gray-600">{worker.position}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                                  worker.status === 'Active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {worker.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => handleSeeMore(department)}
                            className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <span>See More</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard; 