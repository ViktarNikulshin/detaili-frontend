import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { userAPI } from '../../services/userApi';
import { User, Role } from '../../types/user';
import './UserRoleForm.css';

// 1. Добавлен тип Notification
type Notification = {
    message: string;
    type: 'success' | 'error';
    visible: boolean;
};

const schema = Yup.object().shape({
    roleIds: Yup.array().of(Yup.number().required()).min(1, "Пользователю должна быть назначена хотя бы одна роль").required(),
});

type UserRoleFormValues = {
    roleIds: number[];
};

const UserRoleForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 2. Добавлено состояние для уведомления
    const [notification, setNotification] = useState<Notification>({
        message: '',
        type: 'success',
        visible: false,
    });

    const { control, handleSubmit, reset, formState: { errors } } = useForm<UserRoleFormValues>({
        resolver: yupResolver(schema),
        defaultValues: { roleIds: [] },
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [userResponse, rolesResponse] = await Promise.all([
                    userAPI.getUserById(id),
                    userAPI.getAllRoles(),
                ]);

                const userData = userResponse.data;
                setUser(userData);
                setAllRoles(rolesResponse.data);

                const currentUserRoleIds = userData.roles?.map((role: Role) => role.id) || [];
                reset({ roleIds: currentUserRoleIds });

            } catch (err) {
                setError('Ошибка загрузки данных пользователя.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, reset]);

    // 3. Добавлена функция для отображения уведомления
    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type, visible: true });
        setTimeout(() => {
            setNotification((prev) => ({ ...prev, visible: false }));
        }, 2000);
    };

    // 4. Обновлена функция onSubmit
    const onSubmit = async (data: UserRoleFormValues) => {
        if (!id) return;
        try {
            await userAPI.updateUserRoles(id, data.roleIds);
            showNotification('Роли пользователя успешно обновлены!', 'success');
            setTimeout(() => {
                navigate('/users');
            }, 2000); // Задержка для того, чтобы пользователь успел увидеть уведомление
        } catch (err) {
            showNotification('Не удалось обновить роли.', 'error');
            console.error(err);
        }
    };

    if (loading) return <p className="form-message">Загрузка данных...</p>;
    if (error && !notification.visible) return <p className="form-message error">{error}</p>;
    if (!user) return <p className="form-message">Пользователь не найден.</p>;

    return (
        // 5. Добавлен JSX для уведомления и обертка <>
        <>
            {notification.visible && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="user-role-form">
                <h2>Редактирование ролей для {user.firstName} {user.lastName}</h2>

                <div className="form-group">
                    <label className="roles-label">Роли:</label>
                    <div className="checkbox-container">
                        {allRoles.map((role) => (
                            <Controller
                                key={role.id}
                                name="roleIds"
                                control={control}
                                render={({ field }) => {
                                    const isChecked = field.value.includes(role.id);
                                    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                        const roleId = Number(e.target.value);
                                        const updatedRoles = isChecked
                                            ? field.value.filter((id: number) => id !== roleId)
                                            : [...field.value, roleId];
                                        field.onChange(updatedRoles);
                                    };
                                    return (
                                        <div className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                id={`role-${role.id}`}
                                                value={role.id}
                                                checked={isChecked}
                                                onChange={onChange}
                                            />
                                            <label htmlFor={`role-${role.id}`}>{role.name}</label>
                                        </div>
                                    );
                                }}
                            />
                        ))}
                    </div>
                    {errors.roleIds && <span className="error-text">{(errors.roleIds as any).message}</span>}
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-btn">Сохранить изменения</button>
                    <button type="button" className="cancel-btn" onClick={() => navigate('/users')}>Отмена</button>
                </div>
            </form>
        </>
    );
};

export default UserRoleForm;