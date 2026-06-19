import React, { useState, useMemo, useEffect, useCallback } from 'react';
import moment from 'moment';
import 'moment/locale/ru';
import DatePicker from 'react-datepicker';
import { ru } from 'date-fns/locale';
import { format } from 'date-fns';
import { reportAPI } from '../../services/reportApi';
import './ActsAnalytics.css';

interface ActRow {
    id?: number;
    date: string; // Формат YYYY-MM-DD
    client: string; // Заказчик
    carModel: string; // Машина
    amount: number; // Сумма
    phone: string; // Кон. телефон
    status: 'PAID' | 'UNPAID' | 'CASH'; // Статус (Оплачен, Не оплачен, Наличные)
    hasDocuments: boolean; // Наличие док (чекбокс)
}

const ActsAnalytics: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [records, setRecords] = useState<ActRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [newRow, setNewRow] = useState<ActRow>({
        date: format(new Date(), "yyyy-MM-dd"),
        client: '',
        carModel: '',
        amount: 0,
        phone: '',
        status: 'UNPAID',
        hasDocuments: false
    });

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<ActRow | null>(null);

    const monthLabel = useMemo(() => moment(currentDate).locale('ru').format('MMMM YYYY').toUpperCase(), [currentDate]);

    const fetchActsData = useCallback(async (date: Date) => {
        try {
            setLoading(true);
            const year = moment(date).year();
            const month = moment(date).month() + 1;

            const response = await reportAPI.getActsSummary?.(year, month) || { data: [] };
            setRecords(response.data || []);
            setError(null);
        } catch (err) {
            setError('Не удалось загрузить аналитику по актам.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActsData(currentDate);
    }, [currentDate, fetchActsData]);

    // Расчет итогов
    const totals = useMemo(() => {
        const sums = { totalAmount: 0, paid: 0, unpaid: 0, cash: 0, docsCount: 0 };
        records.forEach(r => {
            sums.totalAmount += (r.amount || 0);
            if (r.status === 'PAID') sums.paid += (r.amount || 0);
            if (r.status === 'UNPAID') sums.unpaid += (r.amount || 0);
            if (r.status === 'CASH') sums.cash += (r.amount || 0);
            if (r.hasDocuments) sums.docsCount += 1;
        });
        return sums;
    }, [records]);

    const handlePrevMonth = () => setCurrentDate(prev => moment(prev).subtract(1, 'month').toDate());
    const handleNextMonth = () => setCurrentDate(prev => moment(prev).add(1, 'month').toDate());

    const handleStartEdit = (record: ActRow) => {
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
        try {
            await reportAPI.saveActRecord?.(editRow);
            await fetchActsData(currentDate);
            setEditingId(null);
            setEditRow(null);
        } catch (err) {
            alert('Ошибка при изменении записи акта');
        }
    };

    const handleSaveNewRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await reportAPI.saveActRecord?.(newRow);
            await fetchActsData(currentDate);
            setIsAdding(false);
            setNewRow({ date: format(new Date(), "yyyy-MM-dd"), client: '', carModel: '', amount: 0, phone: '', status: 'UNPAID', hasDocuments: false });
        } catch (err) {
            alert('Ошибка при добавлении записи акта');
        }
    };

    const handleDeleteRecord = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить эту строку?')) return;
        try {
            await reportAPI.deleteActRecord?.(id);
            await fetchActsData(currentDate);
        } catch (err) {
            alert('Ошибка при удалении записи');
        }
    };

    const getStatusLabel = (status: 'PAID' | 'UNPAID' | 'CASH') => {
        switch (status) {
            case 'PAID': return 'Оплачен';
            case 'UNPAID': return 'Не оплачен';
            case 'CASH': return 'Наличные';
            default: return '';
        }
    };

    return (
        <div className="report-container salary-logging-container acts-analytics-container">

            {/* ФИЛЬТРЫ И ОБЩИЕ СУММЫ */}
            <div className="salary-filters" style={{ gap: '20px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>

                <div className="month-navigation-inline" style={{ margin: 0 }}>
                    <button className="arrow-btn" onClick={handlePrevMonth}> &larr; </button>
                    <span className="month-label" style={{ minWidth: '150px', textAlign: 'center' }}>{monthLabel}</span>
                    <button className="arrow-btn" onClick={handleNextMonth}> &rarr; </button>
                </div>

                <div className="previous-balance-container" style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>
                    <span>Документов сдано: <strong style={{ color: '#fff' }}>{totals.docsCount} шт.</strong></span>
                </div>

                <div className="total-salary-display" style={{ margin: 0 }}>
                    <span className="total-label">ОБЩАЯ СУММА:</span>
                    <span className="total-value" style={{ marginLeft: '8px', color: 'var(--primary-green)' }}>
                        {totals.totalAmount.toFixed(2)} ₽
                    </span>
                </div>
            </div>

            {/* Загрузка / Ошибка */}
            {error && <div className="report-error" style={{ marginTop: '15px' }}>{error}</div>}
            {loading && <div className="report-loading" style={{ marginTop: '15px' }}>Загрузка данных...</div>}

            {/* ВИДЖЕТЫ СТАТИСТИКИ */}
            <div className="finance-summary-widgets-grid" style={{ marginTop: '20px' }}>
                <div className="summary-widget income"><span className="widget-title">Всего выставлено</span><span className="widget-amount" style={{ color: 'var(--primary-blue)' }}>{totals.totalAmount.toFixed(2)}</span></div>
                <div className="summary-widget status-paid-widget"><span className="widget-title">Оплачен (Безнал)</span><span className="widget-amount" style={{ color: 'var(--success-green)' }}>{totals.paid.toFixed(2)}</span></div>
                <div className="summary-widget status-cash-widget"><span className="widget-title">Наличные</span><span className="widget-amount" style={{ color: '#ffb74d' }}>{totals.cash.toFixed(2)}</span></div>
                <div className="summary-widget status-unpaid-widget"><span className="widget-title">Не оплачен</span><span className="widget-amount" style={{ color: 'var(--error-red)' }}>{totals.unpaid.toFixed(2)}</span></div>
            </div>

            {/* ТАБЛИЦА */}
            <div className="table-wrapper no-border-radius-bottom" style={{ marginTop: '20px' }}>
                <table className="report-table salary-log-table acts-table">
                    <thead>
                    <tr>
                        <th style={{ width: '10%' }}>Дата</th>
                        <th style={{ width: '20%' }}>Заказчик</th>
                        <th style={{ width: '15%' }}>Машина</th>
                        <th style={{ width: '13%' }}>Сумма</th>
                        <th style={{ width: '15%' }}>Кон. телефон</th>
                        <th style={{ width: '11%' }}>Статус</th>
                        <th style={{ width: '8%' }}>Наличие док</th>
                        <th style={{ width: '8%' }}>Действия</th>
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
                                    <td><input type="text" value={editRow.client} onChange={e => setEditRow({ ...editRow, client: e.target.value })} className="inline-input" /></td>
                                    <td><input type="text" value={editRow.carModel} onChange={e => setEditRow({ ...editRow, carModel: e.target.value })} className="inline-input" /></td>
                                    <td><input type="number" value={editRow.amount || ''} onChange={e => setEditRow({ ...editRow, amount: Number(e.target.value) })} className="inline-input" /></td>
                                    <td><input type="text" value={editRow.phone} onChange={e => setEditRow({ ...editRow, phone: e.target.value })} className="inline-input" /></td>
                                    <td>
                                        <select value={editRow.status} onChange={e => setEditRow({ ...editRow, status: e.target.value as any })} className="inline-select">
                                            <option value="PAID">Оплачен</option>
                                            <option value="UNPAID">Не оплачен</option>
                                            <option value="CASH">Наличные</option>
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <input type="checkbox" checked={editRow.hasDocuments} onChange={e => setEditRow({ ...editRow, hasDocuments: e.target.checked })} className="act-checkbox" />
                                    </td>
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
                                <td style={{ textAlign: 'left', paddingLeft: '10px' }}>{record.client}</td>
                                <td>{record.carModel}</td>
                                <td style={{ fontWeight: 'bold' }}>{record.amount.toFixed(2)} ₽</td>
                                <td>{record.phone}</td>
                                <td>
                                    <span className={`status-badge ${record.status.toLowerCase()}`}>
                                        {getStatusLabel(record.status)}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '16px' }}>
                                    {record.hasDocuments ? '✅' : '❌'}
                                </td>
                                <td className="action-icons-cell">
                                    <button onClick={() => handleStartEdit(record)} className="icon-btn edit-icon" title="Редактировать">✏️</button>
                                    <button onClick={() => record.id && handleDeleteRecord(record.id)} className="icon-btn delete-icon" title="Удалить">🗑️</button>
                                </td>
                            </tr>
                        );
                    })}

                    {/* СТРОКА ДОБАВЛЕНИЯ */}
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
                            <td><input type="text" placeholder="ФИО / Компания" value={newRow.client} onChange={e => setNewRow({ ...newRow, client: e.target.value })} className="inline-input" /></td>
                            <td><input type="text" placeholder="Марка" value={newRow.carModel} onChange={e => setNewRow({ ...newRow, carModel: e.target.value })} className="inline-input" /></td>
                            <td><input type="number" placeholder="0.00" value={newRow.amount || ''} onChange={e => setNewRow({ ...newRow, amount: Number(e.target.value) })} className="inline-input" /></td>
                            <td><input type="text" placeholder="+375 (__) ___ - __ - __" value={newRow.phone} onChange={e => setNewRow({ ...newRow, phone: e.target.value })} className="inline-input" /></td>
                            <td>
                                <select value={newRow.status} onChange={e => setNewRow({ ...newRow, status: e.target.value as any })} className="inline-select">
                                    <option value="PAID">Оплачен</option>
                                    <option value="UNPAID">Не оплачен</option>
                                    <option value="CASH">Наличные</option>
                                </select>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={newRow.hasDocuments} onChange={e => setNewRow({ ...newRow, hasDocuments: e.target.checked })} className="act-checkbox" />
                            </td>
                            <td className="action-icons-cell"><span className="text-muted">новая</span></td>
                        </tr>
                    )}

                    </tbody>
                </table>
            </div>

            {/* КНОПКИ */}
            {!isAdding && editingId === null ? (
                <button className="add-row-green-btn" onClick={() => setIsAdding(true)}>
                    Добавить строку <span className="plus-icon">+</span>
                </button>
            ) : (
                <div className="action-buttons-container">
                    {isAdding ? (
                        <button className="add-row-green-btn save-btn" onClick={handleSaveNewRecord}>
                            Сохранить запись
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
        </div>
    );
};

export default ActsAnalytics;