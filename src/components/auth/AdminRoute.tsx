import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { dbUser, loading, dbLoading } = useAuth();
  const location = useLocation();

  if (loading || dbLoading || dbUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (dbUser?.role !== 'admin' && dbUser?.role !== 'lead_admin') {
    // Log the attempt or handle unauthorized access
    console.warn(`Unauthorized admin access attempt by ${dbUser?.email}`);
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
