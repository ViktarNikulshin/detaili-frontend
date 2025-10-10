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

}

const EventModal: React.FC<EventModalProps> = ({
                                                   isOpen,
                                                   event,
                                                   onClose,
                                                   onEdit
                                               }) => {
    const { user } = useAuth();
    const [isTaking, setIsTaking] = useState(false);

    const isMaster = !!user?.roles?.some(role => role.name === 'MASTER');

    const handleTakeToWork = async () => {
        if (!event || !user) return;
        try {
            setIsTaking(true);
            await orderAPI.changeStatus(String(event.id), 'IN_PROGRESS', String(user.id));
            onClose();
        } catch (error) {
            console.error('Ошибка смены статуса заказа:', error);
        } finally {
            setIsTaking(false);
        }
    };
    if (!isOpen || !event) {
        return null;
    }

    const formatDateTime = (date: Date) => {
        return moment(date).format('DD.MM.YYYY HH:mm');
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
                        {event.carBrand?.name ?? "—"} {event.carModel?.name ?? ""}
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
                        <strong>Типы работ:</strong>
                        <ul className="work-types-list">
                            {event.workTypes.map(wt => (
                                <li key={wt.id}>{wt.name}</li>
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
                    <button className="edit-button" onClick={onEdit}>Редактировать</button>
                    <button className="close-button-footer" onClick={onClose}>Закрыть</button>
                </div>
            </div>
        </div>
    );
};

export default EventModal;