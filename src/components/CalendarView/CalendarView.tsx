import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import moment from 'moment';
import 'moment/locale/ru';
import { useNavigate } from 'react-router-dom';
import { orderAPI, OrderPayload } from '../../services/orderApi';
import { userAPI } from '../../services/userApi';
import { calendarEventAPI } from '../../services/calendarEventApi';
import { CalendarEvent, CustomEvent, Order } from '../../types/order';
import { User } from '../../types/user';
import './CalendarView.css';
import EventModal from '../EventModal/EventModal';
import CustomEventModal from '../CustomEventModal/CustomEventModal';
import { useAuth } from '../../contexts/AuthContext';

moment.locale('ru');

const allStatuses = [
    { value: 'all', label: 'Все статусы' },
    { value: 'NEW', label: 'Новые' },
    { value: 'IN_PROGRESS', label: 'В работе' },
    { value: 'COMPLETED', label: 'Завершены' },
    { value: 'CANCELLED', label: 'Отменены' },
];

const CalendarView: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isMaster = user?.roles?.length === 1 && user.roles[0].name === 'MASTER';
    const userIdString = user?.id ? String(user.id) : '';
    const canCreateOrderOrEvent = !isMaster;

    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [masters, setMasters] = useState<User[]>([]);
    const [mastersLoading, setMastersLoading] = useState(true);

    /* ---------- ПРОИЗВОЛЬНЫЕ СОБЫТИЯ (не заказы) ---------- */
    const [showCustomEventModal, setShowCustomEventModal] = useState(false);
    const [selectedCustomEvent, setSelectedCustomEvent] = useState<CustomEvent | null>(null);
    const [customEventInitialDate, setCustomEventInitialDate] = useState<Date | null>(null);

    const initialMasterId = isMaster ? userIdString : 'all';
    const [selectedMasterId, setSelectedMasterId] = useState<string>(initialMasterId);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    /* ---------- ФИЛЬТРЫ ---------- */
    const masterFilter = useMemo(() => {
        return isMaster ? userIdString : selectedMasterId !== 'all' ? selectedMasterId : undefined;
    }, [isMaster, userIdString, selectedMasterId]);

    const statusFilter = useMemo(() => {
        return selectedStatus !== 'all' ? selectedStatus : undefined;
    }, [selectedStatus]);

    /* ---------- ЗАГРУЗКА МАСТЕРОВ ---------- */
    useEffect(() => {
        if (!isMaster) {
            const loadMasters = async () => {
                try {
                    setMastersLoading(true);
                    const { data } = await userAPI.getUsersByRole('MASTER');
                    setMasters([
                        { id: 'all', firstName: 'Все', lastName: 'мастера', roles: [{ name: 'ALL' }] } as unknown as User,
                        ...data,
                    ]);
                } catch (err) {
                    console.error('Ошибка загрузки мастеров:', err);
                } finally {
                    setMastersLoading(false);
                }
            };
            loadMasters();
        } else {
            setMastersLoading(false);
        }
    }, [isMaster]);

    /* ---------- FETCH EVENTS (eventSources) ---------- */
    const fetchEvents = useCallback(
        async (fetchInfo: any, successCallback: any, failureCallback: any) => {
            try {
                const { start, end } = fetchInfo;
                const response = await orderAPI.getCalendar(
                    moment(start).format('YYYY-MM-DDTHH:mm'),
                    moment(end).format('YYYY-MM-DDTHH:mm'),
                    { masterId: masterFilter, status: statusFilter }
                );

                const calendarEvents = response.data.map((order: Order) => {
                    const workColors: string[] = order.works
                        ?.map((w: any) => w.workType?.color || w.color)
                        .filter(Boolean) || [];
                    const workName: string[] = order.works
                        ?.map((w: any) => ' ' + w.workType?.name)
                        .filter(Boolean) || [];
                    return {
                        id: order.id,
                        // eslint-disable-next-line no-useless-concat
                        title: `${order.carBrand ?? ''}` + ' ' + workName,
                        start: order.arrivalDate,
                        end: order.deliveryDate,
                        cost: order.orderCost,
                        extendedProps: {
                            clientName: order.clientName,
                            clientPhone: order.clientPhone,
                            carBrand: order.carBrand,
                            works: order.works,
                            status: order.status,
                            workColors: workColors.length > 0 ? workColors : ['#3b82f6']
                        }
                    };
                });

                successCallback(calendarEvents);
            } catch (err) {
                console.error('Ошибка загрузки календаря:', err);
                failureCallback(err);
            }
        },
        [masterFilter, statusFilter]
    );

    /* ---------- FETCH ПРОИЗВОЛЬНЫХ СОБЫТИЙ (eventSources) ---------- */
    const fetchCustomEvents = useCallback(
        async (fetchInfo: any, successCallback: any, failureCallback: any) => {
            try {
                const { start, end } = fetchInfo;
                const response = await calendarEventAPI.getEvents(
                    moment(start).format('YYYY-MM-DD'),
                    moment(end).format('YYYY-MM-DD')
                );

                const customCalendarEvents = response.data.map((customEvent: CustomEvent) => ({
                    id: `${customEvent.id}`,
                    title: customEvent.description,
                    start: customEvent.date,
                    allDay: true,
                    extendedProps: {
                        entityType: 'CUSTOM_EVENT',
                        originalId: customEvent.id,
                        description: customEvent.description,
                        date: customEvent.date,
                    },
                }));

                successCallback(customCalendarEvents);
            } catch (err) {
                console.error('Ошибка загрузки событий календаря:', err);
                failureCallback(err);
            }
        },
        []
    );

    /* ---------- ОБРАБОТЧИКИ ---------- */
    const handleEventClick = useCallback((clickInfo: any) => {
        const ev = clickInfo.event;

        if (ev.extendedProps.entityType === 'CUSTOM_EVENT') {
            setSelectedCustomEvent({
                id: ev.extendedProps.originalId,
                entityType: 'CUSTOM_EVENT',
                date: ev.extendedProps.date,
                description: ev.extendedProps.description,
            });
            setCustomEventInitialDate(null);
            setShowCustomEventModal(true);
            return;
        }

        setSelectedEvent({
            id: ev.id,
            title: ev.title,
            start: ev.start,
            end: ev.end,
            clientName: ev.extendedProps.clientName,
            clientPhone: ev.extendedProps.clientPhone,
            carBrand: ev.extendedProps.carBrand,
            cost: ev.extendedProps.cost,
            works: ev.extendedProps.works,
            status: ev.extendedProps.status,
        });
        setShowModal(true);
    }, []);

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedEvent(null);
    };

    const handleStatusChanged = () => {
        calendarRef.current?.getApi().refetchEvents();
    };

    /* ---------- ОБРАБОТЧИКИ ПРОИЗВОЛЬНЫХ СОБЫТИЙ ---------- */
    const handleOpenCreateCustomEvent = (initialDate: Date | null = null) => {
        setSelectedCustomEvent(null);
        setCustomEventInitialDate(initialDate);
        setShowCustomEventModal(true);
    };

    const handleCloseCustomEventModal = () => {
        setShowCustomEventModal(false);
        setSelectedCustomEvent(null);
        setCustomEventInitialDate(null);
    };

    const handleCustomEventSaved = () => {
        calendarRef.current?.getApi().refetchEvents();
    };

    const handleDateClick = useCallback((dateClickInfo: any) => {
        handleOpenCreateCustomEvent(dateClickInfo.date);
    }, []);

    /* ---------- ПЕРЕТАСКИВАНИЕ/РЕСАЙЗ ПРОИЗВОЛЬНОГО СОБЫТИЯ ---------- */
    const handleCustomEventUpdate = async (info: any) => {
        const { event } = info;
        const originalId = event.extendedProps.originalId;

        try {
            await calendarEventAPI.update(originalId, {
                date: moment(event.start).format('YYYY-MM-DD'),
                description: event.extendedProps.description,
            });
            calendarRef.current?.getApi().refetchEvents();
        } catch (err) {
            console.error('Ошибка обновления события:', err);
            info.revert();
        }
    };

    /* ---------- ОБНОВЛЕННЫЙ ОБРАБОТЧИК ПЕРЕТАСКИВАНИЯ И РЕЦАЙЗА ЗАКАЗОВ ---------- */
    const handleEventUpdate = async (info: any) => {
        const { event } = info;

        if (event.extendedProps.entityType === 'CUSTOM_EVENT') {
            return handleCustomEventUpdate(info);
        }

        const id = event.id;

        try {
            // 1. Получаем актуальный заказ с бэкенда, чтобы узнать изначальные параметры
            const { data: currentOrder } = await orderAPI.getById(id);

            // 2. Рассчитываем новую дату начала заказа
            const newStartMoment = moment(event.start);

            // 3. Вычисляем новую дату окончания (deliveryDate)
            let newEndStr: string;

            if (event.end) {
                // Если FullCalendar передает точную дату окончания (при ресайзе или корректном драге), используем её
                newEndStr = moment(event.end).format('YYYY-MM-DDTHH:mm');
            } else {
                // Если по какой-то причине event.end отсутствует, вычисляем оригинальную длительность в мс и прибавляем к новой дате
                const originalDurationMs = moment(currentOrder.deliveryDate).diff(moment(currentOrder.arrivalDate));
                newEndStr = moment(newStartMoment).add(originalDurationMs, 'milliseconds').format('YYYY-MM-DDTHH:mm');
            }

            // 4. Формируем payload с сохраненной или обновленной длительностью
            const payload: OrderPayload = {
                clientName: currentOrder.clientName,
                clientPhone: currentOrder.clientPhone,
                carBrand: currentOrder.carBrand,
                vin: currentOrder.vin,
                works: currentOrder.works,
                arrivalDate: newStartMoment.format('YYYY-MM-DDTHH:mm'),
                deliveryDate: newEndStr, // Теперь дата окончания динамическая и корректная!
                orderCost: currentOrder.orderCost,
                executionTimeByMaster: currentOrder.executionTimeByMaster,
                infoSource: currentOrder.infoSource,
            };

            // 5. Отправляем изменения на бэкенд и обновляем календарную сетку
            await orderAPI.update(id, payload);
            calendarRef.current?.getApi().refetchEvents();
        } catch (err) {
            console.error('Ошибка обновления события:', err);
            info.revert(); // Возвращаем карточку на место в интерфейсе, если бэкенд ответил ошибкой
        }
    };

    const calendarRef = useRef<any>(null);
    const overallLoading = !isMaster && mastersLoading;

    if (overallLoading) {
        return <div className="loading">Загрузка мастеров...</div>;
    }

    return (
        <div className="calendar-container">
            {/* ---------- ХЕДЕР ---------- */}
            <div className="calendar-header">
                <h1>Календарь заказов</h1>

                {canCreateOrderOrEvent && (
                    <div className="calendar-header-actions">
                        <button
                            type="button"
                            className="create-order-btn"
                            onClick={() => navigate('/orders/new')}
                        >
                            <span className="button-text-desktop">+ Создать заказ</span>
                            <span className="button-icon-mobile">+</span>
                        </button>
                        <button
                            type="button"
                            className="add-custom-event-button"
                            onClick={() => handleOpenCreateCustomEvent()}
                        >
                            <span className="button-text-desktop">+ Добавить событие</span>
                            <span className="button-icon-mobile">+</span>
                        </button>
                    </div>
                )}

                <div className="calendar-filters">
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
                        style={isMaster ? {} : { marginLeft: '15px' }}
                    >
                        Статус:
                    </label>
                    <select
                        id="status-filter"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        {allStatuses.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ---------- КАЛЕНДАРЬ ---------- */}
            <div className="calendar-wrapper">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    initialView={'dayGridMonth'}
                    headerToolbar={{
                        left: 'prev title next',
                        center: '',
                        right: isMaster
                            ? 'dayGridMonth,timeGridWeek,timeGridDay'
                            : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                    }}
                    buttonText={{
                        today: 'Сегодня',
                        month: 'Месяц',
                        week: 'Неделя',
                        day: 'День',
                        list: 'Повестка',
                    }}
                    locale="ru"
                    firstDay={1}
                    height="100%"
                    slotMinTime="09:00:00"
                    slotMaxTime="19:00:00"
                    slotDuration="01:00:00"
                    editable={true}
                    eventDrop={handleEventUpdate}
                    eventResize={handleEventUpdate}
                    eventClick={handleEventClick}
                    dateClick={canCreateOrderOrEvent ? handleDateClick : undefined}
                    noEventsContent="Нет событий в выбранном диапазоне"
                    eventSources={[
                        {
                            events: fetchEvents,
                            id: 'orders-source',
                        },
                        {
                            events: fetchCustomEvents,
                            id: 'custom-events-source',
                        },
                    ]}
                    eventContent={(eventInfo) => {
                        if (eventInfo.event.extendedProps.entityType === 'CUSTOM_EVENT') {
                            return (
                                <div className="fc-custom-event-card fc-custom-event-card--custom">
                                    <div className="fc-custom-event-body fc-custom-event-body--custom">
                                        <span className="fc-custom-event-icon">📌</span>
                                        <span className="fc-custom-event-title" title={eventInfo.event.title}>
                                            {eventInfo.event.title}
                                        </span>
                                    </div>
                                </div>
                            );
                        }

                        const colors: string[] = eventInfo.event.extendedProps.workColors || [];
                        return (
                            <div className="fc-custom-event-card">

                                {/* ФОНОВЫЙ СЛОЙ (Вертикальные полосы услуг) */}
                                <div className="fc-custom-bg-colors">
                                    {colors.map((color, idx) => (
                                        <div
                                            key={idx}
                                            style={{ backgroundColor: color, flex: 1, height: '100%' }}
                                        />
                                    ))}
                                </div>

                                {/* ТЕКСТОВЫЙ СЛОЙ — Управляется полностью из CalendarView.css */}
                                <div className="fc-custom-event-body">
                <span className="fc-custom-event-title" title={eventInfo.event.title}>
                    {eventInfo.event.title}
                </span>
                                </div>

                            </div>
                        );
                    }}
                />
            </div>

            {/* ---------- МОДАЛКА ЗАКАЗА ---------- */}
            <EventModal
                isOpen={showModal}
                event={selectedEvent}
                onClose={handleCloseModal}
                onEdit={() => navigate(`/orders/${selectedEvent?.id}`)}
                onStatusChanged={handleStatusChanged}
            />

            {/* ---------- МОДАЛКА ПРОИЗВОЛЬНОГО СОБЫТИЯ ---------- */}
            <CustomEventModal
                isOpen={showCustomEventModal}
                event={selectedCustomEvent}
                initialDate={customEventInitialDate}
                onClose={handleCloseCustomEventModal}
                onSaved={handleCustomEventSaved}
            />
        </div>
    );
};

export default CalendarView;