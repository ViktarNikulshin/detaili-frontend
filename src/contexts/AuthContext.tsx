import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/user';
import { authAPI } from '../services/auth';

interface AuthContextType {
    user: User | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Проверяем наличие токена и данных пользователя при загрузке
        const token = localStorage.getItem('token');
        const userDataStr = localStorage.getItem('user');

        if (token && userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                setUser(userData);

                // Проверяем валидность токена (можно добавить проверку с бэкендом)
                // authAPI.validateToken(token);

            } catch (error) {
                console.error('Error parsing user data:', error);
                logout();
            }
        }
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        authAPI.logout();
        setUser(null);
    };

    const value: AuthContextType = {
        user,
        login,
        logout,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};