import React from 'react';
import { Navigate } from 'react-router-dom';
import { getStoredAuthToken } from '../utils/api';

function ProtectedAdminRoute({ user, children, requiredRole = 'admin' }) {
  const token = getStoredAuthToken();
  const isAdmin = Boolean(token && user?.role === requiredRole);

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: '/admin', message: 'Admin access requires login' }} replace />;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>❌ Access Denied</h2>
        <p>You do not have admin permissions to access this page.</p>
        <a href="/" style={{ color: '#c9541e', textDecoration: 'none', fontWeight: 'bold' }}>
          Go to Home
        </a>
      </div>
    );
  }

  return children;
}

export default ProtectedAdminRoute;
