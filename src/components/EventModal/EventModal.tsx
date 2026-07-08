import React, { useState } from 'react';
import './EventModal.css';
import { CalendarEvent } from '../../types/order';
import moment from 'moment';
import { useAuth } from '../../contexts/AuthContext';
import { orderAPI } from '../../services/orderApi';

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
    const { user } = useAuth();
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
            await orderAPI.changeStatus(String(event.id), 'CANCELLED', String(user?.id));
            if (onStatusChanged) {
                onStatusChanged();
            }
            onClose();
        } catch (error) {
            console.error('Error cancelling order:', error);
            alert('Не удалось отменить заказ.');
        } finally {
            setIsCancelling(false);
        }
    };

    if (!isOpen || !event) return null;

    // Безопасное извлечение названия автомобиля (так как carBrand может быть объектом)
    const carBrandName = typeof event.carBrand === 'object' && event.carBrand !== null
        ? (event.carBrand as any).name
        : event.carBrand;

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
                    <p>Автомобиль: <strong>{carBrandName || '—'}</strong></p>
                    <p>Статус: <span className={`status-tag status-${event.status.toLowerCase()}`}>{event.status}</span></p>
                    <p>Стоимость: <strong>{event.cost}</strong> </p>

                    {/* Разделенные поля начала и конца работ */}
                    <p>Начало работ: <strong>{moment(event.start).format('DD.MM.YYYY HH:mm')}</strong></p>
                    <p>Конец работ: <strong>{moment(event.end).format('DD.MM.YYYY HH:mm')}</strong></p>

                    {/* Вывод массива заказанных услуг с их цветами */}
                    {event.works && event.works.length > 0 && (
                        <div className="modal-works-section" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #334155' }}>
                            <p style={{ marginBottom: '8px', color: '#aaaaaa', fontWeight: '500' }}>Запланированные работы:</p>
                            <ul className="modal-works-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {event.works.map((w: any, idx: number) => {
                                    const workColor = w.workType?.color || w.color || '#3b82f6';
                                    const workName = w.workType?.name || w.name;
                                    const workComment = w.workType?.comment || w.comment;
                                    return (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', fontSize: '14px' }}>
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    backgroundColor: workColor,
                                                    flexShrink: 0
                                                }}
                                            />
                                            <span>{workName}</span> <p> {workComment}</p>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
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
                            className="cancel-button"
                            onClick={handleCancel}
                            disabled={isCancelling}
                        >
                            {isCancelling ? 'Отмена…' : 'Отменить заказ'}
                        </button>
                    )}

                    {/* Кнопка редактирования доступна администраторам либо тем, кто не является исключительно мастером */}
                    {(isAdmin || !isMaster) && (
                        <button className="edit-button" onClick={onEdit}>
                            Редактировать
                        </button>
                    )}

                    <button className="close-button-footer" onClick={onClose}>Закрыть</button>
                </div>
            </div>
        </div>
    );
};

export default EventModal;