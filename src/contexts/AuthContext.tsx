import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/user';
import { authAPI } from '../services/authApi';

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
    // 1. Инициализируем user СРАЗУ из localStorage, а не null
    const [user, setUser] = useState<User | null>(() => {
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
            try {
                return JSON.parse(userDataStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userDataStr = localStorage.getItem('user');

        if (token && userDataStr) {
            const validate = async () => {
                try {
                    const isValid = await authAPI.validateToken(token);
                    if (isValid) {
                        const userData = JSON.parse(userDataStr);
                        setUser(userData);
                    } else {
                        console.warn('Initial token validation failed.');
                        logout();
                    }
                } catch (error) {
                    console.error('Error parsing user data or validating token:', error);
                    logout();
                }
            };

            validate();
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