import React, { useState, useMemo, useEffect, useCallback } from 'react';
import moment from 'moment';
import 'moment/locale/ru';
import DatePicker from 'react-datepicker';
import { ru } from 'date-fns/locale';
import { format } from 'date-fns';
import { reportAPI } from '../../services/reportApi';
import './FinanceReport.css';
import { FinanceRow } from "../../types/report";

type FinanceTotals = {
    income: number;
    utilities: number;
    rent: number;
    materials: number;
    credit: number;
    salary: number;
    taxes: number;
    advertising: number;
    other: number;
    totalExpense: number;
    finalBalance: number;
};

const calcFinanceTotals = (records: FinanceRow[], startingBalance: number): FinanceTotals => {
    const sums: FinanceTotals = {
        income: 0,
        utilities: 0,
        rent: 0,
        materials: 0,
        credit: 0,
        salary: 0,
        taxes: 0,
        advertising: 0,
        other: 0,
        totalExpense: 0,
        finalBalance: 0
    };

    records.forEach(r => {
        sums.income += (r.income || 0);
        sums.utilities += (r.expUtilities || 0);
        sums.rent += (r.expRent || 0);
        sums.materials += (r.expMaterials || 0);
        sums.credit += (r.expCredit || 0);
        sums.salary += (r.expSalary || 0);
        sums.taxes += (r.expTaxes || 0);
        sums.advertising += (r.expAdvertising || 0);
        sums.other += (r.expOther || 0);
    });

    sums.totalExpense = sums.utilities + sums.rent + sums.materials + sums.credit + sums.salary + sums.taxes + sums.advertising + sums.other;
    sums.finalBalance = startingBalance + sums.income - sums.totalExpense;

    return sums;
};

