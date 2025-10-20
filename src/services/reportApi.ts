import axios from 'axios';
import { MasterDetailReport, MasterWeeklyReport } from "../types/report";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export const reportApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Интерцептор для добавления токена авторизации
reportApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const reportAPI = {
    /**
     * Получает сводный отчет по заработку всех мастеров за последнюю неделю.
     */
    getMastersWeeklyReport: (start: string, end: string) =>
        reportApi.get<MasterWeeklyReport[]>(`/reports/masters-weekly?start=${start}&end=${end}`),

    /**
     * Получает детальный отчет по конкретному мастеру за последнюю неделю.
     * @param masterId - ID мастера
     */
    getMasterDetailReport: (masterId: number | string, start: string | null, end: string | null) =>
        reportApi.get<MasterDetailReport>(`/reports/master-detail/${masterId}?start=${start}&end=${end}`),
};