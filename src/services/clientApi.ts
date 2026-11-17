import axios from 'axios';
import { ClientDetails, ClientListItem } from '../types/client';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const clientApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

clientApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const clientAPI = {
    /** Клиентская база с агрегатами. search — подстрока имени или телефона. */
    getClients: (search?: string) =>
        clientApi.get<ClientListItem[]>('/clients', {
            params: search ? { search } : undefined,
        }),

    /** Карточка клиента с историей заказов. */
    getClient: (id: number) => clientApi.get<ClientDetails>(`/clients/${id}`),

    /** Подсказка в форме заказа: клиент по точному телефону. 204 = не найден. */
    findByPhone: (phone: string) => clientApi.get<ClientDetails>('/clients/by-phone', {
        params: { phone },
    }),
};
