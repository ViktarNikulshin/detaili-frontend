import React, { useState, useMemo, useEffect, useCallback } from 'react';
import moment from 'moment';
import 'moment/locale/ru';
import DatePicker from 'react-datepicker';
import { ru } from 'date-fns/locale';
import { format } from 'date-fns';
import { reportAPI } from '../../services/reportApi';
import './FinanceReport.css';
import { FinanceRow } from "../../types/report";

type FinanceTabType = 'NON_CASH' | 'CASH' | 'CURRENT_ACCOUNT';
type ActiveTab = FinanceTabType | 'REPORT';

type ExpenseKey =
    | 'expUtilities'
    | 'expRent'
    | 'expMaterials'
    | 'expCredit'
    | 'expSalary'
    | 'expTaxes'
    | 'expAdvertising'
    | 'expPartners'
    | 'expCurrentAccount'
    | 'expOther';

const EXPENSE_FIELDS: { key: ExpenseKey; label: string }[] = [
    { key: 'expUtilities', label: 'Коммуналка' },
    { key: 'expRent', label: 'Аренда' },
    { key: 'expMaterials', label: 'Материалы' },
    { key: 'expCredit', label: 'Кредит' },
    { key: 'expSalary', label: 'З/п' },
    { key: 'expTaxes', label: 'Налоги' },
    { key: 'expAdvertising', label: 'Реклама' },
    { key: 'expPartners', label: 'Партнеры' },
    { key: 'expCurrentAccount', label: 'Текущий счёт' },
    { key: 'expOther', label: 'Прочее' },
];

// В сводном отчёте перевод на текущий счёт — внутренняя операция, не расход
const REPORT_EXPENSE_FIELDS = EXPENSE_FIELDS.filter(f => f.key !== 'expCurrentAccount');

const TAB_FIELDS: Record<FinanceTabType, ExpenseKey[]> = {
    NON_CASH: ['expUtilities', 'expRent', 'expMaterials', 'expCredit', 'expSalary', 'expTaxes', 'expAdvertising', 'expCurrentAccount', 'expOther'],
    CASH: ['expMaterials', 'expSalary', 'expPartners', 'expOther'],
    CURRENT_ACCOUNT: ['expUtilities', 'expRent', 'expMaterials', 'expCredit', 'expSalary', 'expTaxes', 'expAdvertising', 'expOther'],
};

const TAB_LABELS: Record<FinanceTabType, { icon: string; label: string }> = {
    NON_CASH: { icon: '💳', label: 'Карт-счёт' },
    CASH: { icon: '💵', label: 'Наличные' },
    CURRENT_ACCOUNT: { icon: '🏦', label: 'Текущий счёт' },
};

const emptyRow = (): FinanceRow => ({
    date: format(new Date(), "yyyy-MM-dd"),
    income: 0,
    expUtilities: 0,
    expRent: 0,
    expMaterials: 0,
    expCredit: 0,
    expSalary: 0,
    expTaxes: 0,
    expAdvertising: 0,
    expPartners: 0,
    expOther: 0,
    expCurrentAccount: 0
});

type FinanceTotals = {
    income: number;
    expenses: Record<ExpenseKey, number>;
    totalExpense: number;
    finalBalance: number;
};

const emptyExpenses = (): Record<ExpenseKey, number> => ({
    expUtilities: 0,
    expRent: 0,
    expMaterials: 0,
    expCredit: 0,
    expSalary: 0,
    expTaxes: 0,
    expAdvertising: 0,
    expPartners: 0,
    expCurrentAccount: 0,
    expOther: 0
});

