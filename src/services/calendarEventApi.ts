import axios from 'axios';
import { CustomEvent } from "../types/order";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const calendarEventApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

calendarEventApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface CustomEventPayload {
    date: string; // YYYY-MM-DD
    description: string;
}

export const calendarEventAPI = {
    /**
     * Получить произвольные события календаря за период
     */
    getEvents: (start: string, end: string) =>
        calendarEventApi.get<CustomEvent[]>('/calendar-events', { params: { start, end } }),

    /**
     * Создать новое событие
     */
    create: (data: CustomEventPayload) =>
        calendarEventApi.post<CustomEvent>('/calendar-events', data),

    /**
     * Обновить существующее событие
     */
    update: (id: number, data: CustomEventPayload) =>
        calendarEventApi.put<CustomEvent>(`/calendar-events/${id}`, data),

    /**
     * Удалить событие
     */
    delete: (id: number) =>
        calendarEventApi.delete(`/calendar-events/${id}`),
};
