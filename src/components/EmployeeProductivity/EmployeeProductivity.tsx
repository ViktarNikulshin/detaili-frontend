import React, {useCallback, useEffect, useMemo, useState} from 'react';
import moment from 'moment';
import 'moment/locale/ru';
import * as XLSX from 'xlsx';
// Импорты для DatePicker и date-fns (только дата, без времени)
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {ru} from 'date-fns/locale';
import {format} from 'date-fns';
import {reportAPI} from '../../services/reportApi';
import {orderAPI} from '../../services/orderApi';
import {userAPI} from '../../services/userApi';
import {ProductivityRecord} from '../../types/report';
import {WorkType} from '../../types/order';
import './EmployeeProductivity.css';

// Локальные интерфейсы
interface Employee {
    id: number;
    firstName: string;
    lastName: string;
}

// Ставки для расчетных колонок
const USN_RATE = 0.06; // УСН = 6% от чека
const TAXES_RATE = 0.58; // Налоги = 58% от З/П

// Прибыль = чек - УСН - З/П - Налоги - Аренда/место - Материалы
const calcUsn = (checkAmount: number) =>
    Math.round((checkAmount || 0) * USN_RATE * 100) / 100;

const calcTaxes = (salary: number) =>
    Math.round((salary || 0) * TAXES_RATE * 100) / 100;

const calcProfit = (r: {
    checkAmount?: number;
    usnAmount?: number;
    salary?: number;
    taxesAmount?: number;
    rentAmount?: number;
    materialsAmount?: number;
}) =>
    (r.checkAmount || 0) -
    (r.usnAmount || 0) -
    (r.salary || 0) -
    (r.taxesAmount || 0) -
    (r.rentAmount || 0) -
    (r.materialsAmount || 0);

const money = (value?: number) =>
    (value || 0).toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2});

