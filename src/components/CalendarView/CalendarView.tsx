import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer, View, stringOrDate } from 'react-big-calendar';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { orderAPI } from '../../services/orderApi';
import { CalendarEvent, Order } from '../../types/order';
import { useAuth } from '../../contexts/AuthContext';
import './CalendarView.css';

const localizer = momentLocalizer(moment);

const CalendarView: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [currentView, setCurrentView] = useState<View>('month');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadCalendarEvents();
    }, [currentView, currentDate]);

    const loadCalendarEvents = async () => {
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

            const response = await orderAPI.getCalendar(
                moment(start).format('YYYY-MM-DDTHH:mm'),
                moment(end).format('YYYY-MM-DDTHH:mm')
            );

            const calendarEvents = response.data.map((order: Order) => ({
                id: order.id!,
                title: `${order.clientName} - ${order.carBrand}`,
                start: new Date(order.executionDate),
                end: new Date(moment(order.executionDate).add(1, 'hour').toDate()),
                clientName: order.clientName,
                carBrand: order.carBrand,
                workTypeIds: order.workTypeIds,
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
    };

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
        navigate(`/orders/${event.id}`);
    };

    if (loading) {
        return <div className="loading">Загрузка календаря...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <h1>Календарь заказов</h1>
                <div className="calendar-info">
                    <span>Всего событий: {events.length}</span>
                    <span>Текущий вид: {currentView}</span>
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
        </div>
    );
};

export default CalendarView;