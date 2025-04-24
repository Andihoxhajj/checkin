import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

function Login() {
  const [loginType, setLoginType] = useState('worker'); // 'worker' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const navigate = useNavigate();

  // Check server connection on component mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/health');
        if (response.data.status === 'ok') {
          setServerStatus('connected');
        } else {
          setServerStatus('error');
        }
      } catch (err) {
        console.error('Server connection error:', err);
        setServerStatus('error');
      }
    };

    checkServer();
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/admin', { state: { user } });
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        setError(error.response.data.error || 'Invalid credentials');
      } else if (error.request) {
        setError('Cannot connect to server. Please make sure the backend server is running.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/worker-login', {
        id: workerId,
        password: password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/worker', { state: { user } });
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        setError(error.response.data.error || 'Invalid worker ID or password');
      } else if (error.request) {
        setError('Cannot connect to server. Please make sure the backend server is running.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-red-600 p-6 text-center">
            <h2 className="text-3xl font-bold text-white">Pizzeria Check-In</h2>
            <p className="text-red-100 mt-2">Welcome! Please sign in to continue</p>
          </div>
          
          <div className="p-6">
            {serverStatus === 'checking' && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg text-yellow-700 text-sm">
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking server connection...
                </div>
              </div>
            )}
            
            {serverStatus === 'error' && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cannot connect to server. Please make sure the backend server is running.
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setLoginType('worker')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md ${
                    loginType === 'worker'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Worker Login
                </button>
                <button
                  onClick={() => setLoginType('admin')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md ${
                    loginType === 'admin'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Admin Login
                </button>
              </div>
            </div>

            {loginType === 'admin' ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || serverStatus === 'error'}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || serverStatus === 'error'}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || serverStatus === 'error'}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    loading || serverStatus === 'error'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  }`}
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  {loading ? 'Signing in...' : 'Sign in'}
                </motion.button>
              </form>
            ) : (
              <form onSubmit={handleWorkerLogin} className="space-y-4">
                <div>
                  <label htmlFor="workerId" className="block text-sm font-medium text-gray-700">Worker ID</label>
                  <input
                    id="workerId"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your worker ID"
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    disabled={loading || serverStatus === 'error'}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || serverStatus === 'error'}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || serverStatus === 'error'}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    loading || serverStatus === 'error'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  }`}
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  {loading ? 'Signing in...' : 'Sign in'}
                </motion.button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              <p className="font-semibold">Test Accounts:</p>
              <div className="mt-2 space-y-1">
                <p>Admin: admin@pizzeria.com / admin123</p>
                <p>Workers: worker1, worker2</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Login; 