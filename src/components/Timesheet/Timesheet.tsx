import React, { useState, useEffect, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ruLocale from '@fullcalendar/core/locales/ru';
import moment from 'moment';
import 'moment/locale/ru';

import { userAPI } from '../../services/userApi';
// Предполагается, что у вас появится timesheetAPI. Пока используем заглушки.
// import { timesheetAPI } from '../../services/timesheetApi';

import '../MasterSalary/MasterSalary.css'; // Переиспользуем общие стили контейнера и фильтров
import './Timesheet.css'; // Специфичные стили для календаря

// Типы
interface Master {
    id: number;
    firstName: string;
    lastName: string;
}

type AttendanceType = 'PRESENT' | 'ABSENT' | 'DAY_OFF' | 'VACATION' | 'SICK';

interface TimesheetRecord {
    id?: number;
    masterId: number;
    date: string; // 'YYYY-MM-DD'
    attendanceType: AttendanceType;
    completionPercentage: number; // 0-100
}

const ATTENDANCE_LABELS: Record<AttendanceType, { label: string, color: string }> = {
    PRESENT: { label: 'Явка', color: '#28a745' }, // success-green
    ABSENT: { label: 'Неявка', color: '#dc3545' }, // error-red
    DAY_OFF: { label: 'Выходной', color: '#6c757d' }, // gray
    VACATION: { label: 'Отпуск', color: '#5babff' }, // primary-blue
    SICK: { label: 'Больничный', color: '#a67eff' } // accent-purple
};

const MasterTimesheet: React.FC = () => {
    const calendarRef = useRef<FullCalendar>(null);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [masters, setMasters] = useState<Master[]>([]);
    const [selectedMasterId, setSelectedMasterId] = useState<string>('');
    const [records, setRecords] = useState<TimesheetRecord[]>([]);

    // Переключатель видов: 'attendance' (Явка) | 'performance' (Процент)
    const [viewMode, setViewMode] = useState<'attendance' | 'performance'>('attendance');

    // Состояние модального окна
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [editForm, setEditForm] = useState<{ attendanceType: AttendanceType, completionPercentage: number }>({
        attendanceType: 'PRESENT',
        completionPercentage: 0
    });

    // Загрузка менеджере
    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const response = await userAPI.getUsersByRole("MANAGER") || { data: [] };
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

    // Загрузка данных табеля (Mock)
    useEffect(() => {
        if (!selectedMasterId) return;
        // Здесь должен быть API вызов. Для демонстрации генерируем фейковые данные:
        // timesheetAPI.getRecords(selectedMasterId, startOfMonth, endOfMonth)
        const mockRecords: TimesheetRecord[] = [
            { id: 1, masterId: Number(selectedMasterId), date: moment(currentDate).startOf('month').format('YYYY-MM-DD'), attendanceType: 'PRESENT', completionPercentage: 100 },
            { id: 2, masterId: Number(selectedMasterId), date: moment(currentDate).startOf('month').add(1, 'day').format('YYYY-MM-DD'), attendanceType: 'PRESENT', completionPercentage: 85 },
            { id: 3, masterId: Number(selectedMasterId), date: moment(currentDate).startOf('month').add(2, 'day').format('YYYY-MM-DD'), attendanceType: 'SICK', completionPercentage: 0 },
        ];
        setRecords(mockRecords);
    }, [selectedMasterId, currentDate]);

    // Управление датой через кастомные кнопки
    const handlePrevMonth = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.prev();
            setCurrentDate(calendarApi.getDate());
        }
    };

    const handleNextMonth = () => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.next();
            setCurrentDate(calendarApi.getDate());
        }
    };

    const monthLabel = useMemo(() => moment(currentDate).locale('ru').format('MMMM YYYY').toUpperCase(), [currentDate]);

    // Обработка клика по дню в календаре
    const handleDateClick = (arg: { dateStr: string }) => {
        if (!selectedMasterId) return alert('Выберите менеджера');

        const existingRecord = records.find(r => r.date === arg.dateStr);
        setSelectedDate(arg.dateStr);
        setEditForm({
            attendanceType: existingRecord?.attendanceType || 'PRESENT',
            completionPercentage: existingRecord?.completionPercentage || 0
        });
        setIsModalOpen(true);
    };

    // Сохранение записи из модалки
    const handleSaveRecord = () => {
        const newRecord: TimesheetRecord = {
            masterId: Number(selectedMasterId),
            date: selectedDate,
            attendanceType: editForm.attendanceType,
            completionPercentage: editForm.completionPercentage
        };

        // Заглушка: обновляем локальный стейт (здесь должен быть API POST/PUT)
        setRecords(prev => {
            const filtered = prev.filter(r => r.date !== selectedDate);
            return [...filtered, newRecord];
        });

        setIsModalOpen(false);
    };

    // Кастомный рендер контента внутри ячейки календаря
    const renderEventContent = (eventInfo: any) => {
        const record = eventInfo.event.extendedProps as TimesheetRecord;

        if (viewMode === 'attendance') {
            const config = ATTENDANCE_LABELS[record.attendanceType];
            return (
                <div className="calendar-badge" style={{ backgroundColor: config.color }}>
                    {config.label}
                </div>
            );
        } else {
            // Режим процента выполнения
            const isZero = record.completionPercentage === 0;
            return (
                <div className={`performance-circle ${isZero ? 'zero' : ''}`}>
                    {record.completionPercentage}%
                </div>
            );
        }
    };

    // Подготовка событий для календаря
    const calendarEvents = records.map(record => ({
        id: record.id?.toString() || record.date,
        date: record.date,
        extendedProps: record // Передаем все данные в пропсы события
    }));

    return (
        <div className="report-container salary-logging-container">
            {/* ФИЛЬТРЫ (В стиле предыдущей вкладки) */}
            <div className="salary-filters">
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
                        <option value="">выберите...</option>
                        {masters.map(m => (
                            <option key={m.id} value={m.id}>{`${m.firstName} ${m.lastName}`}</option>
                        ))}
                    </select>
                </div>

                {/* ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ */}
                <div className="view-mode-toggle">
                    <button
                        className={`toggle-btn ${viewMode === 'attendance' ? 'active' : ''}`}
                        onClick={() => setViewMode('attendance')}
                    >
                        Явка
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'performance' ? 'active' : ''}`}
                        onClick={() => setViewMode('performance')}
                    >
                        Выполнение задач
                    </button>
                </div>
            </div>

            {/* КАЛЕНДАРЬ */}
            <div className="timesheet-calendar-wrapper">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    locale={ruLocale}
                    headerToolbar={false} // Отключаем стандартный хедер, используем свой (month-navigation-inline)
                    firstDay={1} // Понедельник
                    height="auto"
                    events={calendarEvents}
                    dateClick={handleDateClick}
                    eventContent={renderEventContent}
                />
            </div>

            {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ */}
            {isModalOpen && (
                <div className="timesheet-modal-overlay">
                    <div className="timesheet-modal">
                        <h3>Запись на {moment(selectedDate).format('DD.MM.YYYY')}</h3>

                        <div className="form-group">
                            <label>Статус:</label>
                            <select
                                className="inline-select"
                                value={editForm.attendanceType}
                                onChange={(e) => setEditForm({...editForm, attendanceType: e.target.value as AttendanceType})}
                            >
                                {Object.entries(ATTENDANCE_LABELS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group mt-3">
                            <label>Выполнение задач (%):</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="inline-input"
                                value={editForm.completionPercentage}
                                onChange={(e) => setEditForm({...editForm, completionPercentage: Number(e.target.value)})}
                                disabled={editForm.attendanceType !== 'PRESENT'} // Блокируем, если не явка
                            />
                        </div>

                        <div className="action-buttons-container mt-4" style={{ borderRadius: 'var(--radius-md)' }}>
                            <button className="add-row-green-btn save-btn" onClick={handleSaveRecord}>Сохранить</button>
                            <button className="add-row-green-btn cancel-btn" onClick={() => setIsModalOpen(false)}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterTimesheet;