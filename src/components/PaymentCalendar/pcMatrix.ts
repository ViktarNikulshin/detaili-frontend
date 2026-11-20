/**
 * Декларативное описание матрицы «Платёжного календаря».
 *
 * Раньше строки матрицы и строки журнала операций описывались в двух
 * независимых местах, из-за чего они разъезжались: `CLIENT_ORDER` не имел
 * строки в матрице и не был доступен в выпадающем списке формы. Здесь
 * единственный источник правды — секции ниже, из них же строится форма.
 */
import {
    PcCategory,
    PcDay,
    PcDirection,
    PcPeriod,
    PC_CATEGORY_LABELS,
    PC_EXPENSE_CATEGORIES,
    PC_INCOME_CATEGORIES,
} from '../../types/paymentCalendar';

export const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

export type MatrixRowType = 'income' | 'income-total' | 'expense' | 'expense-total';

export interface MatrixRowConfig {
    key: string;
    label: string;
    rowType: MatrixRowType;
    /** Направление задано только у «кликабельных» строк — по ним можно добавить операцию. */
    direction?: PcDirection;
    /** Статья, которая подставится в форму при клике по ячейке. */
    category?: PcCategory;
    getDayValue: (day: PcDay) => number;
    getTotalValue: (period: PcPeriod) => number;
}

export interface MatrixSectionConfig {
    sectionTitle: string;
    rows: MatrixRowConfig[];
}

export const MATRIX_SECTIONS: MatrixSectionConfig[] = [
    {
        sectionTitle: 'Поступления',
        rows: [
            {
                key: 'in-orders',
                label: 'Заказы',
                rowType: 'income',
                direction: 'INCOME',
                category: 'CLIENT_ORDER',
                getDayValue: d => d.incomes.orders,
                getTotalValue: p => p.incomesTotal.orders,
            },
            {
                key: 'in-other',
                label: 'Прочие приходы',
                rowType: 'income',
                direction: 'INCOME',
                category: 'OTHER_INCOME',
                getDayValue: d => d.incomes.other,
                getTotalValue: p => p.incomesTotal.other,
            },
            {
                key: 'in-total',
                label: 'Приходы (итого)',
                rowType: 'income-total',
                getDayValue: d => d.incomes.total,
                getTotalValue: p => p.incomesTotal.total,
            },
        ],
    },
    {
        sectionTitle: 'Платежи',
        rows: [
            {
                key: 'out-rent',
                label: 'Аренда',
                rowType: 'expense',
                direction: 'EXPENSE',
                category: 'RENT',
                getDayValue: d => d.payments.rent,
                getTotalValue: p => p.paymentsTotal.rent,
            },
            {
                key: 'out-utilities',
                label: 'Коммуналка',
                rowType: 'expense',
                direction: 'EXPENSE',
                category: 'UTILITIES',
                getDayValue: d => d.payments.utilities,
                getTotalValue: p => p.paymentsTotal.utilities,
            },
            {
                key: 'out-salary',
                label: 'Зарплата (ФОТ)',
                rowType: 'expense',
                direction: 'EXPENSE',
                category: 'SALARY',
                getDayValue: d => d.payments.salary,
                getTotalValue: p => p.paymentsTotal.salary,
            },
            {
                key: 'out-materials',
                label: 'Материалы и химия',
                rowType: 'expense',
                direction: 'EXPENSE',
                category: 'MATERIALS',
                getDayValue: d => d.payments.materials,
                getTotalValue: p => p.paymentsTotal.materials,
            },
            {
                key: 'out-taxes',
                label: 'Налоги',
                rowType: 'expense',
                direction: 'EXPENSE',
                category: 'TAXES',
                getDayValue: d => d.payments.taxes,
                getTotalValue: p => p.paymentsTotal.taxes,
            },
            {
                key: 'out-acquiring',
                label: 'Реклама',
                rowType: 'expense',
                direction: 'EXPENSE',
                category: 'ACQUIRING',
                getDayValue: d => d.payments.acquiring,
                getTotalValue: p => p.paymentsTotal.acquiring,
            },
            {
                key: 'out-other',
                label: 'Прочие расходы',
                rowType: 'expense',
                direction: 'EXPENSE',
                category: 'OTHER_EXPENSE',
                getDayValue: d => d.payments.other,
                getTotalValue: p => p.paymentsTotal.other,
            },
            {
                key: 'out-total',
                label: 'Платежи (итого)',
                rowType: 'expense-total',
                getDayValue: d => d.payments.total,
                getTotalValue: p => p.paymentsTotal.total,
            },
        ],
    },
];

export const getCategoryLabel = (category: PcCategory | string): string =>
    PC_CATEGORY_LABELS[category as PcCategory] ?? String(category);

/** Статьи, доступные в форме. */
export const getCategoryOptions = (direction: PcDirection): readonly PcCategory[] =>
    direction === 'INCOME' ? PC_INCOME_CATEGORIES : PC_EXPENSE_CATEGORIES;

/** Статья по умолчанию для направления. */
export const getDefaultCategory = (direction: PcDirection): PcCategory =>
    getCategoryOptions(direction)[0] ?? (direction === 'INCOME' ? 'OTHER_INCOME' : 'OTHER_EXPENSE');

/**
 * Статья из формы, но с гарантией, что она принадлежит выбранному направлению.
 * Иначе можно было сохранить расход с приходной статьёй — агрегат такого
 * дня молча терял сумму.
 */
export const resolveCategoryForDirection = (
    direction: PcDirection,
    preferred?: string | null
): PcCategory => {
    if (preferred) {
        const matched = getCategoryOptions(direction).find(item => item === preferred);
        if (matched !== undefined) return matched;
    }
    return getDefaultCategory(direction);
};
