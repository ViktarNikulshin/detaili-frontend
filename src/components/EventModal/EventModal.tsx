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
            await orderAPI.changeStatus(String(event.id), 'COMPLETED', String(user.id));
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
    if (!isOpen || !event) {
        return null;
    }

    const formatDateTime = (date: Date) => {
        return moment(date).format('DD.MM.YYYY HH:mm');
    };
    const handleCancel = async () => {
        if (!event || !user) return;

        // Добавляем подтверждение перед отменой
        if (!window.confirm("Вы уверены, что хотите отменить этот заказ?")) {
            return;
        }

        try {
            setIsCancelling(true);
            // Изменяем статус на CANCELLED (предполагая, что такой статус есть в API)
            await orderAPI.changeStatus(String(event.id), 'CANCELLED', String(user.id));

            if (onStatusChanged) {
                onStatusChanged();
            }
            onClose();
        } catch (error) {
            console.error("Ошибка при отмене заказа:", error);
            alert("Не удалось отменить заказ.");
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{event.title}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {/* ... (Ваш предыдущий код модального окна) ... */}
                    <p><strong>Клиент:</strong> {event.clientName}</p>
                    <p>
                        <strong>Марка авто:</strong>{" "}
                        {event.carBrand?.name}
                    </p>
                    <p>
                        <strong>Телефон:</strong> {" "}
                        <a href={`tel:${event.clientPhone}`} className="phone-link">
                            {event.clientPhone}
                        </a>
                    </p>
                    <p>
                        <strong>Начало работ:</strong>{" "}
                        {formatDateTime(event.start)}
                    </p>
                    <p><strong>Статус:</strong> {event.status}</p>
                    <div>
                        <strong>Список работ:</strong>
                        <ul className="works-list-container">
                            {event.works.map((work, index) => (
                                <li key={work.id} className="work-item">
                                    <div className="work-header">
                                        <span className="work-title">
                                            {index + 1}. {work.workType.name}
                                        </span>
                                    </div>

                                    {work.comment && (
                                        <p className="work-comment">
                                            <strong>Комментарий:</strong> {work.comment}
                                        </p>
                                    )}

                                    {work.parts && work.parts.length > 0 && (
                                        <div className="work-parts-section">
                                            <strong>Используемые материалы:</strong>
                                            <ul className="work-parts-list">
                                                {work.parts.map(part => (
                                                    <li key={part.id} className="work-part-tag">
                                                        {part.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="modal-footer">
                    {isMaster && event.status === 'NEW' && (
                        <button
                            className="take-button"
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