const calcFinanceTotals = (
    records: FinanceRow[],
    startingBalance: number,
    fields: { key: ExpenseKey; label: string }[] = EXPENSE_FIELDS,
    includeAutoIncome: boolean = true
): FinanceTotals => {
    const expenses = emptyExpenses();
    let income = 0;

    records.forEach(r => {
        // Авто-приход в текущем счёте — это перевод, а не реальный доход
        const isAutoIncome = !includeAutoIncome && r.sourceRecordId != null;
        if (!isAutoIncome) {
            income += (r.income || 0);
        }
        fields.forEach(({ key }) => {
            expenses[key] += (Number(r[key]) || 0);
        });
    });

    const totalExpense = fields.reduce((sum, { key }) => sum + expenses[key], 0);

    return {
        income,
        expenses,
        totalExpense,
        finalBalance: startingBalance + income - totalExpense
    };
};

const combineTotals = (...totals: FinanceTotals[]): FinanceTotals => {
    const expenses = emptyExpenses();
    let income = 0;
    let totalExpense = 0;
    let finalBalance = 0;

    totals.forEach(t => {
        income += t.income;
        totalExpense += t.totalExpense;
        finalBalance += t.finalBalance;
        EXPENSE_FIELDS.forEach(({ key }) => {
            expenses[key] += t.expenses[key];
        });
    });

    return { income, expenses, totalExpense, finalBalance };
};

