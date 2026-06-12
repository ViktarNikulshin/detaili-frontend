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

