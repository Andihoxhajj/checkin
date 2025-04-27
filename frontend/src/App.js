import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import WorkerDashboard from './components/WorkerDashboard';
import AdminDashboard from './components/AdminDashboard';
import DepartmentDetail from './components/DepartmentDetail';
import Reports from './components/Reports';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Check if user is logged in
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return !!token;
  };

  // Protected route component
  const ProtectedRoute = ({ children, requiredRole }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (requiredRole && user.role !== requiredRole) {
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/worker" 
          element={
            <ProtectedRoute requiredRole="worker">
              <WorkerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/department/:department" 
          element={
            <ProtectedRoute requiredRole="admin">
              <DepartmentDetail />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRole="admin">
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App; 