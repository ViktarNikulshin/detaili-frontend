import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ru';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { orderAPI } from '../../services/orderApi';
import { userAPI } from '../../services/userApi';
import { CalendarEvent, Order } from '../../types/order';
import { User } from '../../types/user';
import './CalendarView.css';
import EventModal from "../EventModal/EventModal";
import {useAuth} from "../../contexts/AuthContext";

moment.locale('ru');
const localizer = momentLocalizer(moment);
const minTime = moment().hour(8).minute(0).toDate()
const maxTime = moment().hour(20).minute(0).toDate()

// Массив всех возможных статусов для фильтра
const allStatuses = [
    { value: 'all', label: 'Все статусы' },
    { value: 'NEW', label: 'Новые' },
    { value: 'IN_PROGRESS', label: 'В работе' },
    { value: 'COMPLETED', label: 'Завершены' },
    { value: 'CANCELLED', label: 'Отменены' },
];


const CalendarView: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();
    const isMaster = user?.roles?.length === 1 && user.roles[0].name === 'MASTER';
    const userIdString = user?.id ? String(user.id) : '';

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    // Начальное представление: 'week' или 'day' для Мастера, 'month' для других
    const initialView: View = isMaster ? 'week' : 'month';
    const [currentView, setCurrentView] = useState<View>(initialView);

    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [masters, setMasters] = useState<User[]>([]);
    const [mastersLoading, setMastersLoading] = useState(false); // Установим false, так как мастеру они не нужны

    // Если Мастер, то его ID, иначе 'all'
    const initialMasterId = isMaster ? userIdString : 'all';
    const [selectedMasterId, setSelectedMasterId] = useState<string>(initialMasterId);

    const [selectedStatus, setSelectedStatus] = useState<string>('all');


    useEffect(() => {
        // Если пользователь не Мастер, загружаем список мастеров
        if (!isMaster) {
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
        }
    }, [isMaster]);

    // Определяем доступные представления календаря
    const availableViews: View[] = useMemo(() => {
        return isMaster ? ['week', 'day'] : ['month', 'week', 'day', 'agenda'];
    }, [isMaster]);


    // Оборачиваем loadCalendarEvents в useCallback
    const loadCalendarEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            // Проверяем, что выбранное представление доступно
            const viewToUse = availableViews.includes(currentView) ? currentView : availableViews[0];

            let start: Date;
            let end: Date;

            switch (viewToUse) {
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
                    // Для других представлений (например, agenda) или дефолта
                    start = moment(currentDate).startOf('month').toDate();
                    end = moment(currentDate).endOf('month').toDate();
            }

            // Фильтр по мастеру: либо выбранный (если не 'all'), либо ID текущего мастера (если isMaster)
            const masterFilter = isMaster
                ? user?.id
                : (selectedMasterId !== 'all' ? selectedMasterId : undefined);

            const statusFilter = selectedStatus !== 'all' ? selectedStatus : undefined;

            // Вызов API с фильтрами:
            const response = await orderAPI.getCalendar(
                moment(start).format('YYYY-MM-DDTHH:mm'),
                moment(end).format('YYYY-MM-DDTHH:mm'),
                { masterId: masterFilter, status: statusFilter } // <--- Передача фильтров
            );

            const calendarEvents = response.data.map((order: Order) => ({
                id: order.id!,
                title: `${order.clientName} - ${order.carBrand?.name ?? ""}`,
                start: new Date(order.executionDate),
                end: new Date(moment(order.executionDate).add(1, 'hour').toDate()),
                clientName: order.clientName,
                clientPhone: order.clientPhone,
                carBrand: order.carBrand,
                works: order.works,
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
    }, [currentView, currentDate, selectedMasterId, selectedStatus, isMaster, user?.id, availableViews]); // <--- Все зависимости для запуска

    // Обновляем зависимость: теперь хук запускается при изменении фильтров
    useEffect(() => {
        loadCalendarEvents();
    }, [loadCalendarEvents]); // Запускаем при изменении loadCalendarEvents (т.е. при смене фильтров/даты)

    const handleViewChange = (view: View) => {
        // Убедимся, что мастер не может выбрать недоступное представление
        if (availableViews.includes(view)) {
            setCurrentView(view);
        }
    };

    const handleDateChange = (date: Date) => {
        setCurrentDate(date);
    };

    // ... (eventStyleGetter, handleSelectEvent, handleCloseModal, handleStatusChanged - остаются без изменений)
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
    // ...

    // Комбинированный loading
    const overallLoading = loading || (!isMaster && mastersLoading);

    if (overallLoading) {
        return <div className="loading">Загрузка календаря{isMaster ? '...' : ' и мастеров...'}</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <h1>Календарь заказов</h1>

                <div className="calendar-filters">
                    {/* Фильтр по Мастеру - отображается ТОЛЬКО для не-Мастеров */}
                    {!isMaster && (
                        <>
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
                        </>
                    )}

                    <label
                        htmlFor="status-filter"
                        style={isMaster ? {} : { marginLeft: '15px' }} // Убираем отступ, если нет фильтра мастеров
                    >
                        Статус:
                    </label>
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
                    // Используем ограниченный набор views
                    views={availableViews}
                    view={currentView}
                    date={currentDate}
                    min={minTime}
                    max={maxTime}
                    step={60}
                    timeslots={1}
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