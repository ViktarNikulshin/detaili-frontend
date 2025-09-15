import React, { useState } from 'react';
import { Order } from '../../types/order';
import { orderAPI } from '../../services/api';

const OrderForm: React.FC = () => {
    const [formData, setFormData] = useState<Partial<Order>>({
        clientName: '',
        clientPhone: '',
        carBrand: '',
        carModel: '',
        vin: '',
        workType: '',
        masterId: 0,
        executionDate: '',
    });

    const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
    const [afterPhoto, setAfterPhoto] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const formDataToSend = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (value) formDataToSend.append(key, value.toString());
        });

        if (beforePhoto) formDataToSend.append('beforePhoto', beforePhoto);
        if (afterPhoto) formDataToSend.append('afterPhoto', afterPhoto);

        try {
            await orderAPI.create(formDataToSend);
            alert('Заявка создана успешно!');
        } catch (error) {
            console.error('Ошибка создания заявки:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="order-form">
            <input
                type="text"
                placeholder="Имя клиента"
                value={formData.clientName}
                onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                required
            />
            <input
                type="tel"
                placeholder="Телефон"
                value={formData.clientPhone}
                onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                required
            />
            <input
                type="text"
                placeholder="Марка машины"
                value={formData.carBrand}
                onChange={(e) => setFormData({...formData, carBrand: e.target.value})}
                required
            />
            <input
                type="text"
                placeholder="Марка машины"
                value={formData.carModel}
                onChange={(e) => setFormData({...formData, carModel: e.target.value})}
                required
            />
            <input
                type="text"
                placeholder="VIN"
                value={formData.vin}
                onChange={(e) => setFormData({...formData, vin: e.target.value})}
            />
            <textarea
                placeholder="Тип работ"
                value={formData.workType}
                onChange={(e) => setFormData({...formData, workType: e.target.value})}
                required
            />
            <input
                type="datetime-local"
                value={formData.executionDate}
                onChange={(e) => setFormData({...formData, executionDate: e.target.value})}
                required
            />
            <input
                type="file"
                accept="image/*"
                onChange={(e) => setBeforePhoto(e.target.files?.[0] || null)}
                placeholder="Фото до"
            />
            <input
                type="file"
                accept="image/*"
                onChange={(e) => setAfterPhoto(e.target.files?.[0] || null)}
                placeholder="Фото после"
            />
            <button type="submit">Создать заявку</button>
        </form>
    );
};
export default OrderForm;