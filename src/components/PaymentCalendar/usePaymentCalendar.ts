/**
 * Состояние «Платёжного календаря»: загрузка периода, операций и стартовых
 * остатков, а также запись операций со ставшимися остатками.
 *
 * Ключевые решения по производительности:
 *  - один `reload()` вместо трёх независимых эффектов;
 *  - запросы не накапливаются: устаревший ответ отбрасывается по счётчику
 *    поколения, поэтому быстрые переключения периода не «догоняют» друг друга;
 *  - после записи операции показатели пересчитываются локально из списка
 *    операций, без повторного сложного запроса матрицы.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import moment from 'moment';
import { reportAPI } from '../../services/reportApi';
import {
    PcAccount,
    PcDay,
    PcDirection,
    PcOperation,
    PcOperationSave,
    PcPeriod,
    PC_CATEGORY_BUCKET,
} from '../../types/paymentCalendar';

export type PcMode = 'MONTH' | 'WEEK';
export type DirectionFilter = 'ALL' | PcDirection;
export type AccountFilter = 'ALL' | PcAccount;

/** Стартовые остатки, приведённые к строкам (как их держит поле ввода). */
export type StartingBalances = Record<string, string>;

const toIsoDate = (value: moment.MomentInput): string => format(moment(value).toDate(), 'yyyy-MM-dd');

/** Приводит стартовые показатели дня к нулю, сохраняя их форму. */
const zeroDay = (day: PcDay): PcDay => ({
    ...day,
    incomes: { orders: 0, other: 0, total: 0 },
    payments: {
        rent: 0, utilities: 0, salary: 0, materials: 0,
        taxes: 0, acquiring: 0, other: 0, total: 0,
    },
    dayBalance: 0,
    cumulativeBalance: 0,
    cashGap: false,
});

/**
 * Пересчитывает итоги дня, накопительный остаток и признаки кассового разрыва
 * после того, как суммы по статьям уже изменены.
 */
const recomputeDayTotals = (day: PcDay): PcDay => {
    const incomesTotal = day.incomes.orders + day.incomes.other;
    const paymentsTotal =
        day.payments.rent + day.payments.utilities + day.payments.salary +
        day.payments.materials + day.payments.taxes + day.payments.acquiring +
        day.payments.other;

    return {
        ...day,
        incomes: { ...day.incomes, total: incomesTotal },
        payments: { ...day.payments, total: paymentsTotal },
        dayBalance: incomesTotal - paymentsTotal,
    };
};

/** Пересчитывает матрицу периода по списку операций за тот же интервал. */
const buildPeriodFromOperations = (
    base: PcPeriod,
    operations: readonly PcOperation[]
): PcPeriod => {
    const byDate = new Map<string, PcDay>();
    base.days.forEach(day => byDate.set(day.date, zeroDay(day)));

    for (const op of operations) {
        const day = byDate.get(op.date);
        if (!day) continue; // операция вне периода

        const bucket = PC_CATEGORY_BUCKET[op.category];
        if (!bucket) continue;

        if (bucket.group === 'income') {
            (day.incomes as unknown as Record<string, number>)[bucket.field] += op.amount;
        } else {
            (day.payments as unknown as Record<string, number>)[bucket.field] += op.amount;
        }
    }

    const days = base.days.map(day => recomputeDayTotals(byDate.get(day.date) ?? day));

    // Накопительный остаток идёт от входящего остатка на начало периода.
    let running = base.totalOpening;
    let hasCashGap = false;
    const closingDays = days.map(day => {
        running += day.dayBalance;
        const cashGap = running < 0;
        if (cashGap) hasCashGap = true;
        return { ...day, cumulativeBalance: running, cashGap };
    });

    const incomesTotal = closingDays.reduce(
        (acc, day) => ({
            orders: acc.orders + day.incomes.orders,
            other: acc.other + day.incomes.other,
            total: acc.total + day.incomes.total,
        }),
        { orders: 0, other: 0, total: 0 }
    );

    const paymentsTotal = closingDays.reduce(
        (acc, day) => ({
            rent: acc.rent + day.payments.rent,
            utilities: acc.utilities + day.payments.utilities,
            salary: acc.salary + day.payments.salary,
            materials: acc.materials + day.payments.materials,
            taxes: acc.taxes + day.payments.taxes,
            acquiring: acc.acquiring + day.payments.acquiring,
            other: acc.other + day.payments.other,
            total: acc.total + day.payments.total,
        }),
        { rent: 0, utilities: 0, salary: 0, materials: 0, taxes: 0, acquiring: 0, other: 0, total: 0 }
    );

    return {
        ...base,
        days: closingDays,
        incomesTotal,
        paymentsTotal,
        hasCashGap,
        totalClosing: running,
        balances: base.balances.map(b => ({ ...b, net: b.closing - b.opening })),
    };
};

/** Интервал операций для выбранного режима и даты. */
const getOperationsRange = (date: Date, mode: PcMode): { start: string; end: string } => {
    const m = moment(date);
    if (mode === 'MONTH') {
        return { start: toIsoDate(m.startOf('month')), end: toIsoDate(m.endOf('month')) };
    }
    return {
        start: toIsoDate(m.startOf('isoWeek')),
        end: toIsoDate(m.startOf('isoWeek').add(6, 'days')),
    };
};

