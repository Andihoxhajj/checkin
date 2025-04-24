import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function Navbar({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className="bg-red-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-white text-xl font-bold">Pizzeria Check-In</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="ml-4 flex items-center md:ml-6">
              <div className="ml-3 relative">
                <div className="flex items-center space-x-4">
                  <span className="text-white">
                    {user.name} ({user.role === 'admin' ? 'Admin' : 'Worker'})
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="bg-white text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Logout
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 