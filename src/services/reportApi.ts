import axios from 'axios';
import {
    ActRow, DebtRow,
    FinanceRow,
    FinanceSummary,
    LandlordRecord,
    LandlordSummary,
    ManagerSheet,
    MasterDetailReport,
    MasterSalary,
    MasterWeeklyReport,
    TimesheetResponse,
} from "../types/report";

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
    // --- Отчеты по мастерам ---

    /**
     * Получает сводный отчет по заработку всех мастеров за период.
     */
    getMastersWeeklyReport: (start: string, end: string) =>
        reportApi.get<MasterWeeklyReport[]>('/reports/masters-weekly', { params: { start, end } }),

    /**
     * Получает детальный отчет по конкретному мастеру за период.
     * @param masterId - ID мастера
     * @param start - начало
     * @param end - конец
     */
    getMasterDetailReport: (masterId: number | string, start: string | null, end: string | null) =>
        reportApi.get<MasterDetailReport>(`/reports/master-detail/${masterId}`, { params: { start, end } }),

    // --- Зарплатный журнал мастера ---

    getSalaryLogs: (masterId: string, start: string, end: string) =>
        reportApi.get<MasterSalary>('/reports/masters-salary-log', { params: { id: masterId, start, end } }),

    saveSalaryRecord: (data: ManagerSheet['records'][number] | Record<string, unknown>) =>
        reportApi.post('/reports/masters-salary-log', data),

    updateSalaryRecord: (id: number, data: Record<string, unknown>) =>
        reportApi.put(`/reports/masters-salary-log/${id}`, data),

    deleteSalaryRecord: (id: number) =>
        reportApi.delete(`/reports/masters-salary-log/${id}`),

    saveSalaryBalance: (masterId: number, year: number, month: number, previousBalance: number, interimPayments: number, isTimesheet: boolean) =>
        reportApi.post('/reports/masters-salary-balance', { masterId, year, month, previousBalance, interimPayments, isTimesheet }),

    // --- Табель ---

    /**
     * Получить записи табеля за конкретный месяц для мастера
     */
    getTimesheetRecords: (masterId: string, month: string) =>
        reportApi.get<TimesheetResponse>('/reports/timesheet', { params: { masterId, month } }),

    /**
     * Сохранить/обновить весь табель за месяц
     */
    saveTimesheetRecords: (masterId: string, month: string, records: ManagerSheet['records']) =>
        reportApi.post('/reports/timesheet', { masterId, month, records }),

    // --- Финансы (безналичные операции) ---

    /**
     * Получить данные по безналичным операциям за месяц (баланс + список записей)
     */
    getFinanceSummary: (year: number, month: number, type: 'NON_CASH' | 'CASH' | 'CURRENT_ACCOUNT') =>
        reportApi.get<FinanceSummary>('/finance/summary', { params: { year, month, type } }),

    /**
     * Сохранить новую или обновить существующую финансовую операцию
     */
    saveFinanceRecord: (data: FinanceRow) =>
        reportApi.post('/finance/records', data),

    /**
     * Удалить финансовую операцию
     */
    deleteFinanceRecord: (id: number) =>
        reportApi.delete(`/finance/records/${id}`),

    /**
     * Обновить баланс на начало отчетного периода
     */
    saveFinanceBalance: (year: number, month: number, amount: number, type: 'NON_CASH' | 'CASH' | 'CURRENT_ACCOUNT') =>
        reportApi.post('/finance/balance', { year, month, amount, type }),

    // --- Акты выполненных работ ---

    getActsSummary: (year: number, month: number) =>
        reportApi.get<ActRow[]>('/acts', { params: { year, month } }),

    /**
     * Создать или обновить запись акта выполненных работ
     */
    saveActRecord: (data: ActRow) =>
        reportApi.post('/acts', data),

    /**
     * Удалить запись акта по ID
     */
    deleteActRecord: (id: number) =>
        reportApi.delete(`/acts/${id}`),

    // --- Арендодатель ---

    /**
     * Получить данные по арендодателю
     */
    getLandlordSummary: (year: number, month: number) =>
        reportApi.get<LandlordSummary>('/reports/landlord', { params: { year, month } }),

    /**
     * Сохранение метаданных по арендодателю
     */
    saveLandlordMeta: (data: Pick<LandlordSummary, 'previousBalance' | 'additionalAgreement'>) =>
        reportApi.put<LandlordSummary>('/reports/landlord/meta', data),

    /**
     * Сохранение услуги по арендодателю
     */
    saveLandlordRecord: (data: LandlordRecord) =>
        reportApi.post<LandlordSummary>('/reports/landlord/records', data),

    /**
     * Удаление услуги по арендодателю
     */
    deleteLandlordRecord: (id: number) =>
        reportApi.delete<LandlordSummary>(`/reports/landlord/records/${id}`),

    getDebtsSummary:(year: number, month: number, type: 'CLIENT' | 'PARTNER' = 'CLIENT') =>
        reportApi.get<DebtRow[]>('/debt', { params: { year, month, type } }),


    saveDebtRecord: (data: DebtRow) =>
        reportApi.post('/debt', data),

    deleteDebtRecord: (id: number) =>
        reportApi.delete(`/debt/${id}`),
};