const FinanceReport: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [startingBalance, setStartingBalance] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<ActiveTab>('NON_CASH');
    const [records, setRecords] = useState<FinanceRow[]>([]);

    const [reportData, setReportData] = useState<{
        nonCash: { records: FinanceRow[]; startingBalance: number };
        cash: { records: FinanceRow[]; startingBalance: number };
        currentAccount: { records: FinanceRow[]; startingBalance: number };
    }>({
        nonCash: { records: [], startingBalance: 0 },
        cash: { records: [], startingBalance: 0 },
        currentAccount: { records: [], startingBalance: 0 }
    });
    const [reportLoading, setReportLoading] = useState<boolean>(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [newRow, setNewRow] = useState<FinanceRow>(emptyRow());

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<FinanceRow | null>(null);

    const monthLabel = useMemo(() => moment(currentDate).locale('ru').format('MMMM YYYY').toUpperCase(), [currentDate]);

    const fetchFinanceData = useCallback(async (date: Date, type: FinanceTabType) => {
        try {
            setLoading(true);
            const year = moment(date).year();
            const month = moment(date).month() + 1;

            const response = await reportAPI.getFinanceSummary(year, month, type);

            setRecords(response.data.records || []);
            setStartingBalance(response.data.startingBalance || 0);
            setError(null);
        } catch (err) {
            setError('Не удалось загрузить отчет.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchReportData = useCallback(async (date: Date) => {
        try {
            setReportLoading(true);
            const year = moment(date).year();
            const month = moment(date).month() + 1;

            const [nonCashRes, cashRes, currentAccountRes] = await Promise.all([
                reportAPI.getFinanceSummary(year, month, 'NON_CASH'),
                reportAPI.getFinanceSummary(year, month, 'CASH'),
                reportAPI.getFinanceSummary(year, month, 'CURRENT_ACCOUNT'),
            ]);

            setReportData({
                nonCash: {
                    records: nonCashRes.data.records || [],
                    startingBalance: nonCashRes.data.startingBalance || 0
                },
                cash: {
                    records: cashRes.data.records || [],
                    startingBalance: cashRes.data.startingBalance || 0
                },
                currentAccount: {
                    records: currentAccountRes.data.records || [],
                    startingBalance: currentAccountRes.data.startingBalance || 0
                }
            });
            setReportError(null);
        } catch (err) {
            setReportError('Не удалось загрузить сводный отчет.');
        } finally {
            setReportLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'REPORT') {
            fetchReportData(currentDate);
        } else {
            fetchFinanceData(currentDate, activeTab);
        }
    }, [currentDate, activeTab, fetchFinanceData, fetchReportData]);

    const handleSaveBalance = async () => {
        if (activeTab === 'REPORT') return;
        try {
            const year = moment(currentDate).year();
            const month = moment(currentDate).month() + 1;
            await reportAPI.saveFinanceBalance(year, month, startingBalance, activeTab);
        } catch (err) {
            console.error('Ошибка при сохранении начального баланса:', err);
            alert('Не удалось сохранить начальный баланс');
        }
    };

    const totals = useMemo(() => calcFinanceTotals(records, startingBalance), [records, startingBalance]);

    // Виджеты балансов считаем по фактическим операциям (перевод не искажает баланс счёта)
    const nonCashBalance = useMemo(
        () => calcFinanceTotals(reportData.nonCash.records, reportData.nonCash.startingBalance),
        [reportData.nonCash]
    );
    const cashBalance = useMemo(
        () => calcFinanceTotals(reportData.cash.records, reportData.cash.startingBalance),
        [reportData.cash]
    );
    const currentAccountBalance = useMemo(
        () => calcFinanceTotals(reportData.currentAccount.records, reportData.currentAccount.startingBalance),
        [reportData.currentAccount]
    );
    const combinedBalance = useMemo(
        () => combineTotals(nonCashBalance, cashBalance, currentAccountBalance),
        [nonCashBalance, cashBalance, currentAccountBalance]
    );

    // Таблица отчёта: перевод на текущий счёт и авто-приход исключены, чтобы не задваивать суммы
    const nonCashTotals = useMemo(
        () => calcFinanceTotals(reportData.nonCash.records, reportData.nonCash.startingBalance, REPORT_EXPENSE_FIELDS),
        [reportData.nonCash]
    );
    const cashTotals = useMemo(
        () => calcFinanceTotals(reportData.cash.records, reportData.cash.startingBalance, REPORT_EXPENSE_FIELDS),
        [reportData.cash]
    );
    const currentAccountTotals = useMemo(
        () => calcFinanceTotals(reportData.currentAccount.records, reportData.currentAccount.startingBalance, REPORT_EXPENSE_FIELDS, false),
        [reportData.currentAccount]
    );
    const combinedTotals = useMemo(
        () => combineTotals(nonCashTotals, cashTotals, currentAccountTotals),
        [nonCashTotals, cashTotals, currentAccountTotals]
    );

    const handlePrevMonth = () => setCurrentDate(prev => moment(prev).subtract(1, 'month').toDate());
    const handleNextMonth = () => setCurrentDate(prev => moment(prev).add(1, 'month').toDate());

    const handleStartEdit = (record: FinanceRow) => {
        setEditingId(record.id || null);
        setEditRow({ ...record });
        setIsAdding(false);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditRow(null);
    };

    const handleSaveEdit = async () => {
        if (!editRow || !editRow.id) return;
        if (activeTab === 'REPORT') return;
        try {
            await reportAPI.saveFinanceRecord({ ...editRow, financeType: activeTab });
            await fetchFinanceData(currentDate, activeTab);
            setEditingId(null);
            setEditRow(null);
        } catch (err) {
            alert('Ошибка при изменении записи');
            console.error(err);
        }
    };

    const handleSaveNewRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === 'REPORT') return;
        try {
            await reportAPI.saveFinanceRecord({ ...newRow, financeType: activeTab });
            await fetchFinanceData(currentDate, activeTab);
            setIsAdding(false);
            setNewRow(emptyRow());
        } catch (err) {
            alert('Ошибка при добавлении записи');
            console.error(err);
        }
    };

    const handleDeleteRecord = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить эту операцию?')) return;
        if (activeTab === 'REPORT') return;
        try {
            await reportAPI.deleteFinanceRecord(id);
            await fetchFinanceData(currentDate, activeTab);
        } catch (err) {
            alert('Ошибка при удалении записи');
            console.error(err);
        }
    };

    const visibleFields = activeTab === 'REPORT' ? [] : TAB_FIELDS[activeTab];

    const tabButtonStyle = (tab: ActiveTab): React.CSSProperties => ({
        background: activeTab === tab ? 'var(--primary-green)' : 'transparent',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 14px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: activeTab === tab ? 'bold' : 'normal',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    });

    return (
        <div className="report-container salary-logging-container">

            {/* СТРОКА НАВИГАЦИИ, ПЕРЕКЛЮЧАТЕЛЯ И БАЛАНСОВ */}
            <div className="salary-filters" style={{ gap: '20px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>

                {/* Навигация по месяцам */}
                <div className="month-navigation-inline" style={{ margin: 0 }}>
                    <button className="arrow-btn" onClick={handlePrevMonth}> &larr; </button>
                    <span className="month-label" style={{ minWidth: '150px', textAlign: 'center' }}>{monthLabel}</span>
                    <button className="arrow-btn" onClick={handleNextMonth}> &rarr; </button>
                </div>

                {/* Переключатель счетов */}
                <div className="compact-type-switcher" style={{
                    display: 'inline-flex',
                    background: '#2d2d2d',
                    padding: '3px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    {(Object.keys(TAB_LABELS) as FinanceTabType[]).map(tab => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            style={tabButtonStyle(tab)}
                        >
                            <span>{TAB_LABELS[tab].icon}</span> {TAB_LABELS[tab].label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setActiveTab('REPORT')}
                        style={tabButtonStyle('REPORT')}
                    >
                        <span>📊</span> Отчет
                    </button>
                </div>

                {/* Начальный баланс (не показываем на вкладке отчёта) */}
                {activeTab !== 'REPORT' && (
                    <div className="previous-balance-container" style={{ margin: 0 }}>
                        <label style={{ marginRight: '8px' }}>Начальный баланс:</label>
                        <input
                            type="number"
                            value={startingBalance}
                            onChange={(e) => setStartingBalance(Number(e.target.value) || 0)}
                            onBlur={handleSaveBalance}
                            className="previous-balance-input"
                            style={{ width: '100px', textAlign: 'center' }}
                        />
                    </div>
                )}

                {/* Общий итоговый баланс (не показываем на вкладке отчёта) */}
                {activeTab !== 'REPORT' && (
                    <div className="total-salary-display" style={{ margin: 0 }}>
                        <span className="total-label">ОБЩИЙ БАЛАНС:</span>
                        <span className="total-value" style={{ marginLeft: '8px', color: totals.finalBalance >= 0 ? 'var(--primary-green)' : 'var(--error-red)' }}>
                            {totals.finalBalance.toFixed(2)} ₽
                        </span>
                    </div>
                )}
            </div>

            {activeTab === 'REPORT' ? (
                <>
                    {/* Индикаторы загрузки и ошибок для отчёта */}
                    {reportError && <div className="report-error" style={{ marginTop: '15px' }}>{reportError}</div>}
                    {reportLoading && <div className="report-loading" style={{ marginTop: '15px' }}>Загрузка данных...</div>}

                    {/* ИТОГОВЫЕ БАЛАНСЫ ПО ТИПАМ */}
                    <div className="finance-summary-widgets-grid" style={{ marginTop: '20px' }}>
                        <div className="summary-widget expense">
                            <span className="widget-title">Баланс карт-счёт</span>
                            <span className="widget-amount" style={{ color: nonCashBalance.finalBalance >= 0 ? 'var(--primary-green)' : 'var(--error-red)' }}>
                                {nonCashBalance.finalBalance.toFixed(2)}
                            </span>
                        </div>
                        <div className="summary-widget expense">
                            <span className="widget-title">Баланс нал</span>
                            <span className="widget-amount" style={{ color: cashBalance.finalBalance >= 0 ? 'var(--primary-green)' : 'var(--error-red)' }}>
                                {cashBalance.finalBalance.toFixed(2)}
                            </span>
                        </div>
                        <div className="summary-widget expense">
                            <span className="widget-title">Баланс текущий счёт</span>
                            <span className="widget-amount" style={{ color: currentAccountBalance.finalBalance >= 0 ? 'var(--primary-green)' : 'var(--error-red)' }}>
                                {currentAccountBalance.finalBalance.toFixed(2)}
                            </span>
                        </div>
                        <div className="summary-widget income">
                            <span className="widget-title">Общий баланс</span>
                            <span className="widget-amount" style={{ color: combinedBalance.finalBalance >= 0 ? 'var(--primary-green)' : 'var(--error-red)' }}>
                                {combinedBalance.finalBalance.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* СВОДНАЯ ТАБЛИЦА ПО СТАТЬЯМ */}
                    <div className="table-wrapper no-border-radius-bottom" style={{ marginTop: '20px' }}>
                        <table className="report-table salary-log-table">
                            <thead>
                            <tr>
                                <th style={{ width: '28%' }}>Статья</th>
                                <th style={{ width: '18%' }}>Наличные</th>
                                <th style={{ width: '18%' }}>Карт-счёт</th>
                                <th style={{ width: '18%' }}>Текущий счёт</th>
                                <th style={{ width: '18%' }}>Итого</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <td className="text-left-aligned">Приход</td>
                                <td>{cashTotals.income.toFixed(2)}</td>
                                <td>{nonCashTotals.income.toFixed(2)}</td>
                                <td>{currentAccountTotals.income.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.income.toFixed(2)}</td>
                            </tr>
                            {REPORT_EXPENSE_FIELDS.map(({ key, label }) => (
                                <tr key={key}>
                                    <td className="text-left-aligned">{label}</td>
                                    <td>{cashTotals.expenses[key].toFixed(2)}</td>
                                    <td>{nonCashTotals.expenses[key].toFixed(2)}</td>
                                    <td>{currentAccountTotals.expenses[key].toFixed(2)}</td>
                                    <td className="text-right-aligned">{combinedTotals.expenses[key].toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 700 }}>
                                <td className="text-left-aligned">Итого расход</td>
                                <td>{cashTotals.totalExpense.toFixed(2)}</td>
                                <td>{nonCashTotals.totalExpense.toFixed(2)}</td>
                                <td>{currentAccountTotals.totalExpense.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.totalExpense.toFixed(2)}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
            <>

            {/* Индикаторы загрузки и ошибок */}
            {error && <div className="report-error" style={{ marginTop: '15px' }}>{error}</div>}
            {loading && <div className="report-loading" style={{ marginTop: '15px' }}>Загрузка данных...</div>}

            {/* СВОДНЫЕ ВИДЖЕТЫ */}
            <div className="finance-summary-widgets-grid" style={{ marginTop: '20px' }}>
                <div className="summary-widget income"><span className="widget-title">Приход</span><span className="widget-amount">+{totals.income.toFixed(2)}</span></div>
                {visibleFields.map(key => {
                    const label = EXPENSE_FIELDS.find(f => f.key === key)?.label || key;
                    return (
                        <div key={key} className="summary-widget expense">
                            <span className="widget-title">{label}</span>
                            <span className="widget-amount">{totals.expenses[key].toFixed(2)}</span>
                        </div>
                    );
                })}
            </div>

            {/* ТАБЛИЦА */}
            <div className="table-wrapper no-border-radius-bottom" style={{ marginTop: '20px' }}>
                <table className="report-table salary-log-table">
                    <thead>
                    <tr>
                        <th rowSpan={2} style={{ width: '10%', verticalAlign: 'middle' }}>Дата</th>
                        <th rowSpan={2} style={{ width: '12%', verticalAlign: 'middle' }}>Приход</th>
                        <th colSpan={visibleFields.length} style={{ width: '60%' }}>Расход</th>
                        <th rowSpan={2} style={{ width: '18%', verticalAlign: 'middle' }}>Действия</th>
                    </tr>
                    <tr>
                        {visibleFields.map(key => (
                            <th key={key}>{EXPENSE_FIELDS.find(f => f.key === key)?.label || key}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {records.map((record, index) => {
                        const isEditing = record.id === editingId;
                        const isAuto = record.sourceRecordId != null;

                        if (isEditing && editRow) {
                            return (
                                <tr key={record.id || index} className="editable-row">
                                    <td>
                                        <DatePicker
                                            selected={moment(editRow.date).toDate()}
                                            locale={ru}
                                            onChange={(date: Date | null) => date && setEditRow({ ...editRow, date: format(date, "yyyy-MM-dd") })}
                                            dateFormat="dd.MM.yyyy"
                                            className="inline-input"
                                        />
                                    </td>
                                    <td><input type="number" value={editRow.income || ''} onChange={e => setEditRow({ ...editRow, income: Number(e.target.value) })} className="inline-input" /></td>
                                    {visibleFields.map(key => (
                                        <td key={key}>
                                            <input
                                                type="number"
                                                value={Number(editRow[key]) || ''}
                                                onChange={e => setEditRow({ ...editRow, [key]: Number(e.target.value) })}
                                                className="inline-input"
                                            />
                                        </td>
                                    ))}
                                    <td className="action-icons-cell">
                                        <button onClick={handleSaveEdit} className="icon-btn save-icon" title="Сохранить">💾</button>
                                        <button onClick={handleCancelEdit} className="icon-btn cancel-icon" title="Отмена">❌</button>
                                    </td>
                                </tr>
                            );
                        }

                        return (
                            <tr key={record.id || index}>
                                <td>{moment(record.date).format('DD.MM.YYYY')}</td>
                                <td style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{record.income > 0 ? record.income : ''}</td>
                                {visibleFields.map(key => (
                                    <td key={key}>{Number(record[key]) > 0 ? record[key] : ''}</td>
                                ))}
                                <td className="action-icons-cell">
                                    {isAuto ? (
                                        <span className="text-muted" title="Создано автоматически из статьи «Текущий счёт» карт-счёта">🔗 авто</span>
                                    ) : (
                                        <>
                                            <button onClick={() => handleStartEdit(record)} className="icon-btn edit-icon" title="Редактировать">✏️</button>
                                            <button onClick={() => record.id && handleDeleteRecord(record.id)} className="icon-btn delete-icon" title="Удалить">🗑️</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        );
                    })}

                    {/* ДОБАВЛЕНИЕ СТРОКИ */}
                    {isAdding && (
                        <tr className="editable-row">
                            <td>
                                <DatePicker
                                    selected={moment(newRow.date).toDate()}
                                    locale={ru}
                                    onChange={(date: Date | null) => date && setNewRow({ ...newRow, date: format(date, "yyyy-MM-dd") })}
                                    dateFormat="dd.MM.yyyy"
                                    className="inline-input"
                                />
                            </td>
                            <td><input type="number" value={newRow.income || ''} onChange={e => setNewRow({ ...newRow, income: Number(e.target.value) })} className="inline-input" /></td>
                            {visibleFields.map(key => (
                                <td key={key}>
                                    <input
                                        type="number"
                                        value={Number(newRow[key]) || ''}
                                        onChange={e => setNewRow({ ...newRow, [key]: Number(e.target.value) })}
                                        className="inline-input"
                                    />
                                </td>
                            ))}
                            <td className="action-icons-cell"><span className="text-muted">новая</span></td>
                        </tr>
                    )}

                    </tbody>
                </table>
            </div>

            {/* КНОПКИ УПРАВЛЕНИЯ */}
            {!isAdding && editingId === null ? (
                <button className="add-row-green-btn" onClick={() => setIsAdding(true)}>
                    Добавить операцию <span className="plus-icon">+</span>
                </button>
            ) : (
                <div className="action-buttons-container">
                    {isAdding ? (
                        <button className="add-row-green-btn save-btn" onClick={handleSaveNewRecord}>
                            Сохранить новую операцию
                        </button>
                    ) : (
                        <button className="add-row-green-btn save-btn" onClick={handleSaveEdit}>
                            Сохранить изменения
                        </button>
                    )}
                    <button className="add-row-green-btn cancel-btn" onClick={() => { setIsAdding(false); handleCancelEdit(); }}>
                        Отмена
                    </button>
                </div>
            )}
            </>
            )}
        </div>
    );
};

export default FinanceReport;
