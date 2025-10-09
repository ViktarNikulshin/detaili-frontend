import { LoginRequest, LoginResponse } from '../types/user';
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const authApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Интерцептор для добавления токена
authApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


export const authAPI = {

    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        const response = await authApi.post<LoginResponse>('/auth/login', credentials);
        return response.data;
    },

    logout: async (): Promise<void> => {
        // Очистка на клиенте, бэкенд может обрабатывать logout отдельно
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser: (): any => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    validateToken: async (token: string) => {
        try {
            const response = await authApi.post(`/auth/validate-token`, { token });
            // Возвращаем true, если бэкенд подтвердил токен
            return response.data.isValid;
        } catch (error) {
            // В случае ошибки (например, 401 Unauthorized), возвращаем false
            console.error('Token validation failed:', error);
            return false;
        }
    }
};