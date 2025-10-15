import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/authApi';
import './Login.css';
import logo from "../asserts/a593d73d858fdafbbe4065de23f69533.jpg";

const Login: React.FC = () => {
    const [credentials, setCredentials] = useState({
        username: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Перенаправляем если уже авторизован
    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCredentials(prev => ({
            ...prev,
            [name]: value
        }));

        // Очищаем ошибку при изменении поля
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Валидация
        if (!credentials.username.trim() || !credentials.password.trim()) {
            setError('Все поля обязательны для заполнения');
            setLoading(false);
            return;
        }

        try {
            const response = await authAPI.login(credentials);
            login(response.token, response.user);

            // Перенаправляем на предыдущую страницу или на главную
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });

        } catch (err: any) {
            console.error('Login error:', err);
            setError(
                err.response?.data?.message ||
                'Неверное имя пользователя или пароль'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = (role: 'MANAGER' | 'ADMIN' | 'MASTER') => {
        const demoCredentials = {
            MANAGER: { username: 'manager', password: 'manager123' },
            ADMIN: { username: 'admin', password: 'admin123' },
            MASTER: { username: 'master', password: 'master123' },
        };

        setCredentials(demoCredentials[role]);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src={logo} alt="Cristal Car Logo" className="nav-logo" />
                    <h1>Crystal car</h1>
                    <p>Войдите в свою учетную запись</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username" className="form-label">
                            Имя пользователя
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={credentials.username}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="Введите имя пользователя"
                            disabled={loading}
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Пароль
                        </label>
                        <div className="password-input-container">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={credentials.password}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="Введите пароль"
                                disabled={loading}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={loading}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading || !credentials.username || !credentials.password}
                    >
                        {loading ? (
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                                Вход...
                            </div>
                        ) : (
                            'Войти'
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>© 2025 Детейлинг Сервис CRYSTAL_CAR. Все права защищены.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;