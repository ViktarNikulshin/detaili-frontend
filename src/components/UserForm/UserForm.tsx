import React, {useEffect, useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
// Меняем импорт стилей на новый файл
import './UserForm.css';
import {userAPI} from "../../services/userApi";

// Определение типа для уведомлений (скопировано из OrderForm.tsx)
type Notification = {
    message: string;
    type: 'success' | 'error';
    visible: boolean;
}

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

    // Состояние для ошибок данных пользователя
    const [dataErrors, setDataErrors] = useState<{ [key: string]: string }>({});
    // Состояние для ошибок смены пароля
    const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});

    // Состояние для управления видимостью секции смены пароля
    const [isPasswordSectionVisible, setIsPasswordSectionVisible] = useState(false);

    // Состояние для уведомлений (ПУШ)
    const [notification, setNotification] = useState<Notification>({
        message: '',
        type: 'success',
        visible: false,
    });

    // Функция для показа уведомления (скопировано из OrderForm.tsx)
    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({message, type, visible: true});
        setTimeout(() => {
            setNotification(prev => ({...prev, visible: false}));
        }, 2000);
    };

    // При загрузке компонента, заполняем форму данными пользователя
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '' // Используем phone
            }));
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    // -------------------------------------------------------------------
    // --- Логика для Редактирования данных (Имя, Фамилия) ---
    // -------------------------------------------------------------------

    const validateData = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.firstName.trim()) newErrors.firstName = "Имя обязательно для заполнения";
        if (!formData.lastName.trim()) newErrors.lastName = "Фамилия обязательна для заполнения";

        setDataErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleDataSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateData()) {
            const dataToSend = {
                firstName: formData.firstName,
                lastName: formData.lastName
                // Пароли здесь не отправляем
            };

            const userId = user?.id || 0;

            if (user) {
                userAPI.updateUser(userId, dataToSend)
                    .then(() => showNotification('Данные профиля успешно обновлены!', 'success'))
                    .catch(() => showNotification('Ошибка при обновлении данных!', 'error'));
            }
        }
    };

    // -------------------------------------------------------------------
    // --- Логика для Смены пароля ---
    // -------------------------------------------------------------------

    const validatePassword = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.currentPassword) {
            newErrors.currentPassword = "Требуется текущий пароль";
        }

        if (formData.newPassword.length < 6) {
            newErrors.newPassword = "Новый пароль должен быть не менее 6 символов";
        }
        if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = "Пароли не совпадают";
        }

        setPasswordErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validatePassword()) {

            const username = user?.username || '';

            if (user) {
                userAPI.changePassword(username, formData.currentPassword, formData.newPassword)
                    .then(() => {
                        showNotification('Пароль успешно обновлен!', 'success');
                        // Сбрасываем поля паролей и скрываем секцию
                        setFormData(prev => ({
                            ...prev,
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                        }));
                        setPasswordErrors({});
                        setIsPasswordSectionVisible(false);
                    })
                    .catch(() => {
                        // Обработка ошибки, например, неверный текущий пароль
                        showNotification('Ошибка при смене пароля. Проверьте текущий пароль.', 'error');
                        setPasswordErrors(prev => ({...prev, currentPassword: "Неверный текущий пароль или другая ошибка"}));
                    });
            }
        }
    };


    return (
        <>
            {/* Уведомление, скопировано из OrderForm.tsx */}
            {notification.visible && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}

            <form className="order-form">
                <h2>Редактирование профиля</h2>

                {/* ---------------------------------------------------- */}
                {/* --- Секция Редактирования данных (Имя, Фамилия, Телефон) --- */}
                {/* ---------------------------------------------------- */}
                <div className="section-data">
                    <h3>Личные данные</h3>

                    <div className="form-group">
                        <label>Имя</label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className={dataErrors.firstName ? 'error' : ''}
                        />
                        {dataErrors.firstName && <div className="error-text">{dataErrors.firstName}</div>}
                    </div>

                    <div className="form-group">
                        <label>Фамилия</label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className={dataErrors.lastName ? 'error' : ''}
                        />
                        {dataErrors.lastName && <div className="error-text">{dataErrors.lastName}</div>}
                    </div>

                    <div className="form-group">
                        <label>Телефон (Неизменяемый)</label>
                        <input
                            type="tel" // Изменено на tel для семантики
                            name="phone"
                            value={formData.phone}
                            readOnly // Сделано неизменяемым
                            disabled // Дополнительно, чтобы выглядело как неактивное поле
                        />
                    </div>

                    <button type="button" className="data-submit-btn" onClick={handleDataSubmit}>Сохранить данные</button>
                </div>

                <hr/>

                {/* ---------------------------------------------------- */}
                {/* --- Секция Смены пароля --- */}
                {/* ---------------------------------------------------- */}

                {!isPasswordSectionVisible && (
                    <button type="button" className="show-password-btn" onClick={() => setIsPasswordSectionVisible(true)}>Сменить пароль</button>
                )}

                {isPasswordSectionVisible && (
                    <div className="section-password">
                        <h3 onClick={() => setIsPasswordSectionVisible(prev => !prev)} style={{cursor: 'pointer'}}>
                            Смена пароля
                        </h3>
                        <p>Для смены пароля заполните все поля:</p>

                        <div className="form-group">
                            <label>Текущий пароль</label>
                            <input
                                type="password"
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                className={passwordErrors.currentPassword ? 'error' : ''}
                            />
                            {passwordErrors.currentPassword && <div className="error-text">{passwordErrors.currentPassword}</div>}
                        </div>

                        <div className="form-group">
                            <label>Новый пароль</label>
                            <input
                                type="password"
                                name="newPassword"
                                placeholder="Не менее 6 символов"
                                value={formData.newPassword}
                                onChange={handleChange}
                                className={passwordErrors.newPassword ? 'error' : ''}
                            />
                            {passwordErrors.newPassword && <div className="error-text">{passwordErrors.newPassword}</div>}
                        </div>

                        <div className="form-group">
                            <label>Подтвердите новый пароль</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={passwordErrors.confirmPassword ? 'error' : ''}
                            />
                            {passwordErrors.confirmPassword && <div className="error-text">{passwordErrors.confirmPassword}</div>}
                        </div>

                        <div className="section-password-actions">
                            <button type="button" onClick={handlePasswordSubmit}>Сохранить пароль</button>
                            <button type="button" onClick={() => setIsPasswordSectionVisible(false)}>Отмена</button>
                        </div>

                    </div>
                )}
            </form>
        </>
    );
};

export default UserForm;