const EmployeeProductivity: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
    const [records, setRecords] = useState<ProductivityRecord[]>([]);

    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [newRecord, setNewRecord] = useState<ProductivityRecord>({
        date: format(new Date(), 'yyyy-MM-dd'),
        workTypeId: null,
        workTypeName: '',
        checkAmount: 0,
        usnAmount: 0,
        salary: 0,
        taxesAmount: 0,
        rentAmount: 0,
        materialsAmount: 0,
        profit: 0,
    });

    // Состояния для редактирования
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRecord, setEditRecord] = useState<ProductivityRecord | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const monthLabel = useMemo(() => {
        return moment(currentDate).locale('ru').format('MMMM YYYY').toUpperCase();
    }, [currentDate]);

    // Сумма прибыли за отображаемый месяц
    const totalProfit = useMemo(() => {
        return records.reduce((sum, record) => sum + (record.profit || 0), 0);
    }, [records]);

    useEffect(() => {
        const initData = async () => {
            try {
                const [employeesRes, workTypesRes] = await Promise.all([
                    userAPI.getUsersByRole('MASTER'),
                    orderAPI.getDictionaryByType('WORK_TYPE'),
                ]);

                setEmployees(employeesRes.data);
                setWorkTypes(workTypesRes.data);

                if (employeesRes.data.length > 0) {
                    setSelectedEmployeeId(employeesRes.data[0].id.toString());
                }
            } catch (err) {
                setError('Не удалось загрузить справочники (сотрудники/виды работ).');
                console.error(err);
            }
        };
        initData();
    }, []);

    const fetchRecords = useCallback(async (employeeId: string, date: Date) => {
        if (!employeeId) return;
        try {
            setLoading(true);
            const response = await reportAPI.getProductivityRecords(
                employeeId,
                moment(date).year(),
                moment(date).month() + 1
            );
            setRecords(response.data || []);
            setError(null);
        } catch (err) {
            setError('Не удалось загрузить записи продуктивности.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords(selectedEmployeeId, currentDate);
    }, [selectedEmployeeId, currentDate, fetchRecords]);

    const handlePrevMonth = () => {
        setCurrentDate(prev => moment(prev).subtract(1, 'month').toDate());
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => moment(prev).add(1, 'month').toDate());
    };

    // Функции для редактирования
    const handleStartEdit = (record: ProductivityRecord) => {
        setEditingId(record.id || null);
        setEditRecord({...record});
        setIsAdding(false);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditRecord(null);
    };

    const handleSaveEdit = async () => {
        if (!editRecord || !editRecord.id) return;
        if (!editRecord.date || !editRecord.workTypeName) {
            alert('Пожалуйста, заполните дату и выберите услугу');
            return;
        }
        try {
            await reportAPI.saveProductivityRecord(editRecord);
            await fetchRecords(selectedEmployeeId, currentDate);
            setEditingId(null);
            setEditRecord(null);
        } catch (err) {
            alert('Ошибка при обновлении записи.');
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) return;
        try {
            await reportAPI.deleteProductivityRecord(id);
            await fetchRecords(selectedEmployeeId, currentDate);
        } catch (err) {
            setError('Ошибка при удалении записи.');
            console.error(err);
        }
    };

    const handleSaveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRecord.workTypeName || !newRecord.date) {
            alert('Пожалуйста, заполните дату и выберите услугу');
            return;
        }
        try {
            await reportAPI.saveProductivityRecord({
                ...newRecord,
                employeeId: parseInt(selectedEmployeeId),
            });
            await fetchRecords(selectedEmployeeId, currentDate);
            setIsAdding(false);
            setNewRecord({
                date: format(new Date(), 'yyyy-MM-dd'),
                workTypeId: null,
                workTypeName: '',
                checkAmount: 0,
                usnAmount: 0,
                salary: 0,
                taxesAmount: 0,
                rentAmount: 0,
                materialsAmount: 0,
                profit: 0,
            });
        } catch (err) {
            setError('Ошибка при сохранении записи.');
            console.error(err);
        }
    };

    const handleExportToExcel = () => {
        if (records.length === 0) {
            alert('Нет данных для выгрузки');
            return;
        }

        const currentEmployee = employees.find(e => e.id.toString() === selectedEmployeeId);
        const employeeFullName = currentEmployee
            ? `${currentEmployee.firstName} ${currentEmployee.lastName}`
            : 'Не выбран';

        const wsData: (string | number)[][] = [
            [`ПРОДУКТИВНОСТЬ СОТРУДНИКА ЗА ${monthLabel}`],
            [`Сотрудник:`, employeeFullName],
            [], // Пустая строка
            ['Дата', 'Услуга', 'Чек', 'УСН', 'З/П', 'Налоги', 'Аренда/место', 'Материалы', 'Прибыль']
        ];

        records.forEach(record => {
            wsData.push([
                moment(record.date).format('DD.MM.YYYY'),
                record.workTypeName || 'Не указано',
                record.checkAmount || 0,
                record.usnAmount || 0,
                record.salary || 0,
                record.taxesAmount || 0,
                record.rentAmount || 0,
                record.materialsAmount || 0,
                record.profit || 0,
            ]);
        });

        wsData.push([]);
        wsData.push(['', '', 'ИТОГО ПРИБЫЛЬ:', '', '', '', '', '', totalProfit]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        const objectMaxLength: number[] = [];
        wsData.forEach((row) => {
            row.forEach((val, colIndex) => {
                const valueLength = val ? val.toString().length : 0;
                if (!objectMaxLength[colIndex] || valueLength > objectMaxLength[colIndex]) {
                    objectMaxLength[colIndex] = valueLength;
                }
            });
        });
        ws['!cols'] = objectMaxLength.map(maxLen => ({wch: maxLen + 3}));

        XLSX.utils.book_append_sheet(wb, ws, 'Продуктивность');

        const employeeName = currentEmployee?.firstName || 'Сотрудник';
        XLSX.writeFile(wb, `Продуктивность_${employeeName}_${monthLabel}.xlsx`);
    };

    // Отображение названия услуги с учетом справочника
    const displayWorkTypeName = (record: ProductivityRecord) => {
        const fromDictionary = record.workTypeId
            ? workTypes.find(w => w.id === record.workTypeId)
            : undefined;
        return fromDictionary?.name || record.workTypeName || 'Не указано';
    };

    return (
        <div className="report-container salary-logging-container productivity-container">
            <div className="salary-filters">
                <div className="month-navigation-inline">
                    <button className="arrow-btn" onClick={handlePrevMonth}> &larr; </button>
                    <span className="month-label">{monthLabel}</span>
                    <button className="arrow-btn" onClick={handleNextMonth}> &rarr; </button>
                </div>

                <div className="master-select-inline">
                    <label htmlFor="employee-dropdown">СОТРУДНИК</label>
                    <select
                        id="employee-dropdown"
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="dropdown-select"
                    >
                        <option value="">список</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>{`${e.firstName} ${e.lastName}`}</option>
                        ))}
                    </select>
                </div>

                <div className="total-salary-display">
                    <span className="total-label">ПРИБЫЛЬ:</span>
                    <span className="total-value">{money(totalProfit)} ₽</span>
                    <button
                        className="excel-export-btn"
                        onClick={handleExportToExcel}
                        title="Выгрузить отчет в Excel"
                        disabled={loading || records.length === 0}
                    >
                        {/* SVG-иконка зеленого Excel-файла с табличкой */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </button>
                </div>
            </div>

            {error && <div className="report-error">{error}</div>}
            {loading && <div className="report-loading">Загрузка данных...</div>}

            <div className="table-wrapper no-border-radius-bottom">
                <table className="report-table productivity-table">
                    <thead>
                    <tr>
                        <th style={{width: '10%'}}>Дата</th>
                        <th style={{width: '20%'}}>Услуга</th>
                        <th style={{width: '10%'}}>Чек</th>
                        <th style={{width: '10%'}}>УСН</th>
                        <th style={{width: '10%'}}>З/П</th>
                        <th style={{width: '10%'}}>Налоги</th>
                        <th style={{width: '12%'}}>Аренда/место</th>
                        <th style={{width: '10%'}}>Материалы</th>
                        <th style={{width: '10%'}}>Прибыль</th>
                        <th style={{width: '8%'}}>Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {records.map((record, index) => {
                        const isEditing = editingId === record.id;

                        return isEditing && editRecord ? (
                            <tr key={record.id || index} className="editable-row">
                                <td>
                                    <DatePicker
                                        selected={moment(editRecord.date).toDate()}
                                        locale={ru}
                                        onChange={(date: Date | null) => date && setEditRecord({
                                            ...editRecord,
                                            date: format(date, 'yyyy-MM-dd')
                                        })}
                                        dateFormat="dd.MM.yyyy"
                                        placeholderText="дд.мм.гггг"
                                        className="inline-input"
                                    />
                                </td>
                                <td>
                                    <select
                                        value={editRecord.workTypeId ?? (editRecord.workTypeName ? `name:${editRecord.workTypeName}` : '')}
                                        onChange={e => {
                                            const value = e.target.value;
                                            const selected = workTypes.find(w => w.id.toString() === value);
                                            if (selected) {
                                                setEditRecord({
                                                    ...editRecord,
                                                    workTypeId: selected.id,
                                                    workTypeName: selected.name,
                                                });
                                            } else {
                                                setEditRecord({
                                                    ...editRecord,
                                                    workTypeId: null,
                                                    workTypeName: value.startsWith('name:') ? value.slice(5) : '',
                                                });
                                            }
                                        }}
                                        className="inline-select"
                                    >
                                        {!editRecord.workTypeId && editRecord.workTypeName && (
                                            <option value={`name:${editRecord.workTypeName}`}>
                                                {editRecord.workTypeName}
                                            </option>
                                        )}
                                        <option value="">— выберите услугу —</option>
                                        {workTypes.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={editRecord.checkAmount || ''}
                                        onChange={e => setEditRecord({...editRecord, checkAmount: Number(e.target.value)})}
                                        placeholder="0"
                                        className="inline-input"
                                    />
                                </td>
                                <td className="computed-cell">
                                    {money(calcUsn(editRecord.checkAmount))}
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={editRecord.salary || ''}
                                        onChange={e => setEditRecord({...editRecord, salary: Number(e.target.value)})}
                                        placeholder="0"
                                        className="inline-input"
                                    />
                                </td>
                                <td className="computed-cell">
                                    {money(calcTaxes(editRecord.salary))}
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={editRecord.rentAmount || ''}
                                        onChange={e => setEditRecord({...editRecord, rentAmount: Number(e.target.value)})}
                                        placeholder="0"
                                        className="inline-input"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={editRecord.materialsAmount || ''}
                                        onChange={e => setEditRecord({
                                            ...editRecord,
                                            materialsAmount: Number(e.target.value)
                                        })}
                                        placeholder="0"
                                        className="inline-input"
                                    />
                                </td>
                                <td className="computed-cell profit-cell">
                                    {money(calcProfit({
                                        ...editRecord,
                                        usnAmount: calcUsn(editRecord.checkAmount),
                                        taxesAmount: calcTaxes(editRecord.salary),
                                    }))}
                                </td>
                                <td className="action-icons-cell">
                                    <button
                                        onClick={handleSaveEdit}
                                        className="icon-btn save-icon"
                                        title="Сохранить"
                                    >
                                        💾
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="icon-btn cancel-icon"
                                        title="Отмена"
                                    >
                                        ❌
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            <tr key={record.id || index}>
                                <td>{record.date ? moment(record.date).format('DD.MM.YYYY') : '—'}</td>
                                <td className="text-left-aligned">{displayWorkTypeName(record)}</td>
                                <td className="text-right-aligned">{money(record.checkAmount)}</td>
                                <td className="text-right-aligned muted-cell">{money(record.usnAmount)}</td>
                                <td className="text-right-aligned">{money(record.salary)}</td>
                                <td className="text-right-aligned muted-cell">{money(record.taxesAmount)}</td>
                                <td className="text-right-aligned">{money(record.rentAmount)}</td>
                                <td className="text-right-aligned">{money(record.materialsAmount)}</td>
                                <td
                                    className={`text-right-aligned profit-cell ${record.profit < 0 ? 'profit-negative' : ''}`}>
                                    {money(record.profit)}
                                </td>
                                <td className="action-icons-cell">
                                    <button
                                        onClick={() => handleStartEdit(record)}
                                        className="icon-btn edit-icon"
                                        title="Редактировать"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => record.id && handleDelete(record.id)}
                                        className="icon-btn delete-icon"
                                        title="Удалить"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        );
                    })}

                    {isAdding && (
                        <tr className="editable-row">
                            <td>
                                <DatePicker
                                    selected={moment(newRecord.date).toDate()}
                                    locale={ru}
                                    onChange={(date: Date | null) => date && setNewRecord({
                                        ...newRecord,
                                        date: format(date, 'yyyy-MM-dd')
                                    })}
                                    dateFormat="dd.MM.yyyy"
                                    placeholderText="дд.мм.гггг"
                                    className="inline-input"
                                />
                            </td>
                            <td>
                                <select
                                    value={newRecord.workTypeId ? newRecord.workTypeId.toString() : ''}
                                    onChange={e => {
                                        const selected = workTypes.find(w => w.id.toString() === e.target.value);
                                        if (selected) {
                                            setNewRecord({
                                                ...newRecord,
                                                workTypeId: selected.id,
                                                workTypeName: selected.name,
                                            });
                                        } else {
                                            setNewRecord({
                                                ...newRecord,
                                                workTypeId: null,
                                                workTypeName: '',
                                            });
                                        }
                                    }}
                                    className="inline-select"
                                >
                                    <option value="">— выберите услугу —</option>
                                    {workTypes.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={newRecord.checkAmount || ''}
                                    onChange={e => setNewRecord({
                                        ...newRecord,
                                        checkAmount: Number(e.target.value)
                                    })}
                                    placeholder="0"
                                    className="inline-input"
                                />
                            </td>
                            <td className="computed-cell">
                                {money(calcUsn(newRecord.checkAmount))}
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={newRecord.salary || ''}
                                    onChange={e => setNewRecord({...newRecord, salary: Number(e.target.value)})}
                                    placeholder="0"
                                    className="inline-input"
                                />
                            </td>
                            <td className="computed-cell">
                                {money(calcTaxes(newRecord.salary))}
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={newRecord.rentAmount || ''}
                                    onChange={e => setNewRecord({...newRecord, rentAmount: Number(e.target.value)})}
                                    placeholder="0"
                                    className="inline-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={newRecord.materialsAmount || ''}
                                    onChange={e => setNewRecord({
                                        ...newRecord,
                                        materialsAmount: Number(e.target.value)
                                    })}
                                    placeholder="0"
                                    className="inline-input"
                                />
                            </td>
                            <td className="computed-cell profit-cell">
                                {money(calcProfit({
                                    ...newRecord,
                                    usnAmount: calcUsn(newRecord.checkAmount),
                                    taxesAmount: calcTaxes(newRecord.salary),
                                }))}
                            </td>
                            <td className="action-icons-cell">
                                <span className="text-muted">новая</span>
                            </td>
                        </tr>
                    )}

                    {!isAdding && records.length === 0 && (
                        <tr>
                            <td colSpan={10} className="text-muted" style={{textAlign: 'center'}}>
                                Нет записей за выбранный месяц
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {!isAdding && editingId === null ? (
                <button className="add-row-green-btn" onClick={() => setIsAdding(true)}>
                    Добавить <span className="plus-icon">+</span>
                </button>
            ) : (
                <div className="action-buttons-container">
                    {isAdding ? (
                        <button className="add-row-green-btn save-btn" onClick={handleSaveRecord}>
                            Сохранить запись
                        </button>
                    ) : (
                        <button className="add-row-green-btn save-btn" onClick={handleSaveEdit}>
                            Сохранить изменения
                        </button>
                    )}
                    <button
                        className="add-row-green-btn cancel-btn"
                        onClick={() => {
                            setIsAdding(false);
                            handleCancelEdit();
                        }}
                    >
                        Отмена
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmployeeProductivity;
