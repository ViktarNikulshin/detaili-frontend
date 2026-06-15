import React, {useCallback, useEffect, useMemo, useState} from 'react';
import moment from 'moment';
import 'moment/locale/ru';
import {SalaryRecord} from "../../types/report";
import {reportAPI} from '../../services/reportApi';
import './MasterSalary.css';
import {userAPI} from "../../services/userApi";
import * as XLSX from 'xlsx';

// Импорты для DatePicker и date-fns (только дата, без времени)
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {ru} from 'date-fns/locale';
import {format} from 'date-fns';

// Локальные интерфейсы
interface Master {
    id: number;
    firstName: string;
    lastName: string;
}

interface WorkType {
    id: number;
    name: string;
    defaultPrice?: number;
}


// Новый интерфейс для редактирования
interface EditRecord {
    id?: number;
    date: Date | null;
    carModel: string;
    workTypeName: string;
    salary: number;
}

const MasterSalaryLog: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [masters, setMasters] = useState<Master[]>([]);
    const [selectedMasterId, setSelectedMasterId] = useState<string>('');
    const [workTypes] = useState<WorkType[]>([]);
    const [records, setRecords] = useState<SalaryRecord[]>([]);

    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [newRecord, setNewRecord] = useState<EditRecord>({
        date: new Date(),
        carModel: '',
        workTypeName: '',
        salary: 0
    });

    // Состояния для редактирования
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRecord, setEditRecord] = useState<EditRecord | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [previousBalance, setPreviousBalance] = useState<number>(0);

    const monthLabel = useMemo(() => {
        return moment(currentDate).locale('ru').format('MMMM').toUpperCase();
    }, [currentDate]);

    const totalSalary = useMemo(() => {
        const worksSalary = records.reduce(
            (sum, record) => sum + (record.salary || 0),
            0
        );

        return worksSalary + previousBalance;
    }, [records, previousBalance]);

    useEffect(() => {
        const initData = async () => {
            try {
                const [mastersRes] = await Promise.all([
                    userAPI.getUsersByRole("MASTER") || Promise.resolve({data: []}),
                ]);

                setMasters(mastersRes.data);

                if (mastersRes.data.length > 0) {
                    setSelectedMasterId(mastersRes.data[0].id.toString());
                }
            } catch (err) {
                setError('Не удалось загрузить справочники (мастера/виды работ).');
                console.error(err);
            }
        };
        initData();
    }, []);

    const fetchSalaryLogs = useCallback(async (masterId: string, date: Date) => {
        if (!masterId) return;
        try {
            setLoading(true);
            const startOfMonth = moment(date).startOf('month').format('YYYY-MM-DDTHH:mm');
            const endOfMonth = moment(date).endOf('month').format('YYYY-MM-DDTHH:mm');

            const response = await reportAPI.getSalaryLogs?.(masterId, startOfMonth, endOfMonth)
                || Promise.resolve({data: []});

            setRecords(response.data.records);
            setPreviousBalance(response.data.previousBalance || 0);
            setError(null);
        } catch (err) {
            setError('Не удалось загрузить записи по зарплате.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSalaryLogs(selectedMasterId, currentDate);
    }, [selectedMasterId, currentDate, fetchSalaryLogs]);

    const handlePrevMonth = () => {
        setCurrentDate(prev => moment(prev).subtract(1, 'month').toDate());
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => moment(prev).add(1, 'month').toDate());
    };

    // Функции для редактирования
    const handleEdit = (record: SalaryRecord) => {
        setEditingId(record.id || null);

        // Пытаемся распарсить дату из строки в объект Date для DatePicker
        let parsedDate: Date | null = null;
        if (record.date) {
            parsedDate = moment(record.date, ["YYYY-MM-DDTHH:mm:ss", "DD.MM.YYYY", "DD.MM"]).toDate();
            if (isNaN(parsedDate.getTime())) {
                parsedDate = new Date(); // fallback на сегодня, если дата невалидна
            }
        }

        setEditRecord({
            id: record.id,
            date: parsedDate,
            carModel: record.carModel || '',
            workTypeName: record.workTypeName || '',
            salary: record.salary || 0
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditRecord(null);
    };

    const handleSaveEdit = async (id: number) => {
        if (!editRecord || !editRecord.date) {
            alert("Пожалуйста, выберите корректную дату");
            return;
        }

        try {

            const payload = {
                masterId: parseInt(selectedMasterId),
                workTypeName: editRecord.workTypeName,
                carModel: editRecord.carModel,
                // Форматируем только дату, время устанавливаем на 00:00:00
                date: format(editRecord.date, "yyyy-MM-dd") + 'T12:00:00',
                salary: Number(editRecord.salary)
            };

            await reportAPI.updateSalaryRecord?.(id, payload);
            await fetchSalaryLogs(selectedMasterId, currentDate);
            setEditingId(null);
            setEditRecord(null);
        } catch (err) {
            setError('Ошибка при обновлении записи.');
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) return;

        try {
            await reportAPI.deleteSalaryRecord?.(id);
            await fetchSalaryLogs(selectedMasterId, currentDate);
        } catch (err) {
            setError('Ошибка при удалении записи.');
            console.error(err);
        }
    };

    const handleSaveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMasterId || !newRecord.carModel || !newRecord.workTypeName || !newRecord.date) {
            alert("Пожалуйста, заполните все обязательные поля и выберите дату");
            return;
        }

        try {

            const payload = {
                masterId: parseInt(selectedMasterId),
                workTypeName: newRecord.workTypeName,
                carModel: newRecord.carModel,
                date: format(newRecord.date, "yyyy-MM-dd") + 'T12:00:00',
                salary: Number(newRecord.salary)
            };

            await reportAPI.saveSalaryRecord?.(payload);
            await fetchSalaryLogs(selectedMasterId, currentDate);

            setIsAdding(false);
            setNewRecord({
                date: new Date(),
                carModel: '',
                workTypeName: '',
                salary: 0
            });
        } catch (err) {
            setError('Ошибка при сохранении записи.');
            console.error(err);
        }
    };
    const handleExportToExcel = () => {
        if (records.length === 0) {
            alert("Нет данных для выгрузки");
            return;
        }

        const currentMaster = masters.find(m => m.id.toString() === selectedMasterId);
        const masterFullName = currentMaster ? `${currentMaster.firstName} ${currentMaster.lastName}` : "Не выбран";

        // ✅ ИСПРАВЛЕНИЕ 1: Явно указываем тип (string | number)[][]
        const wsData: (string | number)[][] = [
            [`РАСЧЕТНЫЙ ЛИСТОК ЗА ${monthLabel.toUpperCase()}`],
            [`Сотрудник:`, masterFullName],
            [], // Пустая строка
            ["Дата", "Автомобиль", "Вид работы / Операция", "Начислено (ЗП)", "Выплаты / Удержания"] // Заголовки
        ];

        let totalEarned = 0;
        let totalPaid = 0;

        // 2. Наполнение данными
        records.forEach(record => {
            const dateStr = record.date ? moment(record.date).format('DD.MM.YYYY') : '—';
            const car = record.carModel || '—';
            const work = record.workTypeName || 'Не указано';
            const salary = record.salary || 0;

            let earned = 0;
            let paid = 0;

            if (salary > 0) {
                earned = salary;
                totalEarned += salary;
            } else if (salary < 0) {
                earned = 0;
                paid = Math.abs(salary);
                totalPaid += paid;
            }

            wsData.push([dateStr, car, work, earned, paid]);
        });

        // 3. Подвал таблицы
        wsData.push([]);
        wsData.push(["", "", "Остаток за предыдущий месяц:", previousBalance]);
        wsData.push(["", "", "Промежуточные выплаты :", totalPaid]);
        wsData.push(["", "", "Начислено за работы :", totalEarned]);
        wsData.push(["", "", "ИТОГО К ВЫПЛАТЕ :", totalSalary]);

        // 4. Создаем рабочую книгу Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // ✅ ИСПРАВЛЕНИЕ 2: Явно указываем тип number[]
        const objectMaxLength: number[] = [];

        wsData.forEach((row) => {
            row.forEach((val, colIndex) => {
                const valueLength = val ? val.toString().length : 0;
                // Учитываем длину текста + даем небольшой запас в 3 символа
                if (!objectMaxLength[colIndex] || valueLength > objectMaxLength[colIndex]) {
                    objectMaxLength[colIndex] = valueLength;
                }
            });
        });

        // Применяем ширину к колонкам (добавляем +3 для красивых отступов)
        ws['!cols'] = objectMaxLength.map(maxLen => ({ wch: maxLen + 3 }));

        // 6. Сохраняем и скачиваем настоящий .xlsx файл
        XLSX.utils.book_append_sheet(wb, ws, "Расчетный лист");

        const masterName = currentMaster?.firstName || 'Мастер';
        XLSX.writeFile(wb, `Расчетный_лист_${masterName}_${monthLabel}.xlsx`);
    };
    const saveBalance = async () => {
        await reportAPI.savePreviousBalance?.(
            Number(selectedMasterId),
            moment(currentDate).year(),
            moment(currentDate).month() + 1,
            previousBalance
        );
    };

    return (
        <div className="report-container salary-logging-container">
            <div className="salary-filters">
                <div className="month-navigation-inline">
                    <button className="arrow-btn" onClick={handlePrevMonth}> &larr; </button>
                    <span className="month-label">{monthLabel}</span>
                    <button className="arrow-btn" onClick={handleNextMonth}> &rarr; </button>
                </div>

                <div className="master-select-inline">
                    <label htmlFor="master-dropdown">МАСТЕР</label>
                    <select
                        id="master-dropdown"
                        value={selectedMasterId}
                        onChange={(e) => setSelectedMasterId(e.target.value)}
                        className="dropdown-select"
                    >
                        <option value="">список</option>
                        {masters.map(m => (
                            <option key={m.id} value={m.id}>{`${m.firstName} ${m.lastName}`}</option>
                        ))}
                    </select>
                </div>
                <div className="previous-balance-container">
                    <label>Остаток за предыдущий месяц:</label>

                    <input
                        type="number"
                        value={previousBalance}
                        onChange={(e) =>
                            setPreviousBalance(Number(e.target.value) || 0)
                        }
                        onBlur={saveBalance}
                        className="previous-balance-input"
                    />
                </div>

                <div className="total-salary-display">
                    <span className="total-label">СУММА:</span>
                    <span className="total-value">{totalSalary}</span>
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
                <table className="report-table salary-log-table">
                    <thead>
                    <tr>
                        <th style={{width: '15%'}}>Дата</th>
                        <th style={{width: '25%'}}>Авто</th>
                        <th style={{width: '35%'}}>Вид работы</th>
                        <th style={{width: '10%'}}>ЗП</th>
                        <th style={{width: '15%'}}>Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {records.map((record, index) => {
                        const workType = workTypes.find(w => w.name === record.workTypeName);
                        const workTypeName = workType?.name || record.workTypeName || 'Не указано';
                        const isEditing = editingId === record.id;

                        return (
                            <tr key={record.id || index}>
                                {isEditing && editRecord ? (
                                    <>
                                        <td>
                                            <DatePicker
                                                selected={editRecord.date}
                                                locale={ru}
                                                onChange={(date: Date | null) => editRecord && setEditRecord({
                                                    ...editRecord,
                                                    date
                                                })}
                                                dateFormat="dd.MM.yyyy"
                                                placeholderText="дд.мм.гггг"
                                                className="inline-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={editRecord.carModel}
                                                onChange={e => setEditRecord({...editRecord, carModel: e.target.value})}
                                                className="inline-input uppercase-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={editRecord.workTypeName}
                                                onChange={e => setEditRecord({
                                                    ...editRecord,
                                                    workTypeName: e.target.value
                                                })}
                                                className="inline-input"
                                                placeholder="Введите вид работы"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={editRecord.salary}
                                                onChange={e => setEditRecord({
                                                    ...editRecord,
                                                    salary: Number(e.target.value)
                                                })}
                                                className="inline-input"
                                            />
                                        </td>
                                        <td className="action-icons-cell">
                                            <button
                                                onClick={() => editRecord.id && handleSaveEdit(editRecord.id)}
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
                                    </>
                                ) : (
                                    <>
                                        <td>{record.date ? moment(record.date).format('DD.MM.YYYY') : '—'}</td>
                                        <td className="text-left-aligned">{record.carModel}</td>
                                        <td className="text-left-aligned">{workTypeName}</td>
                                        <td className="text-right-aligned">{record.salary}</td>
                                        <td className="action-icons-cell">
                                            <button
                                                onClick={() => handleEdit(record)}
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
                                    </>
                                )}
                            </tr>
                        );
                    })}

                    {isAdding && (
                        <tr className="editable-row">
                            <td>
                                <DatePicker
                                    selected={newRecord.date}
                                    locale={ru}
                                    onChange={(date: Date | null) => setNewRecord({...newRecord, date})}
                                    dateFormat="dd.MM.yyyy"
                                    placeholderText="дд.мм.гггг"
                                    className="inline-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={newRecord.carModel}
                                    onChange={e => setNewRecord({...newRecord, carModel: e.target.value})}
                                    placeholder="КУЛРЕЙ"
                                    className="inline-input uppercase-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={newRecord.workTypeName}
                                    onChange={e => setNewRecord({...newRecord, workTypeName: e.target.value})}
                                    placeholder="Введите вид работы"
                                    className="inline-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={newRecord.salary || ''}
                                    onChange={e => setNewRecord({...newRecord, salary: Number(e.target.value)})}
                                    placeholder="200"
                                    className="inline-input"
                                />
                            </td>
                            <td className="action-icons-cell">
                                <span className="text-muted">новая</span>
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
                    <button className="add-row-green-btn save-btn" onClick={handleSaveRecord}>
                        Сохранить записи
                    </button>
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

export default MasterSalaryLog;