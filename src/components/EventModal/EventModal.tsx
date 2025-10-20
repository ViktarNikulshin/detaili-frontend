import React, {useState} from 'react';
import './EventModal.css';
import {CalendarEvent} from '../../types/order';
import moment from 'moment';
import {useAuth} from '../../contexts/AuthContext';
import {orderAPI} from '../../services/orderApi';

interface EventModalProps {
    isOpen: boolean;
    event: CalendarEvent | null;
    onClose: () => void;
    onEdit: () => void;
    onStatusChanged?: () => void;

}

const EventModal: React.FC<EventModalProps> = ({
                                                   isOpen,
                                                   event,
                                                   onClose,
                                                   onEdit,
                                                   onStatusChanged
                                               }) => {
    const {user} = useAuth();
    const [isTaking, setIsTaking] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const isMaster = !!user?.roles?.some(role => role.name === 'MASTER');
    const isAdmin = !!user?.roles?.some(role => role.name === 'ADMIN');

    const handleTakeToWork = async () => {
        if (!event || !user) return;
        try {
            setIsTaking(true);
            await orderAPI.changeStatus(String(event.id), 'IN_PROGRESS', String(user.id));
            if (onStatusChanged) {
                onStatusChanged();
            }
            onClose();
        } catch (error) {
            console.error('Ошибка смены статуса заказа:', error);
        } finally {
            setIsTaking(false);
        }
    };

    const handleComplete = async () => {
        if (!event || !user) return;
        try {
            setIsCompleting(true);
            await orderAPI.changeStatus(String(event.id), 'COMPLETED', String(user?.id));
            if (onStatusChanged) {
                onStatusChanged();
            }
            onClose();
        } catch (error) {
            console.error('Ошибка смены статуса заказа:', error);
        } finally {
            setIsCompleting(false);
        }
    };

    const handleCancel = async () => {
        if (!event || !window.confirm('Вы уверены, что хотите отменить этот заказ?')) return;
        try {
            setIsCancelling(true);
            // Изменяем статус на CANCELLED (предполагая, что такой статус есть в API)
            await orderAPI.changeStatus(String(event.id), 'CANCELLED', String(user?.id));

            if (onStatusChanged) {
                onStatusChanged();
            }
        } catch (error) {
            console.error('Error cancelling order:', error);
            alert('Не удалось отменить заказ.');
        } finally {
            setIsCancelling(false);
        }
    };

    if (!isOpen || !event) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Заказ №{event.id}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {/* Основная информация о заказе */}
                    <p>Клиент: <strong>{event.clientName}</strong> ({event.clientPhone})</p>
                    <p>Автомобиль: <strong>{event.carBrand?.name || '—'}</strong></p>
                    <p>Статус: <span className={`status-tag status-${event.status.toLowerCase()}`}>{event.status}</span></p>
                    <p>Время: <strong>{moment(event.start).format('DD.MM.YYYY HH:mm')} - {moment(event.end).format('HH:mm')}</strong></p>

                    {/* NEW SECTION: Работы и ЗП мастеров */}
                    {event.works && event.works.length > 0 && (
                        <div className="event-works">
                            <h3>Работы:</h3>
                            <ul>
                                {event.works.map((work, workIndex) => (
                                    <li key={workIndex}>
                                        <p>
                                            <strong>{work.workType.name}</strong>
                                            {work.comment && ` (${work.comment})`}
                                        </p>

                                        {work.assignments && work.assignments.length > 0 && (
                                            <div className="master-assignments">
                                                {work.assignments.map((assignment, assignmentIndex) => {
                                                    // Расчет: (work.cost * assignment.salaryPercent) / 100
                                                    const cost = work.cost || 0;
                                                    const percent = assignment.salaryPercent || 0;
                                                    const masterSalary = ((cost * percent) / 100).toFixed(2);

                                                    return (
                                                        <p key={assignmentIndex} className="master-earning-detail">
                                                        Мастер: **{assignment.master.firstName} {assignment.master.lastName}**

                                                    {/* Детали ЗП видны только Admin */}
                                                    {isAdmin && (
                                                        <small className="salary-info">
                                                            Процент: **{percent}%** (ЗП: <strong>{masterSalary}</strong>)
                                                        </small>
                                                    )}
                                                    {!isAdmin && <small className="salary-info-hidden">Назначен</small>}
                                                </p>
                                                    );
                                                })}
                                            </div>
                                        )}

                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {/* END NEW SECTION */}

                </div>

                <div className="modal-footer">
                    {(isMaster || isAdmin) && event.status === 'NEW' && (
                        <button
                            className="take-work-button"
                            onClick={handleTakeToWork}
                            disabled={isTaking}
                        >
                            {isTaking ? 'Берем…' : 'Взять в работу'}
                        </button>
                    )}
                    {(isMaster || isAdmin) && event.status === 'IN_PROGRESS' && (
                        <button
                            className="complete-button"
                            onClick={handleComplete}
                            disabled={isCompleting}
                        >
                            {isCompleting ? 'Завершаем…' : 'Завершить'}
                        </button>
                    )}
                    {isAdmin && event.status !== 'COMPLETED' && event.status !== 'CANCELLED' && event.status !== 'IN_PROGRESS' && (
                        <button
                            className="cancel-button" // <-- Новый класс для стилей
                            onClick={handleCancel}
                            disabled={isCancelling}
                        >
                            {isCancelling ? 'Отмена…' : 'Отменить заказ'}
                        </button>
                    )}
                    {!isMaster && <button className="edit-button" onClick={onEdit}>Редактировать</button>}
                    <button className="close-button-footer" onClick={onClose}>Закрыть</button>
                </div>
            </div>
        </div>
    );
};

export default EventModal;