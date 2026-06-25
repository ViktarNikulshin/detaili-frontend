import axios from 'axios';
import {ManagerSheet, MasterDetailReport, MasterSalary, MasterWeeklyReport} from "../types/report";

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


    savePreviousBalance: (masterId: number, year: number, month: number, previousBalance: number, interimPayments?: number) => {
        return reportApi.get(`/reports/masters-salary-balance/?id=${masterId}&year=${year}&month=${month}&previousBalance=${previousBalance}&interimPayments=${interimPayments}`);
    },
    // Пример дополнения вашего reportAPI

        // ... ваши существующие методы (например, getSalaryRecords)

        // Получить записи табеля за конкретный месяц для мастера
        getTimesheetRecords: async (masterId: string, month: string) => {
            // Ожидаемый url: /api/reports/timesheet?masterId=X&month=YYYY-MM
            return reportApi.get(`/reports/timesheet`, { params: { masterId, month } });
        },

        // Сохранить/обновить весь табель за месяц
        saveTimesheetRecords: async (masterId: string, month: string, records: any[]) => {
            return reportApi.post(`/reports/timesheet`, { masterId, month, records });
        },
// Добавьте эти методы внутрь объекта export const reportAPI = { ... } в файле reportApi.ts

    /**
     * Получить данные по безналичным операциям за месяц (баланс + список записей)
     */
    getFinanceSummary: (year: number, month: number, type: string) =>
        reportApi.get<{ startingBalance: number; records: any[] }>(`/finance/summary?year=${year}&month=${month}&type=${type}`),

    /**
     * Сохранить новую или обновить существующую финансовую операцию
     */
    saveFinanceRecord: (data: any) =>
        reportApi.post('/finance/records', data),

    /**
     * Удалить финансовую операцию
     */
    deleteFinanceRecord: (id: number) =>
        reportApi.delete(`/finance/records/${id}`),

    /**
     * Обновить баланс на начало отчетного периода
     */
    saveFinanceBalance: (year: number, month: number, amount: number, type: string) =>
        reportApi.post(`/finance/balance?year=${year}&month=${month}&amount=${amount}&type=${type}`),

    getActsSummary: (year: number, month: number) =>
        reportApi.get<any[]>(`/reports/acts?year=${year}&month=${month}`),

    /**
     * Создать или обновить запись акта выполненных работ
     */
    saveActRecord: (data: any) =>
        reportApi.post('/reports/acts', data),

    /**
     * Удалить запись акта по ID
     */
    deleteActRecord: (id: number) =>
        reportApi.delete(`/reports/acts/${id}`),


};