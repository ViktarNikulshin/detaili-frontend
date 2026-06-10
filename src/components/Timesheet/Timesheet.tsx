import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment';
import 'moment/locale/ru';
import { userAPI } from '../../services/userApi';
import '../MasterSalary/MasterSalary.css'; // Переиспользуем ваши стили

// Интерфейс мастера
interface Master {
    id: number;
    firstName: string;
    lastName: string;
    // В реальном проекте эти данные должны приходить из профиля мастера
    baseSalary?: number;
    dealRate?: number;
}

// Интерфейс строки табеля (один день)
interface TimesheetDay {
    date: string;       // YYYY-MM-DD
    isWeekend: boolean; // Является ли день выходным (Сб, Вс)
    percent: number;    // Процент выполнения (0-100)
    status: string;     // '' (Явка), 'Н' (Отгул/Неявка), 'В' (Выходной)
}

const MasterTimesheet: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [masters, setMasters] = useState<Master[]>([]);
    const [selectedMasterId, setSelectedMasterId] = useState<string>('');

    // Состояние табеля на выбранный месяц
    const [timesheet, setTimesheet] = useState<TimesheetDay[]>([]);

    // ЗАГЛУШКИ: Финансовые показатели мастера (в будущем брать из API)
    const MOCK_BASE_SALARY = 500; // Оклад
    const MOCK_DEAL_RATE = 70;    // Сумма сделки за 100% выполнение

    // Загрузка списка мастеров
    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const response = await userAPI.getUsersByRole("MASTER") || { data: [] };
                setMasters(response.data);
                if (response.data.length > 0) {
                    setSelectedMasterId(response.data[0].id.toString());
                }
            } catch (error) {
                console.error("Ошибка загрузки мастеров", error);
            }
        };
        fetchMasters();
    }, []);

    // Генерация дней месяца при смене даты или мастера
    useEffect(() => {
        if (!selectedMasterId) return;

        const daysInMonth = moment(currentDate).daysInMonth();
        const newTimesheet: TimesheetDay[] = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const currentDay = moment(currentDate).date(i);
            const isWeekend = currentDay.isoWeekday() === 6 || currentDay.isoWeekday() === 7; // Суббота или Воскресенье

            // В реальном проекте здесь нужно делать слияние (merge) с данными из БД,
            // чтобы подтягивать уже сохраненные отгулы и проценты.
            newTimesheet.push({
                date: currentDay.format('YYYY-MM-DD'),
                isWeekend: isWeekend,
                percent: isWeekend ? 0 : 100, // По умолчанию в будни 100%, в выходные 0%
                status: isWeekend ? 'В' : ''  // По умолчанию в выходные статус 'В'
            });
        }
        setTimesheet(newTimesheet);
    }, [currentDate, selectedMasterId]);

    // Навигация по месяцам
    const handlePrevMonth = () => setCurrentDate(prev => moment(prev).subtract(1, 'month').toDate());
    const handleNextMonth = () => setCurrentDate(prev => moment(prev).add(1, 'month').toDate());
    const monthLabel = useMemo(() => moment(currentDate).locale('ru').format('MMMM YYYY').toUpperCase(), [currentDate]);

    // Обработчик изменения данных в строке
    const handleRowChange = (index: number, field: keyof TimesheetDay, value: any) => {
        const updatedTimesheet = [...timesheet];
        updatedTimesheet[index] = { ...updatedTimesheet[index], [field]: value };

        // Автоматическая логика: если ставим "Н" (отгул), обнуляем процент
        if (field === 'status' && value === 'Н') {
            updatedTimesheet[index].percent = 0;
        }
        // Если меняем процент на > 0, сбрасываем статус неявки
        if (field === 'percent' && value > 0 && updatedTimesheet[index].status === 'Н') {
            updatedTimesheet[index].status = '';
        }

        setTimesheet(updatedTimesheet);
    };

    const handleSave = () => {
        console.log("Данные на отправку в БД:", timesheet);
        alert("Табель успешно сохранен!");
        // Здесь должен быть вызов API сохранения
    };

    // --- ВЫЧИСЛЕНИЯ ДЛЯ ТАБЛИЦЫ ---

    // 1. Считаем количество рабочих дней в месяце (Пн-Пт)
    const totalWorkingDays = useMemo(() => {
        return timesheet.filter(day => !day.isWeekend).length;
    }, [timesheet]);

    // 2. Стоимость одного рабочего дня (Оклад / Рабочие дни)
    const dailyBaseSalary = totalWorkingDays > 0 ? (MOCK_BASE_SALARY / totalWorkingDays) : 0;

    // 3. Итоговые суммы для подвала таблицы
    const totals = useMemo(() => {
        return timesheet.reduce((acc, day) => {
            // Сумма сделки: (Процент / 100) * Ставка
            const dealSum = (day.percent / 100) * MOCK_DEAL_RATE;

            // Сумма оклада: Если явка (статус пустой) и не выходной
            // Если нужно платить оклад даже за работу в выходной, логику можно скорректировать
            const salarySum = (day.status === '' && !day.isWeekend) ? dailyBaseSalary : 0;

            return {
                dealSum: acc.dealSum + dealSum,
                salarySum: acc.salarySum + salarySum
            };
        }, { dealSum: 0, salarySum: 0 });
    }, [timesheet, dailyBaseSalary]);

    return (
        <div className="report-container salary-logging-container">
            {/* БЛОК ФИЛЬТРОВ */}
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
                        <option value="">выберите...</option>
                        {masters.map(m => (
                            <option key={m.id} value={m.id}>{`${m.firstName} ${m.lastName}`}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ТАБЛИЦА ТАБЕЛЯ */}
            <div className="table-wrapper">
                <table className="report-table">
                    <thead>
                    <tr>
                        <th style={{ width: '20%' }}>Дата</th>
                        <th style={{ width: '20%' }}>% выполнения</th>
                        <th style={{ width: '20%' }}>Сумма (сделка)</th>
                        <th style={{ width: '20%' }}>Отгул / Статус</th>
                        <th style={{ width: '20%' }}>Сумма (оклад)</th>
                    </tr>
                    </thead>
                    <tbody>
                    {timesheet.map((day, index) => {
                        const dateObj = moment(day.date);
                        const formattedDate = dateObj.format('D MMMM'); // Например: 1 июня

                        // Вычисляем суммы для текущей строки
                        const currentDealSum = (day.percent / 100) * MOCK_DEAL_RATE;
                        const currentSalarySum = (day.status === '' && !day.isWeekend) ? dailyBaseSalary : 0;

                        // Окрашиваем строку выходного дня для наглядности
                        const rowStyle = day.isWeekend ? { backgroundColor: 'rgba(255, 255, 255, 0.03)' } : {};

                        return (
                            <tr key={day.date} style={rowStyle}>
                                {/* 1. Дата */}
                                <td className="text-left-aligned">
                                        <span style={{ color: day.isWeekend ? 'var(--error-red)' : 'inherit' }}>
                                            {formattedDate}
                                        </span>
                                </td>

                                {/* 2. Процент */}
                                <td>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={day.percent}
                                        onChange={(e) => handleRowChange(index, 'percent', Number(e.target.value))}
                                        className="inline-input text-center"
                                        style={{ width: '80px', margin: '0 auto', display: 'block' }}
                                        disabled={day.status === 'Н'} // Блокируем, если стоит отгул
                                    />
                                </td>

                                {/* 3. Сумма сделки (Автовычисление) */}
                                <td className="text-right-aligned">
                                    {currentDealSum > 0 ? currentDealSum.toFixed(1) : '0'}
                                </td>

                                {/* 4. Отгул / Статус */}
                                <td>
                                    <select
                                        value={day.status}
                                        onChange={(e) => handleRowChange(index, 'status', e.target.value)}
                                        className="inline-select"
                                        style={{ color: day.status === 'Н' ? 'var(--error-red)' : 'inherit' }}
                                    >
                                        <option value="">Явка</option>
                                        <option value="Н">Отгул (Н)</option>
                                        <option value="В">Выходной (В)</option>
                                    </select>
                                </td>

                                {/* 5. Сумма оклада (Автовычисление) */}
                                <td className="text-right-aligned">
                                    {currentSalarySum > 0 ? currentSalarySum.toFixed(1) : '0'}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>

                    {/* ПОДВАЛ ТАБЛИЦЫ С ИТОГАМИ */}
                    <tfoot>
                    <tr>
                        <td colSpan={2} className="text-right-aligned" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                            <strong>ИТОГО ЗА МЕСЯЦ:</strong>
                        </td>
                        <td className="text-right-aligned" style={{ fontSize: '18px', borderTop: '2px solid var(--primary-green)' }}>
                            {totals.dealSum.toFixed(1)}
                        </td>
                        <td></td>
                        <td className="text-right-aligned" style={{ fontSize: '18px', borderTop: '2px solid var(--primary-green)' }}>
                            {totals.salarySum.toFixed(1)}
                        </td>
                    </tr>
                    </tfoot>
                </table>
            </div>

            {/* КНОПКА СОХРАНЕНИЯ */}
            <div className="action-buttons-container" style={{ marginTop: '20px', borderRadius: 'var(--radius-md)' }}>
                <button className="add-row-green-btn save-btn" onClick={handleSave} style={{ borderRadius: 'var(--radius-md)' }}>
                    Сохранить табель
                </button>
            </div>
        </div>
    );
};

export default MasterTimesheet;