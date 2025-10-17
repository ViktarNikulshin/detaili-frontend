import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Импортируем useNavigate
import { userAPI } from '../../services/userApi';
import { User } from '../../types/user';
import './Users.css';

const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate(); // Инициализируем хук

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await userAPI.getAllUsers();
                setUsers(response.data);
            } catch (err) {
                setError('Не удалось загрузить список пользователей.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    if (loading) return <p className="users-message">Загрузка пользователей...</p>;
    if (error) return <p className="users-message error">{error}</p>;

    return (
        <div className="users-container">
            <div className="users-header">
                <h1>Пользователи и роли</h1>
                <button
                    className="add-user-btn"
                    onClick={() => navigate('/users/new')}
                >
                    <span className="button-text-desktop">+ Добавить пользователя</span>
                    <span className="button-icon-mobile">+</span>
                </button>
            </div>
            <div className="users-list">
                {users.map(user => (
                    <div key={user.id} className="user-item">
                        <div className="user-info">
                            <span className="user-name">{user.firstName} {user.lastName}</span>
                            <span className="user-roles">
                                Роли: {user.roles?.map(r => r.name).join(', ') || 'Нет ролей'}
                            </span>
                        </div>
                        <Link to={`/users/${user.id}`} className="user-edit-link">
                            Редактировать роли
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Users;