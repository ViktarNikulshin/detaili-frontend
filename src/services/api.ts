import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/detailing/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Интерцептор для добавления токена
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const orderAPI = {
    create: (order: FormData) => api.post('/orders', order),
    getCalendar: (start: string, end: string) =>
        api.get(`/orders/calendar?start=${start}&end=${end}`),
};