const FinanceReport: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [startingBalance, setStartingBalance] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<'NON_CASH' | 'CASH' | 'REPORT'>('NON_CASH');
    const [records, setRecords] = useState<FinanceRow[]>([]);

    const [reportData, setReportData] = useState<{
        nonCash: { records: FinanceRow[]; startingBalance: number };
        cash: { records: FinanceRow[]; startingBalance: number };
    }>({
        nonCash: { records: [], startingBalance: 0 },
        cash: { records: [], startingBalance: 0 }
    });
    const [reportLoading, setReportLoading] = useState<boolean>(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [newRow, setNewRow] = useState<FinanceRow>({
        date: format(new Date(), "yyyy-MM-dd"),
        income: 0,
        expUtilities: 0,
        expRent: 0,
        expMaterials: 0,
        expCredit: 0,
        expSalary: 0,
        expTaxes: 0,
        expAdvertising: 0,
        expOther: 0
    });

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<FinanceRow | null>(null);

    const monthLabel = useMemo(() => moment(currentDate).locale('ru').format('MMMM YYYY').toUpperCase(), [currentDate]);

    const fetchFinanceData = useCallback(async (date: Date, type: 'NON_CASH' | 'CASH') => {
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

            const [nonCashRes, cashRes] = await Promise.all([
                reportAPI.getFinanceSummary(year, month, 'NON_CASH'),
                reportAPI.getFinanceSummary(year, month, 'CASH'),
            ]);

            setReportData({
                nonCash: {
                    records: nonCashRes.data.records || [],
                    startingBalance: nonCashRes.data.startingBalance || 0
                },
                cash: {
                    records: cashRes.data.records || [],
                    startingBalance: cashRes.data.startingBalance || 0
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

    const nonCashTotals = useMemo(
        () => calcFinanceTotals(reportData.nonCash.records, reportData.nonCash.startingBalance),
        [reportData.nonCash]
    );
    const cashTotals = useMemo(
        () => calcFinanceTotals(reportData.cash.records, reportData.cash.startingBalance),
        [reportData.cash]
    );
    const combinedTotals = useMemo(() => ({
        income: nonCashTotals.income + cashTotals.income,
        utilities: nonCashTotals.utilities + cashTotals.utilities,
        rent: nonCashTotals.rent + cashTotals.rent,
        materials: nonCashTotals.materials + cashTotals.materials,
        credit: nonCashTotals.credit + cashTotals.credit,
        salary: nonCashTotals.salary + cashTotals.salary,
        taxes: nonCashTotals.taxes + cashTotals.taxes,
        advertising: nonCashTotals.advertising + cashTotals.advertising,
        other: nonCashTotals.other + cashTotals.other,
        totalExpense: nonCashTotals.totalExpense + cashTotals.totalExpense,
        finalBalance: nonCashTotals.finalBalance + cashTotals.finalBalance,
    }), [nonCashTotals, cashTotals]);

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
            setNewRow({
                date: format(new Date(), "yyyy-MM-dd"),
                income: 0,
                expUtilities: 0,
                expRent: 0,
                expMaterials: 0,
                expCredit: 0,
                expSalary: 0,
                expTaxes: 0,
                expAdvertising: 0,
                expOther: 0
            });
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

                {/* Переключатель Нал / Безнал */}
                <div className="compact-type-switcher" style={{
                    display: 'inline-flex',
                    background: '#2d2d2d',
                    padding: '3px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('NON_CASH')}
                        style={{
                            background: activeTab === 'NON_CASH' ? 'var(--primary-green)' : 'transparent',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: activeTab === 'NON_CASH' ? 'bold' : 'normal',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>💳</span> Безналичные
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('CASH')}
                        style={{
                            background: activeTab === 'CASH' ? 'var(--primary-green)' : 'transparent',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: activeTab === 'CASH' ? 'bold' : 'normal',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>💵</span> Наличные
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('REPORT')}
                        style={{
                            background: activeTab === 'REPORT' ? 'var(--primary-green)' : 'transparent',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: activeTab === 'REPORT' ? 'bold' : 'normal',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
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

                {/* Общий итоговый баланс (не показываем на вкладке отчёта, там свой блок балансов) */}
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
                            <span className="widget-title">Баланс безнал</span>
                            <span className="widget-amount" style={{ color: nonCashTotals.finalBalance >= 0 ? 'var(--primary-green)' : 'var(--error-red)' }}>
                                {nonCashTotals.finalBalance.toFixed(2)}
                            </span>
                        </div>
                        <div className="summary-widget expense">
                            <span className="widget-title">Баланс нал</span>
                            <span className="widget-amount" style={{ color: cashTotals.finalBalance >= 0 ? 'var(--primary-green)' : 'var(--error-red)' }}>
                                {cashTotals.finalBalance.toFixed(2)}
                            </span>
                        </div>
                        <div className="summary-widget income">
                            <span className="widget-title">Общий баланс</span>
                            <span className="widget-amount" style={{ color: combinedTotals.finalBalance >= 0 ? 'var(--primary-green)' : 'var(--error-red)' }}>
                                {combinedTotals.finalBalance.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* СВОДНАЯ ТАБЛИЦА ПО СТАТЬЯМ */}
                    <div className="table-wrapper no-border-radius-bottom" style={{ marginTop: '20px' }}>
                        <table className="report-table salary-log-table">
                            <thead>
                            <tr>
                                <th style={{ width: '34%' }}>Статья</th>
                                <th style={{ width: '22%' }}>Наличные</th>
                                <th style={{ width: '22%' }}>Безналичные</th>
                                <th style={{ width: '22%' }}>Итого</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <td className="text-left-aligned">Приход</td>
                                <td>{cashTotals.income.toFixed(2)}</td>
                                <td>{nonCashTotals.income.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.income.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="text-left-aligned">Коммуналка</td>
                                <td>{cashTotals.utilities.toFixed(2)}</td>
                                <td>{nonCashTotals.utilities.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.utilities.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="text-left-aligned">Аренда</td>
                                <td>{cashTotals.rent.toFixed(2)}</td>
                                <td>{nonCashTotals.rent.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.rent.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="text-left-aligned">Материалы</td>
                                <td>{cashTotals.materials.toFixed(2)}</td>
                                <td>{nonCashTotals.materials.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.materials.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="text-left-aligned">Кредит</td>
                                <td>{cashTotals.credit.toFixed(2)}</td>
                                <td>{nonCashTotals.credit.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.credit.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="text-left-aligned">З/п</td>
                                <td>{cashTotals.salary.toFixed(2)}</td>
                                <td>{nonCashTotals.salary.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.salary.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="text-left-aligned">Налоги</td>
                                <td>{cashTotals.taxes.toFixed(2)}</td>
                                <td>{nonCashTotals.taxes.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.taxes.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="text-left-aligned">Реклама</td>
                                <td>{cashTotals.advertising.toFixed(2)}</td>
                                <td>{nonCashTotals.advertising.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.advertising.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="text-left-aligned">Прочее</td>
                                <td>{cashTotals.other.toFixed(2)}</td>
                                <td>{nonCashTotals.other.toFixed(2)}</td>
                                <td className="text-right-aligned">{combinedTotals.other.toFixed(2)}</td>
                            </tr>
                            <tr style={{ fontWeight: 700 }}>
                                <td className="text-left-aligned">Итого расход</td>
                                <td>{cashTotals.totalExpense.toFixed(2)}</td>
                                <td>{nonCashTotals.totalExpense.toFixed(2)}</td>
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
                {activeTab === 'NON_CASH' && <div className="summary-widget expense"><span className="widget-title">Коммуналка</span><span className="widget-amount">{totals.utilities.toFixed(2)}</span></div>}
                {activeTab === 'NON_CASH' && <div className="summary-widget expense"><span className="widget-title">Аренда</span><span className="widget-amount">{totals.rent.toFixed(2)}</span></div>}
                <div className="summary-widget expense"><span className="widget-title">Материалы</span><span className="widget-amount">{totals.materials.toFixed(2)}</span></div>
                {activeTab === 'NON_CASH' && <div className="summary-widget expense"><span className="widget-title">Кредит</span><span className="widget-amount">{totals.credit.toFixed(2)}</span></div>}
                <div className="summary-widget expense"><span className="widget-title">З/п</span><span className="widget-amount">{totals.salary.toFixed(2)}</span></div>
                {activeTab === 'NON_CASH' && <div className="summary-widget expense"><span className="widget-title">Налоги</span><span className="widget-amount">{totals.taxes.toFixed(2)}</span></div>}
                {activeTab === 'NON_CASH' && <div className="summary-widget expense"><span className="widget-title">Реклама</span><span className="widget-amount">{totals.advertising.toFixed(2)}</span></div>}
                <div className="summary-widget expense"><span className="widget-title">Прочее</span><span className="widget-amount">{totals.other.toFixed(2)}</span></div>
            </div>

            {/* ТАБЛИЦА */}
            <div className="table-wrapper no-border-radius-bottom" style={{ marginTop: '20px' }}>
                <table className="report-table salary-log-table">
                    <thead>
                    <tr>
                        <th rowSpan={2} style={{ width: '10%', verticalAlign: 'middle' }}>Дата</th>
                        <th rowSpan={2} style={{ width: '12%', verticalAlign: 'middle' }}>Приход</th>
                        {/* colSpan: 3 для наличных, 8 для безналичных */}
                        <th colSpan={activeTab === 'CASH' ? 3 : 8} style={{ width: '60%' }}>Расход</th>
                        <th rowSpan={2} style={{ width: '18%', verticalAlign: 'middle' }}>Действия</th>
                    </tr>
                    <tr>
                        {activeTab === 'NON_CASH' && <th>Коммуналка</th>}
                        {activeTab === 'NON_CASH' && <th>Аренда</th>}
                        <th>Материалы</th>
                        {activeTab === 'NON_CASH' && <th>Кредит</th>}
                        <th>З/п</th>
                        {activeTab === 'NON_CASH' && <th>Налоги</th>}
                        {activeTab === 'NON_CASH' && <th>Реклама</th>}
                        <th>Прочее</th>
                    </tr>
                    </thead>
                    <tbody>
                    {records.map((record, index) => {
                        const isEditing = record.id === editingId;

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
                                    {activeTab === 'NON_CASH' && <td><input type="number" value={editRow.expUtilities || ''} onChange={e => setEditRow({ ...editRow, expUtilities: Number(e.target.value) })} className="inline-input" /></td>}
                                    {activeTab === 'NON_CASH' && <td><input type="number" value={editRow.expRent || ''} onChange={e => setEditRow({ ...editRow, expRent: Number(e.target.value) })} className="inline-input" /></td>}
                                    <td><input type="number" value={editRow.expMaterials || ''} onChange={e => setEditRow({ ...editRow, expMaterials: Number(e.target.value) })} className="inline-input" /></td>
                                    {activeTab === 'NON_CASH' && <td><input type="number" value={editRow.expCredit || ''} onChange={e => setEditRow({ ...editRow, expCredit: Number(e.target.value) })} className="inline-input" /></td>}
                                    <td><input type="number" value={editRow.expSalary || ''} onChange={e => setEditRow({ ...editRow, expSalary: Number(e.target.value) })} className="inline-input" /></td>
                                    {activeTab === 'NON_CASH' && <td><input type="number" value={editRow.expTaxes || ''} onChange={e => setEditRow({ ...editRow, expTaxes: Number(e.target.value) })} className="inline-input" /></td>}
                                    {activeTab === 'NON_CASH' && <td><input type="number" value={editRow.expAdvertising || ''} onChange={e => setEditRow({ ...editRow, expAdvertising: Number(e.target.value) })} className="inline-input" /></td>}
                                    <td><input type="number" value={editRow.expOther || ''} onChange={e => setEditRow({ ...editRow, expOther: Number(e.target.value) })} className="inline-input" /></td>
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
                                {activeTab === 'NON_CASH' && <td>{record.expUtilities > 0 ? record.expUtilities : ''}</td>}
                                {activeTab === 'NON_CASH' && <td>{record.expRent > 0 ? record.expRent : ''}</td>}
                                <td>{record.expMaterials > 0 ? record.expMaterials : ''}</td>
                                {activeTab === 'NON_CASH' && <td>{record.expCredit > 0 ? record.expCredit : ''}</td>}
                                <td>{record.expSalary > 0 ? record.expSalary : ''}</td>
                                {activeTab === 'NON_CASH' && <td>{record.expTaxes > 0 ? record.expTaxes : ''}</td>}
                                {activeTab === 'NON_CASH' && <td>{(record.expAdvertising || 0) > 0 ? record.expAdvertising : ''}</td>}
                                <td>{record.expOther > 0 ? record.expOther : ''}</td>
                                <td className="action-icons-cell">
                                    <button onClick={() => handleStartEdit(record)} className="icon-btn edit-icon" title="Редактировать">✏️</button>
                                    <button onClick={() => record.id && handleDeleteRecord(record.id)} className="icon-btn delete-icon" title="Удалить">🗑️</button>
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
                            {activeTab === 'NON_CASH' && <td><input type="number" value={newRow.expUtilities || ''} onChange={e => setNewRow({ ...newRow, expUtilities: Number(e.target.value) })} className="inline-input" /></td>}
                            {activeTab === 'NON_CASH' && <td><input type="number" value={newRow.expRent || ''} onChange={e => setNewRow({ ...newRow, expRent: Number(e.target.value) })} className="inline-input" /></td>}
                            <td><input type="number" value={newRow.expMaterials || ''} onChange={e => setNewRow({ ...newRow, expMaterials: Number(e.target.value) })} className="inline-input" /></td>
                            {activeTab === 'NON_CASH' && <td><input type="number" value={newRow.expCredit || ''} onChange={e => setNewRow({ ...newRow, expCredit: Number(e.target.value) })} className="inline-input" /></td>}
                            <td><input type="number" value={newRow.expSalary || ''} onChange={e => setNewRow({ ...newRow, expSalary: Number(e.target.value) })} className="inline-input" /></td>
                            {activeTab === 'NON_CASH' && <td><input type="number" value={newRow.expTaxes || ''} onChange={e => setNewRow({ ...newRow, expTaxes: Number(e.target.value) })} className="inline-input" /></td>}
                            {activeTab === 'NON_CASH' && <td><input type="number" value={newRow.expAdvertising || ''} onChange={e => setNewRow({ ...newRow, expAdvertising: Number(e.target.value) })} className="inline-input" /></td>}
                            <td><input type="number" value={newRow.expOther || ''} onChange={e => setNewRow({ ...newRow, expOther: Number(e.target.value) })} className="inline-input" /></td>
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