interface UsePaymentCalendarOptions {
    onError: (message: string) => void;
}

export const usePaymentCalendar = ({ onError }: UsePaymentCalendarOptions) => {
    const [mode, setMode] = useState<PcMode>('MONTH');
    const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
    const [period, setPeriod] = useState<PcPeriod | null>(null);
    const [operations, setOperations] = useState<PcOperation[]>([]);
    const [startingBalances, setStartingBalances] = useState<StartingBalances>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [operationsLoading, setOperationsLoading] = useState<boolean>(false);
    const [savingAccount, setSavingAccount] = useState<PcAccount | null>(null);
    const [savingOperation, setSavingOperation] = useState<boolean>(false);

    // Операции после локальной правки; матрица всегда строится из них.
    const [localOperations, setLocalOperations] = useState<PcOperation[] | null>(null);

    /** Счётчик поколения: более старый ответ не должен затирать более новый. */
    const generationRef = useRef(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const year = moment(currentDate).year();
    const month = moment(currentDate).month() + 1;
    const monthLabel = useMemo(
        () => moment(currentDate).locale('ru').format('MMMM YYYY').toUpperCase(),
        [currentDate]
    );

    /** Полная перезагрузка. Вызывается при смене периода/режима и после записи. */
    const load = useCallback(async (date: Date, activeMode: PcMode) => {
        const generation = ++generationRef.current;
        const isStale = () => generation !== generationRef.current || !mountedRef.current;

        setLoading(true);
        setOperationsLoading(true);
        setLocalOperations(null);

        const periodRequest = activeMode === 'MONTH'
            ? reportAPI.getPaymentCalendarMonth(moment(date).year(), moment(date).month() + 1)
            : reportAPI.getPaymentCalendarWeek(toIsoDate(date));

        const range = getOperationsRange(date, activeMode);
        const operationsRequest = reportAPI.getPaymentCalendarOperations(range.start, range.end);
        const balancesRequest = reportAPI.getPaymentCalendarBalances(
            moment(date).year(),
            moment(date).month() + 1
        );

        // Запросы идут параллельно и не роняют друг друга: если не ответил
        // один, остальные данные всё равно доедут до экрана.
        const [periodResult, operationsResult, balancesResult] =
            await Promise.allSettled([periodRequest, operationsRequest, balancesRequest]);

        if (isStale()) return;

        if (periodResult.status === 'fulfilled') {
            setPeriod(periodResult.value.data);
        } else {
            console.error('Ошибка загрузки платёжного календаря:', periodResult.reason);
            onError('Не удалось загрузить платёжный календарь.');
        }
        setLoading(false);

        if (operationsResult.status === 'fulfilled') {
            setOperations(operationsResult.value.data ?? []);
        } else {
            console.error('Не удалось загрузить операции:', operationsResult.reason);
            setOperations([]);
        }
        setOperationsLoading(false);

        if (balancesResult.status === 'fulfilled') {
            const raw = balancesResult.value.data ?? {};
            const normalized: StartingBalances = {};
            Object.entries(raw).forEach(([account, value]) => {
                normalized[account] = value === null || value === undefined ? '' : String(value);
            });
            setStartingBalances(normalized);
        } else {
            console.error('Не удалось загрузить стартовые остатки:', balancesResult.reason);
        }
    }, [onError]);

    useEffect(() => {
        void load(currentDate, mode);
    }, [currentDate, mode, load]);

    /** Показатели периода: локально пересчитанные или полученные с сервера. */
    const displayPeriod = useMemo(() => {
        if (!period) return null;
        if (!localOperations) return period;
        return buildPeriodFromOperations(period, localOperations);
    }, [period, localOperations]);

    /**
     * Пересчёт после записи операции: не ходим за матрицей повторно.
     * `buildPeriodFromOperations` вызывается редко (только на действие
     * пользователя), поэтому `useDeferredValue` не нужен.
     */
    const applyOperations = useCallback((next: PcOperation[]) => {
        setLocalOperations(next);
        setOperations(next);
    }, []);

    const createOperation = useCallback(async (payload: PcOperationSave) => {
        const response = await reportAPI.savePaymentCalendarOperation(payload);
        return response.data;
    }, []);

    const updateOperation = useCallback(async (id: number, payload: PcOperationSave) => {
        const response = await reportAPI.updatePaymentCalendarOperation(id, payload);
        return response.data;
    }, []);

    const deleteOperation = useCallback(async (id: number) => {
        await reportAPI.deletePaymentCalendarOperation(id);
    }, []);

    const saveStartingBalance = useCallback(async (account: PcAccount, amount: number) => {
        setSavingAccount(account);
        try {
            await reportAPI.savePaymentCalendarBalance(
                moment(currentDate).year(),
                moment(currentDate).month() + 1,
                account,
                amount
            );
            await load(currentDate, mode);
        } finally {
            if (mountedRef.current) setSavingAccount(null);
        }
    }, [currentDate, mode, load]);

    return {
        // состояние
        mode, setMode,
        currentDate, setCurrentDate,
        year, month, monthLabel,
        period: displayPeriod,
        operations, applyOperations,
        startingBalances, setStartingBalances,
        loading, operationsLoading,
        savingAccount, savingOperation, setSavingOperation,
        // записи
        createOperation, updateOperation, deleteOperation, saveStartingBalance,
        reload: () => load(currentDate, mode),
    };
};
