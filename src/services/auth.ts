import { LoginRequest, LoginResponse } from '../types/user';
import { orderApi } from './orderApi';

export const authAPI = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        const response = await orderApi.post<LoginResponse>('/auth/login', credentials);
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
};