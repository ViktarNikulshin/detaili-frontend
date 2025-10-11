import React, {useEffect, useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import '../OrderForm/OrderForm.css';
import {userAPI} from "../../services/userApi";

const UserForm: React.FC = () => {
    const {user} = useAuth(); // Получаем текущего пользователя
    // Состояние для данных формы
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Состояние для ошибок
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // При загрузке компонента, заполняем форму данными пользователя
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                id: user.id,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || ''
            }));
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.firstName) newErrors.firstName = "Имя обязательно для заполнения";
        if (!formData.lastName) newErrors.lastName = "Фамилия обязательна для заполнения";

        // Проверка пароля только если пользователь начал его вводить
        if (formData.newPassword || formData.confirmPassword) {
            if (formData.newPassword.length < 6) {
                newErrors.newPassword = "Новый пароль должен быть не менее 6 символов";
            }
            if (formData.newPassword !== formData.confirmPassword) {
                newErrors.confirmPassword = "Пароли не совпадают";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            // !!! ВАЖНО: Здесь будет логика отправки данных на сервер
            const dataToSend = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword

            }
            const userId = user?.id || 0
            if (user){
                userAPI.updateUser(userId, dataToSend)
            }

            alert('Профиль успешно обновлен! (Это заглушка, данные не отправлены)');
            // Очистить поля паролей после "успешной" отправки
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));
        }
    };

    return (
        // Используем класс .order-form для полного соответствия стилю
        <form className="order-form" onSubmit={handleSubmit}>
            <h2>Редактирование профиля</h2>

            {/* --- Редактирование данных --- */}
            <div className="form-group">
                <label>Имя</label>
                <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={errors.firstName ? 'error' : ''}
                />
                {errors.firstName && <div className="error-text">{errors.firstName}</div>}
            </div>

            <div className="form-group">
                <label>Фамилия</label>
                <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={errors.lastName ? 'error' : ''}
                />
                {errors.lastName && <div className="error-text">{errors.lastName}</div>}
            </div>

            <div className="form-group">
                <label>Телефон</label>
                <input
                    type="email"
                    name="email"
                    value={formData.phone}
                    disabled
                />
            </div>

            <hr/>

            {/* --- Смена пароля --- */}
            <h4>Сменить пароль</h4>
            <div className="form-group">
                <label>Текущий пароль</label>
                <input
                    type="password"
                    name="currentPassword"
                    placeholder="Оставьте пустым, если не меняете"
                    value={formData.currentPassword}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label>Новый пароль</label>
                <input
                    type="password"
                    name="newPassword"
                    placeholder="Не менее 6 символов"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className={errors.newPassword ? 'error' : ''}
                />
                {errors.newPassword && <div className="error-text">{errors.newPassword}</div>}
            </div>

            <div className="form-group">
                <label>Подтвердите новый пароль</label>
                <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? 'error' : ''}
                />
                {errors.confirmPassword && <div className="error-text">{errors.confirmPassword}</div>}
            </div>

            <button type="submit">Сохранить изменения</button>
        </form>
    );
};

export default UserForm;