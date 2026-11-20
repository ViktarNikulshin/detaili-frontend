/**
 * Типы «Платёжного календаря» (движение денег, остатки, кассовые разрывы).
 * Контракт соответствует бэкенду: /api/payment-calendar
 */

/** Счёт: CASH — касса BYN, NON_CASH — карт-счёт, CURRENT_ACCOUNT — расчётный счёт */
export type PcAccount = 'CASH' | 'NON_CASH' | 'CURRENT_ACCOUNT';

/** Направление операции */
export type PcDirection = 'INCOME' | 'EXPENSE';

/**
 * Статья операции. Продажи товаров (розница/сопутствующие) сознательно
 * отсутствуют: в поступлениях только заказы и прочие поступления.
 */
export type PcCategory =
    | 'CLIENT_ORDER'   // Заказы (автоматически из завершённых заказов)
    | 'OTHER_INCOME'   // Прочие поступления
    | 'RENT'           // Аренда
    | 'UTILITIES'      // Коммунальные платежи
    | 'SALARY'         // Зарплата (ФОТ)
    | 'MATERIALS'      // Материалы и химия
    | 'TAXES'          // Налоги
    | 'ACQUIRING'      // Реклама (исторический код ACQUIRING, см. PC_CATEGORY_LABELS)
    | 'OTHER_EXPENSE'; // Прочие расходы

export type PcSourceType = 'MANUAL' | 'ORDER_AUTO';

export interface PcCategoryTotals {
    orders: number;
    other: number;
    total: number;
}

export interface PcPaymentTotals {
    rent: number;
    utilities: number;
    salary: number;
    materials: number;
    taxes: number;
    acquiring: number;
    other: number;
    total: number;
}

/** Один день календаря */
export interface PcDay {
    date: string;              // YYYY-MM-DD
    incomes: PcCategoryTotals; // Поступления: заказы / прочие / итого
    payments: PcPaymentTotals; // Платежи: аренда, коммуналка, ФОТ, материалы, налоги, реклама, прочие, итого
    dayBalance: number;        // Дневной баланс
    cumulativeBalance: number; // Кумулятивный остаток на конец дня
    cashGap: boolean;          // Кассовый разрыв (кумулятив < 0)
}

/** Остатки счёта за период */
export interface PcBalance {
    account: PcAccount;
    opening: number;  // На начало периода
    net: number;      // Чистый поток
    closing: number;  // На конец периода
}

/** Ответ за период (месяц или неделя) */
export interface PcPeriod {
    mode: 'MONTH' | 'WEEK';
    periodStart: string;
    periodEnd: string;
    balances: PcBalance[];
    days: PcDay[];
    incomesTotal: PcCategoryTotals;
    paymentsTotal: PcPaymentTotals;
    totalOpening: number;
    totalClosing: number;
    hasCashGap: boolean;
}

/** Операция календаря */
export interface PcOperation {
    id: number;
    date: string;
    direction: PcDirection;
    category: PcCategory;
    account: PcAccount;
    amount: number;
    description?: string;
    sourceType: PcSourceType;
    orderId?: number;
    orderClient?: string;
    orderCar?: string;
}

/** Создание/редактирование ручной операции */
export interface PcOperationSave {
    date: string;
    direction: PcDirection;
    category: PcCategory;
    account: PcAccount;
    amount: number;
    description?: string;
}

export const PC_ACCOUNT_LABELS: Record<PcAccount, string> = {
    CASH: 'Касса (BYN)',
    NON_CASH: 'Карт-счёт',
    CURRENT_ACCOUNT: 'Расчётный счёт',
};

export const PC_CATEGORY_LABELS: Record<PcCategory, string> = {
    CLIENT_ORDER: 'Заказы',
    OTHER_INCOME: 'Прочие поступления',
    RENT: 'Аренда',
    UTILITIES: 'Коммунальные платежи',
    SALARY: 'Зарплата (ФОТ)',
    MATERIALS: 'Материалы и химия',
    TAXES: 'Налоги',
    ACQUIRING: 'Реклама',
    OTHER_EXPENSE: 'Прочие расходы',
};

/**
 * Категории, доступные для выбора в форме ручной операции.
 * `CLIENT_ORDER` отсутствует намеренно: это категория автопроводок по заказам.
 */
export const PC_INCOME_CATEGORIES: PcCategory[] = ['OTHER_INCOME'];
export const PC_EXPENSE_CATEGORIES: PcCategory[] = [
    'RENT', 'UTILITIES', 'SALARY', 'MATERIALS', 'TAXES', 'ACQUIRING', 'OTHER_EXPENSE',
];

/**
 * В какие поля агрегата попадает каждая статья при пересчёте матрицы.
 * Нужно для оптимистичного пересчёта: матрица обновляется локально,
 * не дожидаясь повторного запроса к бэкенду.
 */
export const PC_CATEGORY_BUCKET: Record<
    PcCategory,
    { group: 'income' | 'payment'; field: string }
> = {
    CLIENT_ORDER: { group: 'income', field: 'orders' },
    OTHER_INCOME: { group: 'income', field: 'other' },
    RENT: { group: 'payment', field: 'rent' },
    UTILITIES: { group: 'payment', field: 'utilities' },
    SALARY: { group: 'payment', field: 'salary' },
    MATERIALS: { group: 'payment', field: 'materials' },
    TAXES: { group: 'payment', field: 'taxes' },
    ACQUIRING: { group: 'payment', field: 'acquiring' },
    OTHER_EXPENSE: { group: 'payment', field: 'other' },
};
