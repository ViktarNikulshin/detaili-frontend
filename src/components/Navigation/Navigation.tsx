import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../asserts/a593d73d858fdafbbe4065de23f69533.jpg'
import './Navigation.css'

const Navigation: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Новое состояние для меню

    const handleLogoutAndClose = () => {
        setIsMenuOpen(false);
        logout();
        navigate('/login');
    };

    // Placeholder for report logic
    const handleReport = () => {
        setIsMenuOpen(false);
        // navigate('/report'); // Раскомментировать, когда появится страница отчета
        alert("Переход к странице отчетов (в разработке).");
    }

    const handleCreateOrder = () => {
        navigate('/orders/new');
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    }

    // Проверка роли пользователя
    const isAdmin = user?.roles?.some(r => r.name === 'ADMIN');

    return (
        <nav className="navigation">
            <div className="nav-brand">
                <img src={logo} alt="Cristal Car Logo" className="nav-logo" />
                <Link to="/">CRISTAL CAR</Link>
            </div>

            <div className="calendar-actions">
                <button
                    className="btn btn-primary create-order-btn"
                    onClick={handleCreateOrder}
                >
                    {/* Текст для десктопа */}
                    <span className="button-text-desktop">+ Создать заказ</span>
                    {/* Иконка для мобильной версии */}
                    <span className="button-icon-mobile">+</span>
                </button>
            </div>

            <div className="nav-user">
                <span>{user?.firstName}</span>
                <span className="user-role">({user?.roles.map(r => r.name)})</span>

                {/* 1. Кнопка БУРГЕР-МЕНЮ */}
                <button onClick={toggleMenu} className="menu-toggle-btn">
                    ☰
                </button>

                {/* 2. ВЫПАДАЮЩЕЕ МЕНЮ */}
                {isMenuOpen && (
                    <div className="dropdown-menu">
                        {/* Пункт "Отчет" виден только ADMIN */}
                        {isAdmin && (
                            <div className="menu-item" onClick={handleReport}>
                                Отчет
                            </div>
                        )}
                        {/* Пункт "Выйти" */}
                        <div className="menu-item logout-menu-item" onClick={handleLogoutAndClose}>
                            Выйти
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navigation;