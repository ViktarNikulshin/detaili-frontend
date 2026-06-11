import axios from 'axios';
import {MasterDetailReport, MasterSalary, MasterWeeklyReport, SalaryRecord} from "../types/report";

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

    getSalaryLogs: (masterId: string, startOfMonth: string, endOfMonth: string) =>
        reportApi.get<MasterSalary>(`/reports/masters-salary-log?id=${masterId}&start=${startOfMonth}&end=${endOfMonth}`),

    saveSalaryRecord: (data: any) => {
        return reportApi.post('/reports/masters-salary-log', data); // ваш эндпоинт
    },
    updateSalaryRecord: (id: number, data: any) => {
        return reportApi.put(`/reports/masters-salary-log/${id}`, data);
    },

    deleteSalaryRecord: (id: number) => {
        return reportApi.delete(`/reports/masters-salary-log/${id}`);
    },


    savePreviousBalance: ( masterId: number, year: number, month: number, previousBalance: number) => {
        return reportApi.get(`/reports/masters-salary-balance/?id=${masterId}&year=${year}&month=${month}&previousBalance=${previousBalance}`);
    }
};