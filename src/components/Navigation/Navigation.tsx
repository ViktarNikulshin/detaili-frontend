// src/components/Navigation/Navigation.tsx

import React, {useState} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../asserts/a593d73d858fdafbbe4065de23f69533.jpg'
import './Navigation.css'
// import {useState} from "react";

const Navigation: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogoutAndClose = () => {
        setIsMenuOpen(false);
        logout();
        navigate('/login');
    };

    // НОВЫЙ ОБРАБОТЧИК для перехода в профиль
    const handleProfile = () => {
        setIsMenuOpen(false);
        navigate('/profile'); // Переход на новую страницу
    };

    const handleReport = () => {
        setIsMenuOpen(false);
        alert("Переход к странице отчетов (в разработке).");
    }

    const handleCreateOrder = () => {
        navigate('/orders/new');
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    }

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
                    <span className="button-text-desktop">+ Создать заказ</span>
                    <span className="button-icon-mobile">+</span>
                </button>
            </div>

            <div className="nav-user">
                <span>{user?.firstName}</span>
                <span className="user-role">({user?.roles.map(r => r.name).join(', ')})</span>

                <button onClick={toggleMenu} className="menu-toggle-btn">
                    ☰
                </button>

                {isMenuOpen && (
                    <div className="dropdown-menu">
                        {isAdmin && (
                            <div className="menu-item" onClick={handleReport}>
                                Отчет
                            </div>
                        )}
                        {/* НОВЫЙ ПУНКТ МЕНЮ "Профиль" */}
                        <div className="menu-item" onClick={handleProfile}>
                            Профиль
                        </div>
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