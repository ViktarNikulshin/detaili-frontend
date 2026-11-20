import React, { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import { PcAccount, PcOperation, PC_ACCOUNT_LABELS } from '../../types/paymentCalendar';
import PaymentMatrix, { fmt } from './PaymentMatrix';
import PaymentOperations, {
    draftToPayload,
    getAccountLabel,
    OperationDraft,
} from './PaymentOperations';
import {
    MatrixRowConfig,
    getDefaultCategory,
    resolveCategoryForDirection,
} from './pcMatrix';
import { usePaymentCalendar } from './usePaymentCalendar';
import './PaymentCalendar.css';

const ACCOUNTS = Object.keys(PC_ACCOUNT_LABELS) as PcAccount[];

const toIsoDate = (value: Date): string => moment(value).format('YYYY-MM-DD');

const emptyDraft = (): OperationDraft => ({
    date: toIsoDate(new Date()),
    direction: 'EXPENSE',
    category: getDefaultCategory('EXPENSE'),
    account: 'CASH',
    amount: '',
    description: '',
});

const scrollToOperations = (): void => {
    document.getElementById('pc-operations-anchor')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const errorMessage = (err: unknown, fallback: string): string => {
    const axiosErr = err as { response?: { data?: { message?: string } | string } };
    if (typeof axiosErr?.response?.data === 'string') return axiosErr.response.data;
    return axiosErr?.response?.data?.message || fallback;
};

const PaymentCalendar: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const onError = useCallback((message: string) => setError(message), []);

    const {
        mode, setMode,
        setCurrentDate,
        monthLabel,
        period,
        operations, applyOperations,
        startingBalances, setStartingBalances,
        loading, operationsLoading,
        savingAccount, savingOperation, setSavingOperation,
        createOperation, updateOperation, deleteOperation, saveStartingBalance,
    } = usePaymentCalendar({ onError });

    const [draft, setDraft] = useState<OperationDraft | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    const handlePrev = useCallback(() => setCurrentDate((prev: Date) =>
        mode === 'MONTH'
            ? moment(prev).subtract(1, 'month').toDate()
            : moment(prev).subtract(7, 'days').toDate()
    ), [mode, setCurrentDate]);

    const handleNext = useCallback(() => setCurrentDate((prev: Date) =>
        mode === 'MONTH'
            ? moment(prev).add(1, 'month').toDate()
            : moment(prev).add(7, 'days').toDate()
    ), [mode, setCurrentDate]);

    const handleToday = useCallback(() => setCurrentDate(new Date()), [setCurrentDate]);

    const periodLabel = useMemo(() => {
        if (!period || period.mode === 'MONTH') return monthLabel;
        return `${moment(period.periodStart).format('DD.MM')} — ${moment(period.periodEnd).format('DD.MM.YYYY')}`;
    }, [period, monthLabel]);

    const balanceByAccount = useMemo(() => {
        const map: Record<string, { opening: number; net: number; closing: number }> = {};
        period?.balances?.forEach(b => {
            map[b.account] = { opening: b.opening, net: b.net, closing: b.closing };
        });
        return map;
    }, [period]);

    const cashGapDaysCount = useMemo(
        () => (period?.days ?? []).filter(d => d.cashGap).length,
        [period]
    );

    /** Правка черновика. Смена направления подтягивает совместимую статью. */
    const handleDraftChange = useCallback((patch: Partial<OperationDraft>) => {
        setDraft(prev => {
            if (!prev) return prev;
            const next = { ...prev, ...patch };
            if (patch.direction !== undefined) {
                next.category = resolveCategoryForDirection(next.direction, null);
            } else if (patch.category !== undefined) {
                // Защита от сохранения расхода с приходной статьёй.
                next.category = resolveCategoryForDirection(next.direction, patch.category);
            }
            return next;
        });
    }, []);

    const handleStartAdd = useCallback(() => {
        setEditingId(null);
        setDraft(emptyDraft());
        scrollToOperations();
    }, []);

    const handleStartEdit = useCallback((operation: PcOperation) => {
        setEditingId(operation.id);
        setDraft({
            date: operation.date,
            direction: operation.direction,
            category: operation.category,
            account: operation.account,
            amount: String(operation.amount),
            description: operation.description ?? '',
        });
        scrollToOperations();
    }, []);

    const handleAddToCell = useCallback((date: string, row: MatrixRowConfig) => {
        if (!row.direction) return;
        setEditingId(null);
        setDraft({
            ...emptyDraft(),
            date,
            direction: row.direction,
            category: resolveCategoryForDirection(row.direction, row.category),
        });
        scrollToOperations();
    }, []);

    const handleCancel = useCallback(() => {
        setDraft(null);
        setEditingId(null);
    }, []);

    const handleSave = useCallback(async () => {
        if (!draft) return;
        const payload = draftToPayload(draft);
        if (!payload) {
            alert('Укажите сумму больше нуля');
            return;
        }

        setSavingOperation(true);
        try {
            if (editingId === null) {
                const created = await createOperation(payload);
                // Локально добавляем операцию — матрица пересчитывается без
                // повторного тяжёлого запроса к бэкенду.
                applyOperations([...operations, created]);
            } else {
                const updated = await updateOperation(editingId, payload);
                applyOperations(operations.map(op => (op.id === editingId ? updated : op)));
            }
            setDraft(null);
            setEditingId(null);
            setError(null);
        } catch (err) {
            alert(errorMessage(err, 'Ошибка при сохранении операции'));
            console.error(err);
        } finally {
            setSavingOperation(false);
        }
    }, [draft, editingId, operations, createOperation, updateOperation, applyOperations, setSavingOperation]);

    const handleDelete = useCallback(async (id: number) => {
        if (!window.confirm('Удалить эту операцию?')) return;
        try {
            await deleteOperation(id);
            applyOperations(operations.filter(op => op.id !== id));
        } catch (err) {
            alert(errorMessage(err, 'Ошибка при удалении операции'));
            console.error(err);
        }
    }, [operations, deleteOperation, applyOperations]);

    const handleBalanceCommit = useCallback(async (account: PcAccount, rawValue: string) => {
        const trimmed = rawValue.trim();
        if (trimmed === '') return;
        const parsed = Number(trimmed.replace(',', '.'));
        if (Number.isNaN(parsed)) return;

        const currentOpening = balanceByAccount[account]?.opening;
        if (currentOpening !== undefined && Number(currentOpening) === parsed) return;

        try {
            await saveStartingBalance(account, parsed);
        } catch (err) {
            console.error('Ошибка сохранения стартового остатка:', err);
            alert('Не удалось сохранить стартовый остаток');
        }
    }, [balanceByAccount, saveStartingBalance]);

    const currentAccountClosing = balanceByAccount.CURRENT_ACCOUNT?.closing ?? 0;
    const cashAccountClosing = balanceByAccount.CASH?.closing ?? 0;

    return (
        <div className="report-container pc-container">
            <div className="pc-header">
                <div className="month-navigation-inline">
                    <button type="button" className="arrow-btn" onClick={handlePrev} title="Назад">&larr;</button>
                    <span className="month-label">{periodLabel}</span>
                    <button type="button" className="arrow-btn" onClick={handleNext} title="Вперёд">&rarr;</button>
                    <button type="button" className="pc-today-btn" onClick={handleToday}>Сегодня</button>
                </div>

                <div className="pc-header-right">
                    <div className="pc-mode-switcher" role="group" aria-label="Период календаря">
                        <button
                            type="button"
                            className={mode === 'MONTH' ? 'active' : ''}
                            onClick={() => setMode('MONTH')}
                        >
                            Месяц
                        </button>
                        <button
                            type="button"
                            className={mode === 'WEEK' ? 'active' : ''}
                            onClick={() => setMode('WEEK')}
                        >
                            Неделя
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="report-error pc-error">{error}</div>}
            {loading && <div className="report-loading pc-error">Загрузка данных...</div>}

            {period && (
                <div className="finance-summary-widgets-grid">
                    <div className="summary-widget income">
                        <span className="widget-title">Общий остаток</span>
                        <span className={`widget-amount ${period.totalClosing >= 0 ? 'pc-positive' : 'pc-negative'}`}>
                            {fmt(period.totalClosing)} BYN
                        </span>
                    </div>

                    <div className="summary-widget">
                        <span className="widget-title">Расчётный счёт</span>
                        <span className={`widget-amount ${currentAccountClosing >= 0 ? 'pc-positive' : 'pc-negative'}`}>
                            {fmt(currentAccountClosing)} BYN
                        </span>
                    </div>

                    <div className="summary-widget">
                        <span className="widget-title">Касса (BYN)</span>
                        <span className={`widget-amount ${cashAccountClosing >= 0 ? 'pc-positive' : 'pc-negative'}`}>
                            {fmt(cashAccountClosing)} BYN
                        </span>
                    </div>

                    <div className={`summary-widget expense${period.hasCashGap ? ' pc-gap-widget' : ''}`}>
                        <span className="widget-title">Кассовый разрыв</span>
                        <span className={`widget-amount ${period.hasCashGap ? 'pc-negative' : 'pc-positive'}`}>
                            {period.hasCashGap
                                ? `⚠ ЕСТЬ (${cashGapDaysCount} дн.)`
                                : 'НЕТ'}
                        </span>
                    </div>
                </div>
            )}

            {mode === 'MONTH' && (
                <div className="pc-starting-balances">
                    <span className="pc-sb-label">
                        Стартовые остатки ({monthLabel}):
                    </span>
                    {ACCOUNTS.map(account => (
                        <label key={account} className="pc-sb-item">
                            <span>{getAccountLabel(account)}:</span>
                            <input
                                type="number"
                                step="0.01"
                                value={startingBalances[account] ?? ''}
                                placeholder="0.00"
                                disabled={savingAccount === account}
                                onChange={e => setStartingBalances((prev: Record<string, string>) => ({
                                    ...prev,
                                    [account]: e.target.value,
                                }))}
                                onBlur={e => void handleBalanceCommit(account, e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        (e.currentTarget as HTMLInputElement).blur();
                                    }
                                }}
                                className="inline-input pc-sb-input"
                            />
                            <span className="pc-currency-tag">BYN</span>
                        </label>
                    ))}
                </div>
            )}

            {period && (
                <PaymentMatrix
                    period={period}
                    mode={mode}
                    onAddToCell={handleAddToCell}
                />
            )}

            <PaymentOperations
                operations={operations}
                loading={operationsLoading}
                saving={savingOperation}
                draft={draft}
                editingId={editingId}
                onDraftChange={handleDraftChange}
                onStartAdd={handleStartAdd}
                onStartEdit={handleStartEdit}
                onCancel={handleCancel}
                onSave={handleSave}
                onDelete={handleDelete}
            />
        </div>
    );
};

export default PaymentCalendar;
