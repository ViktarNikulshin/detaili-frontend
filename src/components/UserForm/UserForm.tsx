import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import './UserForm.css';
import { userAPI } from "../../services/userApi";
import { Role } from '../../types/user'; // Убедитесь, что тип Role импортирован

// Определение типа для уведомлений
type Notification = {
    message: string;
    type: 'success' | 'error';
    visible: boolean;
}

const UserForm: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Определяем, находимся ли мы на странице создания нового пользователя
    const isCreateMode = location.pathname === '/users/new';

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        username: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        roleIds: [] as number[],
    });

    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isPasswordSectionVisible, setIsPasswordSectionVisible] = useState(false);
    const [notification, setNotification] = useState<Notification>({
        message: '', type: 'success', visible: false,
    });

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type, visible: true });
        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 2000);
    };

    // Загрузка данных в зависимости от режима
    useEffect(() => {
        if (isCreateMode) {
            // В режиме создания загружаем только доступные роли
            userAPI.getAllRoles()
                .then(response => setAllRoles(response.data))
                .catch(() => showNotification('Ошибка загрузки ролей!', 'error'));
        } else if (user) {
            // В режиме редактирования профиля заполняем данные текущего пользователя
            setFormData(prev => ({
                ...prev,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.username || '' // Используем username, который является телефоном
            }));
        }
    }, [user, isCreateMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleChange = (roleId: number) => {
        setFormData(prev => {
            const newRoleIds = prev.roleIds.includes(roleId)
                ? prev.roleIds.filter(id => id !== roleId)
                : [...prev.roleIds, roleId];
            return { ...prev, roleIds: newRoleIds };
        });
    };

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.firstName.trim()) newErrors.firstName = "Имя обязательно";
        if (!formData.lastName.trim()) newErrors.lastName = "Фамилия обязательна";
        if (isCreateMode) {
            if (!formData.phone.trim()) newErrors.phone = "Телефон обязателен";
            if (formData.newPassword.length < 6) newErrors.newPassword = "Пароль должен быть не менее 6 символов";
            if (formData.newPassword !== formData.confirmPassword) newErrors.confirmPassword = "Пароли не совпадают";
            if (formData.roleIds.length === 0) newErrors.roles = "Выберите хотя бы одну роль";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            const selectedRoles: Role[] = allRoles.filter(role =>
                formData.roleIds.includes(role.id)
            );
            const newUser = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                username: formData.username,
                roles: selectedRoles,
            };
            // ПРЕДПОЛОЖЕНИЕ: у вас есть метод createUser в userAPI
            await userAPI.createUser(newUser);
            showNotification('Пользователь успешно создан!', 'success');
            setTimeout(() => navigate('/users'), 2000);
        } catch (error) {
            showNotification('Ошибка при создании пользователя!', 'error');
            console.error(error);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            const dataToSend = { firstName: formData.firstName, lastName: formData.lastName };
            await userAPI.updateUser(user!.id, dataToSend);
            showNotification('Данные профиля обновлены!', 'success');
        } catch {
            showNotification('Ошибка при обновлении данных!', 'error');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const pwdErrors: { [key: string]: string } = {};
        if (!formData.currentPassword) pwdErrors.currentPassword = "Требуется текущий пароль";
        if (formData.newPassword.length < 6) pwdErrors.newPassword = "Новый пароль должен быть не менее 6 символов";
        if (formData.newPassword !== formData.confirmPassword) pwdErrors.confirmPassword = "Пароли не совпадают";

        if (Object.keys(pwdErrors).length > 0) {
            setErrors(pwdErrors);
            return;
        }

        try {
            await userAPI.changePassword(user!.username, formData.currentPassword, formData.newPassword);
            showNotification('Пароль успешно обновлен!', 'success');
            setIsPasswordSectionVisible(false);
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
            setErrors({});
        } catch {
            showNotification('Ошибка при смене пароля. Проверьте текущий пароль.', 'error');
            setErrors({ currentPassword: "Неверный текущий пароль" });
        }
    };

    // --- Рендеринг формы создания пользователя ---
    if (isCreateMode) {
        return (
            <>
                {notification.visible && <div className={`notification ${notification.type}`}>{notification.message}</div>}
                <form onSubmit={handleCreateUser} className="order-form">
                    <h2>Создание нового пользователя</h2>
                    <div className="form-group">
                        <label>Имя</label>
                        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={errors.firstName ? 'error' : ''} />
                        {errors.firstName && <div className="error-text">{errors.firstName}</div>}
                    </div>
                    <div className="form-group">
                        <label>Фамилия</label>
                        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={errors.lastName ? 'error' : ''} />
                        {errors.lastName && <div className="error-text">{errors.lastName}</div>}
                    </div>
                    <div className="form-group">
                        <label>Телефон</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={errors.phone ? 'error' : ''} />
                        {errors.phone && <div className="error-text">{errors.phone}</div>}
                    </div>
                    <div className="form-group">
                        <label>Login</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} className={errors.phone ? 'error' : ''} />
                        {errors.username && <div className="error-text">{errors.username}</div>}
                    </div>
                    <div className="form-group">
                        <label>Роли</label>
                        <div className="checkbox-container-vertical">
                            {allRoles.map(role => (
                                <div key={role.id} className="checkbox-item">
                                    <input type="checkbox" id={`role-${role.id}`} checked={formData.roleIds.includes(role.id)} onChange={() => handleRoleChange(role.id)} />
                                    <label htmlFor={`role-${role.id}`}>{role.name}</label>
                                </div>
                            ))}
                        </div>
                        {errors.roles && <div className="error-text">{errors.roles}</div>}
                    </div>
                    <button type="submit" className="data-submit-btn">Создать пользователя</button>
                </form>
            </>
        );
    }

    // --- Рендеринг формы редактирования профиля ---
    return (
        <>
            {notification.visible && <div className={`notification ${notification.type}`}>{notification.message}</div>}
            <form className="order-form">
                <h2>Редактирование профиля</h2>
                <div className="section-data">
                    <h3>Личные данные</h3>
                    <div className="form-group"><label>Имя</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={errors.firstName ? 'error' : ''} />{errors.firstName && <div className="error-text">{errors.firstName}</div>}</div>
                    <div className="form-group"><label>Фамилия</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={errors.lastName ? 'error' : ''} />{errors.lastName && <div className="error-text">{errors.lastName}</div>}</div>
                    <div className="form-group"><label>Телефон (Неизменяемый)</label><input type="tel" name="phone" value={formData.phone} readOnly disabled /></div>
                    <button type="button" className="data-submit-btn" onClick={handleUpdateProfile}>Сохранить данные</button>
                </div>
                <hr />
                {!isPasswordSectionVisible && <button type="button" className="show-password-btn" onClick={() => setIsPasswordSectionVisible(true)}>Сменить пароль</button>}
                {isPasswordSectionVisible && (
                    <div className="section-password">
                        <h3 onClick={() => setIsPasswordSectionVisible(false)} style={{ cursor: 'pointer' }}>Смена пароля</h3>
                        <div className="form-group"><label>Текущий пароль</label><input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} className={errors.currentPassword ? 'error' : ''} />{errors.currentPassword && <div className="error-text">{errors.currentPassword}</div>}</div>
                        <div className="form-group"><label>Новый пароль</label><input type="password" name="newPassword" placeholder="Не менее 6 символов" value={formData.newPassword} onChange={handleChange} className={errors.newPassword ? 'error' : ''} />{errors.newPassword && <div className="error-text">{errors.newPassword}</div>}</div>
                        <div className="form-group"><label>Подтвердите новый пароль</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={errors.confirmPassword ? 'error' : ''} />{errors.confirmPassword && <div className="error-text">{errors.confirmPassword}</div>}</div>
                        <div className="section-password-actions">
                            <button type="button" onClick={handleChangePassword}>Сохранить пароль</button>
                            <button type="button" onClick={() => setIsPasswordSectionVisible(false)}>Отмена</button>
                        </div>
                    </div>
                )}
            </form>
        </>
    );
};

export default UserForm;