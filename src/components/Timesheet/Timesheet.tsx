import React, { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import 'moment/locale/ru';
import { userAPI } from '../../services/userApi';
import { reportAPI } from '../../services/reportApi';
import './Timesheet.css';

interface Master {
    id: number;
    firstName: string;
    lastName: string;
}

interface TimesheetDay {
    date: string;
    isAbsent: boolean;
    contentRub: number | string;
    salaryRub: number | string;
}

const Timesheet: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [masters, setMasters] = useState<Master[]>([]);
    const [selectedMasterId, setSelectedMasterId] = useState<string>('');
    const [timesheet, setTimesheet] = useState<TimesheetDay[]>([]);
    const [previousBalance, setPreviousBalance] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false); // Для фонового автосохранения
    const [error, setError] = useState<string | null>(null);

    const monthLabel = useMemo(() => {
        return moment(currentDate).locale('ru').format('MMMM').toUpperCase();
    }, [currentDate]);

    // Инициализация списка мастеров
    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const response = await userAPI.getUsersByRole("MANAGER") || { data: [] };
                setMasters(response.data);
                if (response.data.length > 0) {
                    setSelectedMasterId(response.data[0].id.toString());
                }
            } catch (err) {
                setError('Не удалось загрузить список мастеров.');
                console.error(err);
            }
        };
        fetchMasters();
    }, []);

    // Функция загрузки данных табеля с сервера
    const loadTimesheetData = useCallback(async (masterId: string, date: Date) => {
        if (!masterId) return;
        setLoading(true);
        setError(null);

        try {
            const formattedMonth = moment(date).format('YYYY-MM');
            const daysInMonth = moment(date).daysInMonth();

            const response = await reportAPI.getTimesheetRecords(masterId, formattedMonth);
            setPreviousBalance(response.data.previousBalance || 0);

            const backendRecords: TimesheetDay[] = response?.data.records || [];
            const backendRecordsMap = new Map<string, TimesheetDay>(
                backendRecords.map(record => [record.date, record])
            );

            const completeMonthTimesheet: TimesheetDay[] = [];

            for (let i = 1; i <= daysInMonth; i++) {
                const currentDayStr = moment(date).date(i).format('YYYY-MM-DD');

                if (backendRecordsMap.has(currentDayStr)) {
                    const savedDay = backendRecordsMap.get(currentDayStr)!;
                    completeMonthTimesheet.push({
                        date: currentDayStr,
                        isAbsent: savedDay.isAbsent,
                        contentRub: savedDay.contentRub ?? '',
                        salaryRub: savedDay.salaryRub ?? ''
                    });
                } else {
                    completeMonthTimesheet.push({
                        date: currentDayStr,
                        isAbsent: false,
                        contentRub: '',
                        salaryRub: ''
                    });
                }
            }

            setTimesheet(completeMonthTimesheet);
        } catch (err) {
            setError('Не удалось загрузить данные табеля с сервера.');
            console.error('Ошибка загрузки табеля:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Вызов загрузки данных при смене мастера или месяца (ОДИН оптимизированный useEffect)
    useEffect(() => {
        loadTimesheetData(selectedMasterId, currentDate);
    }, [selectedMasterId, currentDate, loadTimesheetData]);

    // Унифицированная функция отправки данных на бэкенд (Автосохранение)
    const executeAutosave = useCallback(async (targetTimesheet: TimesheetDay[]) => {
        if (!selectedMasterId) return;
        setIsSaving(true);
        setError(null);
        try {
            const formattedMonth = moment(currentDate).format('YYYY-MM');
            await reportAPI.saveTimesheetRecords(selectedMasterId, formattedMonth, targetTimesheet);
        } catch (err) {
            console.error("Ошибка автосохранения табеля:", err);
            setError("Автосохранение не удалось. Проверьте подключение к сети.");
        } finally {
            setIsSaving(false);
        }
    }, [selectedMasterId, currentDate]);

    const handlePrevMonth = () => setCurrentDate(prev => moment(prev).subtract(1, 'month').toDate());
    const handleNextMonth = () => setCurrentDate(prev => moment(prev).add(1, 'month').toDate());

    // Изменение значений в инпутах (без мгновенной отправки на сервер во время печати)
    const handleInputChange = (index: number, field: 'contentRub' | 'salaryRub', value: string) => {
        const updatedTimesheet = [...timesheet];
        updatedTimesheet[index] = { ...updatedTimesheet[index], [field]: value };
        setTimesheet(updatedTimesheet);
    };

    // Срабатывает, когда пользователь закончил ввод в инпут и убрал фокус (onBlur)
    const handleInputBlur = () => {
        executeAutosave(timesheet);
    };

    // Срабатывает мгновенно при клике на чекбокс отсутствия
    const handleCheckboxChange = (index: number, checked: boolean) => {
        const updatedTimesheet = [...timesheet];
        updatedTimesheet[index] = {
            ...updatedTimesheet[index],
            isAbsent: checked,
            // Если выставлено отсутствие, очищаем финансовые поля
            contentRub: checked ? '' : updatedTimesheet[index].contentRub,
            salaryRub: checked ? '' : updatedTimesheet[index].salaryRub
        };

        setTimesheet(updatedTimesheet);
        executeAutosave(updatedTimesheet); // Передаем измененный массив напрямую, минуя задержку стейта
    };

    // Подсчет суммы за текущий табель
    const currentMonthSum = useMemo(() => {
        return timesheet.reduce((sum, day) => {
            const content = Number(day.contentRub) || 0;
            const salary = Number(day.salaryRub) || 0;
            return sum + content + salary;
        }, 0);
    }, [timesheet]);

    // Общая сумма с учетом предыдущего баланса
    const totalSumWithBalance = useMemo(() => {
        return currentMonthSum + previousBalance;
    }, [currentMonthSum, previousBalance]);

    const saveBalance = async () => {
        try {
            await reportAPI.savePreviousBalance?.(
                Number(selectedMasterId),
                moment(currentDate).year(),
                moment(currentDate).month() + 1,
                previousBalance
            );
        } catch (err) {
            console.error("Ошибка сохранения баланса:", err);
        }
    };

    return (
        <div className="report-container timesheet-container">
            {/* ШАПКА / ФИЛЬТРЫ */}
            <div className="salary-filters timesheet-filters">
                <div className="month-navigation-inline">
                    <button className="arrow-btn" onClick={handlePrevMonth}> &larr; </button>
                    <span className="month-label">{monthLabel}</span>
                    <button className="arrow-btn" onClick={handleNextMonth}> &rarr; </button>
                </div>

                <div className="master-select-inline">
                    <label htmlFor="master-dropdown">СОТРУДНИК</label>
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

                {/* Блок динамического остатка */}
                <div className="previous-balance-container">
                    <label>Остаток за предыдущий месяц:</label>
                    <input
                        type="number"
                        value={previousBalance}
                        onChange={(e) => setPreviousBalance(Number(e.target.value) || 0)}
                        onBlur={saveBalance}
                        className="previous-balance-input"
                    />
                </div>

                {/* Блок итоговой суммы с индикатором статуса синхронизации */}
                <div className="total-salary-display" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '12px', color: isSaving ? 'var(--primary-blue)' : 'var(--success-green)' }}>
                        {isSaving ? '⏳ Сохранение...' : '✓ Все изменения сохранены'}
                    </span>
                    <span className="total-label">ИТОГО:</span>
                    <span className="total-value">{Number(totalSumWithBalance).toFixed(2)} руб.</span>
                </div>
            </div>

            {error && <div className="report-error">{error}</div>}
            {loading && <div className="report-loading">Загрузка данных...</div>}

            {/* ТАБЛИЦА */}
            <div className="table-wrapper">
                <table className="timesheet-table">
                    <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Отсутствие</th>
                        <th>Контент руб.</th>
                        <th>Оклад руб.</th>
                    </tr>
                    </thead>
                    <tbody>
                    {timesheet.map((day, index) => {
                        const dateObj = moment(day.date);
                        const isWeekend = dateObj.isoWeekday() === 6 || dateObj.isoWeekday() === 7;
                        const formattedDate = dateObj.format('DD.MM.YYYY dddd');
                        const rowClassName = isWeekend ? 'weekend-row' : '';

                        return (
                            <tr key={day.date} className={rowClassName}>
                                <td className="text-left-aligned date-cell">
                                    <span className={isWeekend ? 'weekend-text' : ''}>
                                        {formattedDate}
                                    </span>
                                </td>

                                <td>
                                    <label className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={day.isAbsent}
                                            onChange={(e) => handleCheckboxChange(index, e.target.checked)}
                                        />
                                        <span className="checkmark"></span>
                                    </label>
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        value={day.contentRub}
                                        onChange={(e) => handleInputChange(index, 'contentRub', e.target.value)}
                                        onBlur={handleInputBlur}
                                        className="inline-input text-right"
                                        placeholder="0"
                                        disabled={day.isAbsent}
                                    />
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        value={day.salaryRub}
                                        onChange={(e) => handleInputChange(index, 'salaryRub', e.target.value)}
                                        onBlur={handleInputBlur}
                                        className="inline-input text-right"
                                        placeholder="0"
                                        disabled={day.isAbsent}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Timesheet;