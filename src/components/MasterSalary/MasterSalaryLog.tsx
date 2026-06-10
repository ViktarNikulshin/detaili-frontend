import React, { useState, useEffect, useMemo, useCallback } from 'react';
import moment from 'moment';
import 'moment/locale/ru';
import { SalaryRecord } from "../../types/report";
import { reportAPI } from '../../services/reportApi';
import './MasterSalary.css';
import { userAPI } from "../../services/userApi";
import { dictionaryApi } from "../../services/dictionaryApi";

// Импорты для DatePicker и date-fns (только дата, без времени)
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ru } from 'date-fns/locale';
import { format } from 'date-fns';

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

// Единый интерфейс для формы (добавление и редактирование)
interface FormRecord {
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
    const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
    const [records, setRecords] = useState<SalaryRecord[]>([]);

    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [newRecord, setNewRecord] = useState<FormRecord>({
        date: new Date(),
        carModel: '',
        workTypeName: '',
        salary: 0
    });

    // Состояния для редактирования
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRecord, setEditRecord] = useState<FormRecord | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const monthLabel = useMemo(() => {
        return moment(currentDate).locale('ru').format('MMMM').toUpperCase();
    }, [currentDate]);

    const totalSalary = useMemo(() => {
        return records.reduce((sum, record) => sum + (record.salary || 0), 0);
    }, [records]);

    useEffect(() => {
        const initData = async () => {
            try {
                const [mastersRes, workTypesRes] = await Promise.all([
                    userAPI.getUsersByRole("MASTER") || Promise.resolve({ data: [] }),
                    dictionaryApi.fetchOnlyWorkTypes() || Promise.resolve({ data: [] })
                ]);

                setMasters(mastersRes.data);
                setWorkTypes(workTypesRes.data);

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
                || Promise.resolve({ data: [] }); // Исправлена опечатка Promise.resolv e

            setRecords(response.data);
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
            const selectedWorkType = workTypes.find(w => w.name === editRecord.workTypeName);

            const payload = {
                masterId: parseInt(selectedMasterId),
                workTypeId: selectedWorkType?.id,
                carModel: editRecord.carModel,
                // Форматируем только дату, время устанавливаем на 00:00:00
                date: format(editRecord.date, "yyyy-MM-dd") + 'T00:00:00',
                salary: Number(editRecord.salary)
            };

            await reportAPI.updateSalaryRecord?.(id, payload); // Исправлена опечатка payl oad
            await fetchSalaryLogs(selectedMasterId, currentDate); // Исправлена опечатка select edMasterId
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

    const handleSaveRecord = async (e: React.FormEvent) => { // Исправлена опечатка React.FormEv ent
        e.preventDefault();
        if (!selectedMasterId || !newRecord.carModel || !newRecord.workTypeName || !newRecord.date) {
            alert("Пожалуйста, заполните все обязательные поля и выберите дату");
            return;
        }

        try {
            const selectedWorkType = workTypes.find(w => w.name === newRecord.workTypeName);

            const payload = {
                masterId: parseInt(selectedMasterId),
                workTypeId: selectedWorkType?.id,
                workTypesName: selectedWorkType?.name, // Исправлена опечатка workTyp esName
                carModel: newRecord.carModel,
                date: format(newRecord.date, "yyyy-MM-dd") + 'T00:00:00',
                salary: Number(newRecord.salary)
            };

            await reportAPI.saveSalaryRecord?.(payload); // Исправлена опечатка reportA PI
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
            console.error(err); // Исправлена опечатка c onsole
        }
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
                    <label htmlFor="master-dropdown">мастер</label>
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
                <div className="total-salary-display">
                    <span className="total-label">СУММА:</span>
                    <span className="total-value">{totalSalary}</span>
                </div>
            </div>

            {error && <div className="report-error">{error}</div>}
            {loading && <div className="report-loading">Загрузка данных...</div>}

            <div className="table-wrapper no-border-radius-bottom">
                <table className="report-table salary-log-table">
                    <thead>
                    <tr>
                        <th style={{ width: '15%' }}>Дата</th>
                        <th style={{ width: '30%' }}>Авто</th>
                        <th style={{ width: '30%' }}>Вид работы</th>
                        <th style={{ width: '10%' }}>ЗП</th>
                        <th style={{ width: '15%' }}>Действия</th>
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
                                                onChange={(date: Date | null) => editRecord && setEditRecord({ ...editRecord, date })}
                                                dateFormat="dd.MM.yyyy"
                                                placeholderText="дд.мм.гггг"
                                                className="inline-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={editRecord.carModel}
                                                onChange={e => setEditRecord({ ...editRecord, carModel: e.target.value })}
                                                className="inline-input uppercase-input"
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={editRecord.workTypeName}
                                                onChange={e => setEditRecord({ ...editRecord, workTypeName: e.target.value })}
                                                className="inline-select"
                                            >
                                                <option value="">Выберите работу</option>
                                                {workTypes.map((w, idx) => (
                                                    <option key={w.id || idx} value={w.name}>{w.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={editRecord.salary}
                                                onChange={e => setEditRecord({ ...editRecord, salary: Number(e.target.value) })}
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
                                    onChange={(date: Date | null) => setNewRecord({ ...newRecord, date })}
                                    dateFormat="dd.MM.yyyy"
                                    placeholderText="дд.мм.гггг"
                                    className="inline-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={newRecord.carModel}
                                    onChange={e => setNewRecord({ ...newRecord, carModel: e.target.value })}
                                    placeholder="КУЛРЕЙ"
                                    className="inline-input uppercase-input"
                                />
                            </td>
                            <td>
                                <select
                                    value={newRecord.workTypeName}
                                    onChange={e => {
                                        const selectedWork = workTypes.find(w => w.name === e.target.value);
                                        setNewRecord({
                                            ...newRecord,
                                            workTypeName: e.target.value, // Исправлена опечатка workT ypeName
                                            salary: selectedWork?.defaultPrice || 0
                                        });
                                    }}
                                    className="inline-select"
                                >
                                    <option value="">Выберите работу</option>
                                    {workTypes.map((w, idx) => (
                                        <option key={w.id || idx} value={w.name}>{w.name}</option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={newRecord.salary || ''}
                                    onChange={e => setNewRecord({ ...newRecord, salary: Number(e.target.value) })}
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