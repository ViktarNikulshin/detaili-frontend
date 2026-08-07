import React, { useEffect, useState } from 'react';
import './CustomEventModal.css';
import { CustomEvent } from '../../types/order';
import { calendarEventAPI } from '../../services/calendarEventApi';
import moment from 'moment';

interface CustomEventModalProps {
    isOpen: boolean;
    event: CustomEvent | null; // null -> режим создания нового события
    initialDate?: Date | null; // предзаполнение даты при создании (например, клик по дню)
    onClose: () => void;
    onSaved: () => void; // вызывается после успешного создания/обновления/удаления
}

const CustomEventModal: React.FC<CustomEventModalProps> = ({
                                                                isOpen,
                                                                event,
                                                                initialDate,
                                                                onClose,
                                                                onSaved,
                                                            }) => {
    const isEditing = !!event;

    const [date, setDate] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        if (event) {
            setDate(event.date ? moment(event.date).format('YYYY-MM-DD') : '');
            setDescription(event.description || '');
        } else {
            setDate(initialDate ? moment(initialDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'));
            setDescription('');
        }
        setError(null);
    }, [isOpen, event, initialDate]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!date) {
            setError('Укажите дату события');
            return;
        }
        if (!description.trim()) {
            setError('Введите описание события');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            if (isEditing && event) {
                await calendarEventAPI.update(event.id, { date, description: description.trim() });
            } else {
                await calendarEventAPI.create({ date, description: description.trim() });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error('Ошибка сохранения события:', err);
            setError('Не удалось сохранить событие. Попробуйте еще раз.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!event) return;
        if (!window.confirm('Удалить это событие?')) return;

        setDeleting(true);
        setError(null);
        try {
            await calendarEventAPI.delete(event.id);
            onSaved();
            onClose();
        } catch (err) {
            console.error('Ошибка удаления события:', err);
            setError('Не удалось удалить событие.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content custom-event-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEditing ? 'Событие' : 'Новое событие'}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="custom-event-field">
                        <label htmlFor="custom-event-date">Дата:</label>
                        <input
                            id="custom-event-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="custom-event-input"
                        />
                    </div>

                    <div className="custom-event-field">
                        <label htmlFor="custom-event-description">Описание:</label>
                        <textarea
                            id="custom-event-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="custom-event-textarea"
                            placeholder="Опишите событие..."
                            rows={4}
                        />
                    </div>

                    {error && <p className="custom-event-error">{error}</p>}
                </div>

                <div className="modal-footer">
                    {isEditing && (
                        <button
                            className="cancel-button"
                            onClick={handleDelete}
                            disabled={deleting || saving}
                        >
                            {deleting ? 'Удаление…' : 'Удалить'}
                        </button>
                    )}
                    <button
                        className="take-work-button"
                        onClick={handleSave}
                        disabled={saving || deleting}
                    >
                        {saving ? 'Сохранение…' : isEditing ? 'Сохранить' : 'Создать'}
                    </button>
                    <button className="close-button-footer" onClick={onClose}>Закрыть</button>
                </div>
            </div>
        </div>
    );
};

export default CustomEventModal;
