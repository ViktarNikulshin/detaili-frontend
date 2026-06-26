import React, { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import 'moment/locale/ru';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ru } from 'date-fns/locale';
import { format } from 'date-fns';
import './Landlord.css';
import { reportAPI } from "../../services/reportApi";

// Типы подстроенные под Backend DTO
interface LandlordRecord {
    id?: number;
    date: Date | null;
    carModel: string;
    workTypeName: string;
    cost: number;
}

interface UpdateMetaRequest {
    year: number;
    month: number;
    previousBalance: number;
    additionalAgreement: number;
}

// Структура запроса для сохранения/обновления записи
interface SaveRecordRequest {
    id: number | null;
    year: number;
    month: number;
    date: string;
    carModel: string;
    workTypeName: string;
    cost: number;
}

const LandlordReconciliationLog: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [records, setRecords] = useState<LandlordRecord[]>([]);

    // Глобальные переменные месяца
    const [previousBalance, setPreviousBalance] = useState<number>(0);
    const [additionalAgreement, setAdditionalAgreement] = useState<number>(0);

    // Состояния для добавления новой строки
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [newRecord, setNewRecord] = useState<LandlordRecord>({
        date: new Date(), carModel: '', workTypeName: '', cost: 0
    });

    // Состояния для редактирования существующей строки
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRecord, setEditRecord] = useState<LandlordRecord | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Вычисляем корректное динамическое имя месяца
    const monthLabel = useMemo(() => {
        return moment(currentDate).locale('ru').format('MMMM').toUpperCase();
    }, [currentDate]);

    // Расчет итогового баланса на клиенте
    const totalBalance = useMemo(() => {
        const servicesSum = records.reduce((sum, record) => sum + (record.cost || 0), 0);
        return previousBalance + additionalAgreement - servicesSum;
    }, [records, previousBalance, additionalAgreement]);

    // Загрузка данных с бэка
    const fetchLandlordData = useCallback(async (date: Date) => {
        const year = moment(date).year();
        const month = moment(date).month() + 1;
        setLoading(true);
        setError(null);
        try {
            const response = await reportAPI.getLandlordSummary(year, month);

            // Преобразуем строки дат из бэкенда в объекты JS Date для DatePicker
            const formattedRecords = response.data.records.map((r: any) => ({
                ...r,
                date: r.date ? moment(r.date).toDate() : null
            }));

            setRecords(formattedRecords);
            setPreviousBalance(response.data.previousBalance || 0);
            setAdditionalAgreement(response.data.additionalAgreement || 0);
        } catch (err) {
            setError('Не удалось загрузить данные взаиморасчетов.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLandlordData(currentDate);
    }, [currentDate, fetchLandlordData]);

    // Обработчик сохранения метаданных месяца (onBlur)
    const saveMonthlyMeta = async () => {
        const year = moment(currentDate).year();
        const month = moment(currentDate).month() + 1;
        const data: UpdateMetaRequest = {
            year,
            month,
            previousBalance,
            additionalAgreement
        };
        try {
            await reportAPI.saveLandlordMeta(data);
            console.log("Сохранение метаданных:", data);
        } catch (err) {
            console.error("Ошибка сохранения метаданных:", err);
        }
    };

    // Включение режима редактирования строки
    const handleEdit = (record: LandlordRecord) => {
        setEditingId(record.id || null);
        setEditRecord({ ...record });
    };

    // Отмена редактирования
    const handleCancelEdit = () => {
        setEditingId(null);
        setEditRecord(null);
    };

    // Сохранение изменений при редактировании существующей строки
    const handleSaveEdit = async () => {
        if (!editRecord || !editRecord.date || !editRecord.carModel || !editRecord.workTypeName) {
            alert("Пожалуйста, заполните все поля");
            return;
        }

        const year = moment(currentDate).year();
        const month = moment(currentDate).month() + 1;

        try {
            const payload: SaveRecordRequest = {
                id: editRecord.id || null,
                year,
                month,
                date: format(editRecord.date, "yyyy-MM-dd"),
                carModel: editRecord.carModel,
                workTypeName: editRecord.workTypeName,
                cost: Number(editRecord.cost)
            };

            await reportAPI.saveLandlordRecord(payload);
            await fetchLandlordData(currentDate);
            setEditingId(null);
            setEditRecord(null);
        } catch (err) {
            console.error("Ошибка при изменении записи:", err);
            alert("Не удалось обновить запись");
        }
    };

    // Создание новой записи таблицы
    const handleSaveNewRecord = async () => {
        if (!newRecord.date || !newRecord.carModel || !newRecord.workTypeName) {
            alert("Пожалуйста, заполните все поля");
            return;
        }

        const year = moment(currentDate).year();
        const month = moment(currentDate).month() + 1;

        try {
            const payload: SaveRecordRequest = {
                id: null, // Для новой записи id пустой
                year,
                month,
                date: format(newRecord.date, "yyyy-MM-dd"),
                carModel: newRecord.carModel,
                workTypeName: newRecord.workTypeName,
                cost: Number(newRecord.cost)
            };

            await reportAPI.saveLandlordRecord(payload);
            await fetchLandlordData(currentDate);

            setIsAdding(false);
            setNewRecord({ date: new Date(), carModel: '', workTypeName: '', cost: 0 });
        } catch (err) {
            console.error("Ошибка при создании записи:", err);
            alert("Не удалось сохранить новую запись");
        }
    };

    // Удаление записи
    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить эту строку?')) return;
        try {
            await reportAPI.deleteLandlordRecord(id);
            await fetchLandlordData(currentDate);
        } catch (err) {
            console.error("Ошибка при удалении записи:", err);
            alert("Не удалось удалить запись");
        }
    };

    return (
        <div className="report-container salary-logging-container">
            {/* ШАПКА ФИЛЬТРОВ И МЕТАДАННЫХ */}
            <div className="salary-filters" style={{ justifyContent: 'flex-start' }}>
                <div className="month-navigation-inline">
                    <button className="arrow-btn" onClick={() => setCurrentDate(moment(currentDate).subtract(1, 'M').toDate())}> &larr; </button>
                    <span className="month-label">{monthLabel}</span>
                    <button className="arrow-btn" onClick={() => setCurrentDate(moment(currentDate).add(1, 'M').toDate())}> &rarr; </button>
                </div>

                <div className="previous-balance-container" style={{ marginLeft: '20px' }}>
                    <label style={{ color: 'var(--text-primary)', fontSize: '20px' }}>остаток :</label>
                    <input
                        type="number"
                        value={previousBalance}
                        onChange={(e) => setPreviousBalance(Number(e.target.value) || 0)}
                        onBlur={saveMonthlyMeta}
                        className="previous-balance-input inline-input"
                        style={{ width: '80px', height: '32px' }}
                    />
                </div>

                <div className="previous-balance-container" style={{ marginLeft: '10px' }}>
                    <label style={{ color: 'var(--text-primary)', fontSize: '20px' }}>доп соглашение :</label>
                    <input
                        type="number"
                        value={additionalAgreement}
                        onChange={(e) => setAdditionalAgreement(Number(e.target.value) || 0)}
                        onBlur={saveMonthlyMeta}
                        className="previous-balance-input inline-input"
                        style={{ width: '80px', height: '32px' }}
                    />
                </div>

                <div className="total-salary-display" style={{ marginLeft: 'auto' }}>
                    <span className="total-label">БАЛАНС:</span>
                    <span className="total-value" style={{ color: totalBalance < 0 ? 'var(--error-red)' : 'var(--primary-green)' }}>
                        {totalBalance}
                    </span>
                </div>
            </div>

            {error && <div className="report-error">{error}</div>}
            {loading && <div className="report-loading">Загрузка данных...</div>}

            <div className="table-wrapper no-border-radius-bottom">
                <table className="report-table salary-log-table">
                    <thead>
                    <tr>
                        <th style={{ width: '15%' }}>Дата</th>
                        <th style={{ width: '25%' }}>Авто</th>
                        <th style={{ width: '35%' }}>Вид работы</th>
                        <th style={{ width: '15%' }}>Стоимость</th>
                        <th style={{ width: '10%' }}>Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {records.map((record, index) => {
                        const isEditing = editingId === record.id;

                        return (
                            <tr key={record.id || index}>
                                {isEditing && editRecord ? (
                                    <>
                                        <td>
                                            <DatePicker
                                                selected={editRecord.date}
                                                locale={ru}
                                                onChange={(date) => setEditRecord({ ...editRecord, date })}
                                                dateFormat="dd.MM.yyyy"
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
                                            <input
                                                type="text"
                                                value={editRecord.workTypeName}
                                                onChange={e => setEditRecord({ ...editRecord, workTypeName: e.target.value })}
                                                className="inline-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={editRecord.cost}
                                                onChange={e => setEditRecord({ ...editRecord, cost: Number(e.target.value) })}
                                                className="inline-input"
                                            />
                                        </td>
                                        <td className="action-icons-cell">
                                            <button className="icon-btn save-icon" onClick={handleSaveEdit} title="Сохранить">💾</button>
                                            <button className="icon-btn cancel-icon" onClick={handleCancelEdit} title="Отмена">❌</button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td>{record.date ? moment(record.date).format('DD.MM.YYYY') : '—'}</td>
                                        <td className="text-left-aligned">{record.carModel}</td>
                                        <td className="text-left-aligned">{record.workTypeName}</td>
                                        <td className="text-right-aligned">{record.cost}</td>
                                        <td className="action-icons-cell">
                                            <button className="icon-btn edit-icon" onClick={() => handleEdit(record)} title="Редактировать">✏️</button>
                                            <button className="icon-btn delete-icon" onClick={() => record.id && handleDelete(record.id)} title="Удалить">🗑️</button>
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
                                    onChange={(date) => setNewRecord({ ...newRecord, date })}
                                    dateFormat="dd.MM.yyyy"
                                    className="inline-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={newRecord.carModel}
                                    onChange={e => setNewRecord({ ...newRecord, carModel: e.target.value })}
                                    placeholder="АВТО"
                                    className="inline-input uppercase-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={newRecord.workTypeName}
                                    onChange={e => setNewRecord({ ...newRecord, workTypeName: e.target.value })}
                                    placeholder="Вид работы"
                                    className="inline-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={newRecord.cost || ''}
                                    onChange={e => setNewRecord({ ...newRecord, cost: Number(e.target.value) })}
                                    placeholder="Стоимость"
                                    className="inline-input"
                                />
                            </td>
                            <td className="action-icons-cell">
                                <button className="icon-btn save-icon" onClick={handleSaveNewRecord} title="Сохранить">💾</button>
                                <button className="icon-btn cancel-icon" onClick={() => setIsAdding(false)} title="Отмена">❌</button>
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {!isAdding && editingId === null && (
                <button className="add-row-green-btn" onClick={() => setIsAdding(true)}>
                    Добавить услугу <span className="plus-icon">+</span>
                </button>
            )}
        </div>
    );
};

export default LandlordReconciliationLog;