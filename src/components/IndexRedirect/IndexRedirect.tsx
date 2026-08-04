// src/components/IndexRedirect.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import {useAuth} from "../../contexts/AuthContext";
import {isMasterUser} from "../../utils/auth";
import MasterSalaryLog from "../MasterSalary/MasterSalaryLog";

export const IndexRedirect: React.FC = () => {
    const { user } = useAuth();

    // Если зашел мастер — отправляем на /calendar
    if (isMasterUser(user)) {
        return <Navigate to="/calendar" replace />;
    }

    // В остальных случаях показываем зарплатную ведомость/главную
    return <MasterSalaryLog />;
};