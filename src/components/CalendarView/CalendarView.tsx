import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { orderAPI } from '../../services/orderApi';
import { userAPI } from '../../services/userApi'; // <--- Импортируем userAPI
import { CalendarEvent, Order } from '../../types/order';
import { User } from '../../types/user'; // <--- Импортируем тип User
import './CalendarView.css';
import EventModal from "../EventModal/EventModal";

const localizer = momentLocalizer(moment);

// Массив всех возможных статусов для фильтра
const allStatuses = [
    { value: 'all', label: 'Все статусы' },
    { value: 'NEW', label: 'Новые' },
    { value: 'IN_PROGRESS', label: 'В работе' },
    { value: 'COMPLETED', label: 'Завершены' },
    { value: 'CANCELLED', label: 'Отменены' },
];

const CalendarView: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [currentView, setCurrentView] = useState<View>('month');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    // --- НОВОЕ СОСТОЯНИЕ ДЛЯ СПИСКА МАСТЕРОВ ---
    const [masters, setMasters] = useState<User[]>([]);
    const [mastersLoading, setMastersLoading] = useState(true);
    // ---------------------------------------------

    // --- СОСТОЯНИЯ ДЛЯ ФИЛЬТРОВ ---
    const [selectedMasterId, setSelectedMasterId] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');


    const navigate = useNavigate();


    // Загрузка списка мастеров при монтировании компонента
    useEffect(() => {
        const loadMasters = async () => {
            try {
                setMastersLoading(true);
                const response = await userAPI.getUsersByRole('MASTER');
                // Добавляем опцию "Все мастера" в начало списка
                setMasters([
                    { id: 'all', firstName: 'Все', lastName: 'мастера', role: { code: 'ALL', name: 'All' } } as unknown as User,
                    ...response.data
                ]);
            } catch (err) {
                console.error('Ошибка загрузки мастеров:', err);
                // Продолжаем работу, даже если мастера не загрузились
            } finally {
                setMastersLoading(false);
            }
        };

        loadMasters();
    }, []);

    // Оборачиваем loadCalendarEvents в useCallback
    const loadCalendarEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            let start: Date;
            let end: Date;

            switch (currentView) {
                case 'month':
                    start = moment(currentDate).startOf('month').toDate();
                    end = moment(currentDate).endOf('month').toDate();
                    break;
                case 'week':
                    start = moment(currentDate).startOf('week').toDate();
                    end = moment(currentDate).endOf('week').toDate();
                    break;
                case 'day':
                    start = moment(currentDate).startOf('day').toDate();
                    end = moment(currentDate).endOf('day').toDate();
                    break;
                default:
                    start = moment(currentDate).startOf('month').toDate();
                    end = moment(currentDate).endOf('month').toDate();
            }

            // *** ВАЖНО: Адаптируйте orderAPI.getCalendar для передачи фильтров на БЭКЕНД! ***
            // Сейчас фильтры передаются только для демонстрации, что они используются.
            const masterFilter = selectedMasterId !== 'all' ? selectedMasterId : undefined;
            const statusFilter = selectedStatus !== 'all' ? selectedStatus : undefined;

            // Пример идеального вызова API с фильтрами:
            const response = await orderAPI.getCalendar(
                moment(start).format('YYYY-MM-DDTHH:mm'),
                moment(end).format('YYYY-MM-DDTHH:mm'),
                { masterId: masterFilter, status: statusFilter } // <--- Передача фильтров
            );

            const calendarEvents = response.data.map((order: Order) => ({
                id: order.id!,
                title: `${order.clientName} - ${order.carBrand?.name ?? ""} - ${order.carModel?.name ?? ""}`,
                start: new Date(order.executionDate),
                end: new Date(moment(order.executionDate).add(1, 'hour').toDate()),
                clientName: order.clientName,
                clientPhone: order.clientPhone,
                carBrand: order.carBrand,
                carModel: order.carModel,
                workTypes: order.workTypes,
                status: order.status,
                allDay: false,
            }));

            setEvents(calendarEvents);
        } catch (error) {
            console.error('Ошибка загрузки календаря:', error);
            setError('Не удалось загрузить данные календаря');
        } finally {
            setLoading(false);
        }
    }, [currentView, currentDate, selectedMasterId, selectedStatus]); // <--- Все зависимости для запуска

    // Обновляем зависимость: теперь хук запускается при изменении фильтров
    useEffect(() => {
        loadCalendarEvents();
    }, [loadCalendarEvents]); // Запускаем при изменении loadCalendarEvents (т.е. при смене фильтров/даты)

    const handleViewChange = (view: View) => {
        setCurrentView(view);
    };

    const handleDateChange = (date: Date) => {
        setCurrentDate(date);
    };

    const eventStyleGetter = (event: CalendarEvent) => {
        let backgroundColor = '#3174ad';
        let borderColor = '#1a5a8a';

        switch (event.status) {
            case 'COMPLETED':
                backgroundColor = '#28a745';
                borderColor = '#1e7e34';
                break;
            case 'IN_PROGRESS':
                backgroundColor = '#ffc107';
                borderColor = '#d39e00';
                break;
            case 'CANCELLED':
                backgroundColor = '#dc3545';
                borderColor = '#bd2130';
                break;
            case 'NEW':
            default:
                backgroundColor = '#3174ad';
                borderColor = '#1a5a8a';
        }

        return {
            style: {
                backgroundColor,
                border: `2px solid ${borderColor}`,
                borderRadius: '5px',
                opacity: 0.9,
                color: 'white',
                display: 'block',
                fontSize: '12px',
                padding: '2px 5px',
            },
        };
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedEvent(null);
    };

    const handleStatusChanged = async () => {
        await loadCalendarEvents();
    };

    if (loading || mastersLoading) {
        return <div className="loading">Загрузка календаря и мастеров...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <h1>Календарь заказов</h1>

                <div className="calendar-filters">
                    {/* Фильтр по Мастеру */}
                    <label htmlFor="master-filter">Мастер:</label>
                    <select
                        id="master-filter"
                        value={selectedMasterId}
                        onChange={(e) => setSelectedMasterId(e.target.value)}
                    >
                        {masters.map((master) => (
                            <option key={master.id} value={master.id}>
                                {master.firstName} {master.lastName}
                            </option>
                        ))}
                    </select>

                    {/* Фильтр по Статусу */}
                    <label htmlFor="status-filter" style={{ marginLeft: '15px' }}>Статус:</label>
                    <select
                        id="status-filter"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        {allStatuses.map((status) => (
                            <option key={status.value} value={status.value}>
                                {status.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="calendar-info">
                    <span>Всего событий: {events.length}</span>
                </div>
            </div>

            <div className="calendar-wrapper">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 'calc(100vh - 200px)' }}
                    eventPropGetter={eventStyleGetter}
                    views={['month', 'week', 'day', 'agenda']}
                    view={currentView}
                    date={currentDate}
                    onView={handleViewChange}
                    onNavigate={handleDateChange}
                    onSelectEvent={handleSelectEvent}
                    messages={{
                        next: "Вперед",
                        previous: "Назад",
                        today: "Сегодня",
                        month: "Месяц",
                        week: "Неделя",
                        day: "День",
                        agenda: "Повестка",
                        date: "Дата",
                        time: "Время",
                        event: "Событие",
                        noEventsInRange: "Нет событий в выбранном диапазоне"
                    }}
                />
            </div>

            <div className="calendar-legend">
                <div className="legend-item">
                    <div className="legend-color new"></div>
                    <span>Новые</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color in-progress"></div>
                    <span>В работе</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color completed"></div>
                    <span>Завершены</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color cancelled"></div>
                    <span>Отменены</span>
                </div>
            </div>
            <EventModal
                isOpen={showModal}
                event={selectedEvent}
                onClose={handleCloseModal}
                onEdit={() => navigate(`/orders/${selectedEvent?.id}`)}
                onStatusChanged={handleStatusChanged}
            />
        </div>
    );
};

export default CalendarView;