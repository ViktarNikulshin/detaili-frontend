/**
 * Описывает заработок одного мастера по одному типу работ.
 * Используется в общем отчете по всем мастерам.
 */
export interface MasterWorkTypeEarning {
    workTypeId: number;
    workTypeName: string;
    totalEarnings: number;
}

/**
 * Описывает полный недельный отчет по одному мастеру.
 */
export interface MasterWeeklyReport {
    masterId: number;
    masterFirstName: string;
    masterLastName: string;
    earnings: MasterWorkTypeEarning[];
    totalMasterEarnings: number; // Общий заработок мастера за период
}

/**
 * Описывает заработок по конкретному заказу для одного типа работ.
 * Используется в детальном отчете.
 */
export interface OrderEarning {
    orderId: number;
    clientName: string;
    clientCar: string;
    executionDate: string; // Дата в формате ISO-строки
    earning: number;
}

/**
 * Описывает детальный заработок по одному типу работ, с разбивкой по заказам.
 */
export interface MasterDetailEarning {
    workTypeId: number;
    workTypeName: string;
    earningsByOrder: OrderEarning[];
}

/**
 * Описывает полный детальный отчет по одному мастеру.
 */
export interface MasterDetailReport {
    masterId: number;
    masterFirstName: string;
    masterLastName: string;
    reportDetails: MasterDetailEarning[];
}

export interface MasterSalary {
    previousBalance: number
    records: SalaryRecord [];

}

export interface SalaryRecord {
    id?: number;
    date: string;       // Формат для отображения, например '06.06'
    carModel: string;   // КУЛРЕЙ
    workTypeName: string; // ПОЛИРОВКА
    salary: number;    // ЗП (200)
}

export interface ManagerSheet {
    previousBalance: number
    records: DayRecord [];

}

export interface DayRecord {
    date: string;
    isAbsent: boolean;
    contentRub: number | string;
    salaryRub: number | string;
}

/**
 * Общая финансовая запись (безналичные операции)
 */
export interface FinanceRow {
    id?: number;
    date: string;
    income: number;
    expUtilities: number;
    expRent: number;
    expMaterials: number;
    expCredit: number;
    expSalary: number;
    expTaxes: number;
    expAdvertising?: number;
    expPartners: number;
    expOther: number;
    financeType?: 'NON_CASH' | 'CASH';
}

export interface FinanceSummary {
    startingBalance: number;
    records: FinanceRow[];
}

/**
 * Запись акта выполненных работ
 */
export interface ActRow {
    id?: number;
    date: string; // Формат YYYY-MM-DD
    client: string; // Заказчик
    carModel: string; // Машина
    amount: number; // Сумма
    phone: string; // Кон. телефон
    status: 'PAID' | 'UNPAID' | 'CASH'; // Статус (Оплачен, Не оплачен, Наличные)
    hasDocuments: boolean; // Наличие док (чекбокс)
}

/**
 * Запись по арендодателю (услуга/операция)
 */
export interface LandlordRecord {
    id?: number | null;
    year?: number;
    month?: number;
    date: Date | string | null; // Позволяет использовать и Date для DatePicker, и string
    carModel: string;
    workTypeName: string;
    cost: number;
}

export interface LandlordSummary {
    year: number;
    month: number;
    previousBalance: number;
    additionalAgreement: number;
    records?: LandlordRecord[]; // Помечено как опциональное, если бэк его не требует при сохранении
}

export interface TimesheetResponse {
    previousBalance: number;
    interimPayments?: number;
    records: DayRecord[];
}

export interface DebtRow {
    id?: number;
    date: string;
    client: string;
    carModel: string;
    amount: number;
    status: 'PAID' | 'UNPAID';
    debtType?: 'CLIENT' | 'PARTNER';
}

