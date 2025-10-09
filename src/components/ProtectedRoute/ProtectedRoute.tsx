import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
    requiredRole?: 'MANAGER' | 'ADMIN' | 'MASTER';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
                                                           requiredRole
                                                       }) => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && user?.roles?.some(r => r.name !== requiredRole)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;