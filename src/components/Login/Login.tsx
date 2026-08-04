import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useAuth} from '../../contexts/AuthContext';
import {authAPI} from '../../services/authApi';
import './Login.css';
import logo from "../asserts/fd6cad63-cb26-4d08-bcf6-0c4f7d152eed.jpg";
import {isMasterUser} from "../../utils/auth";

const Login: React.FC = () => {
    const [credentials, setCredentials] = useState({
        username: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Достаем user изAuthContext
    const {login, isAuthenticated, user} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Вспомогательная функция определения целевого пути по роли
    const getTargetPath = (userData: any) => {
        return isMasterUser(userData) ? '/calendar' : '/';
    };

    // Перенаправляем, если уже авторизован
    useEffect(() => {
        if (isAuthenticated) {
            const targetPath = getTargetPath(user);
            navigate(targetPath, {replace: true});
        }
    }, [isAuthenticated, user, navigate, location]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setCredentials(prev => ({
            ...prev,
            [name]: value
        }));

        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!credentials.username.trim() || !credentials.password.trim()) {
            setError('Все поля обязательны для заполнения');
            setLoading(false);
            return;
        }

        try {
            const response = await authAPI.login(credentials);
            login(response.token, response.user);

            // Перенаправляем в зависимости от роли из ответа авторизации
            const targetPath = getTargetPath(response.user);
            navigate(targetPath, {replace: true});

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

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src={logo} alt="Cristal Car Logo" className="nav-logo"/>
                    <h1>CGP</h1>
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
                    <p>© 2025 Детейлинг Сервис CGP. Все права защищены.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;