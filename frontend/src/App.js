import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import WorkerDashboard from './components/WorkerDashboard';
import AdminDashboard from './components/AdminDashboard';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [workerId, setWorkerId] = useState('');
  const [workerPassword, setWorkerPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showWorkerLogin, setShowWorkerLogin] = useState(false);

  const handleWorkerLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/worker-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: workerId,
          password: workerPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setWorkerId('');
        setWorkerPassword('');
        setShowWorkerLogin(false);
      } else {
        setError(data.error || 'Invalid worker ID or password');
      }
    } catch (err) {
      setError('Error connecting to server. Please try again later.');
    }
  };

  const handleCheckIn = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ workerId: user.id })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Successfully checked in!');
        setError('');
      } else {
        setError(data.error || 'Failed to check in');
      }
    } catch (err) {
      setError('Error connecting to server. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/worker" element={<WorkerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}

export default App; 