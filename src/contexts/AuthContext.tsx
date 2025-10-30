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
    const [user, setUser] = useState<User | null>(null);

    // src/contexts/AuthContext.tsx

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userDataStr = localStorage.getItem('user');

        if (token && userDataStr) {

            const validate = async () => {
                try {
                    // 1. Ждем результат проверки
                    const isValid = await authAPI.validateToken(token);

                    if (isValid) {
                        // 2. Только если токен валиден, устанавливаем пользователя
                        const userData = JSON.parse(userDataStr);
                        setUser(userData);
                    } else {
                        // 3. Если токен невалиден - выходим
                        console.warn('Initial token validation failed.');
                        logout(); // Вызовет authAPI.logout() и setUser(null)
                    }
                } catch (error) {
                    console.error('Error parsing user data or validating token:', error);
                    logout();
                }
            };

            validate(); // Запускаем асинхронную проверку

        }
    }, []); // Пустой массив зависимостей - все верно

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