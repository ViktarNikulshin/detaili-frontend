import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../asserts/fd6cad63-cb26-4d08-bcf6-0c4f7d152eed.jpg'
import './Navigation.css'

const Navigation: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isMaster = !!user?.roles?.some(role => role.name === 'MASTER');
    const isAdmin = user?.roles?.some(r => r.name === 'ADMIN');

    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogoutAndClose = () => {
        setIsMenuOpen(false);
        logout();
        navigate('/login');
    };

    const handleProfile = () => {
        setIsMenuOpen(false);
        navigate('/profile');
    };

    // --- ИЗМЕНЕНО ---
    const handleReport = () => {
        setIsMenuOpen(false);
        navigate('/reports/masters'); // <-- Переход на страницу отчетов
    }

    const handleUsersAndRoles = () => {
        setIsMenuOpen(false);
        navigate('/users');
    };

    // --- НОВАЯ ФУНКЦИЯ ДЛЯ ПЕРЕХОДА НА СТРАНИЦУ СПРАВОЧНИКА ---
    const handleWorkDictionary = () => {
        setIsMenuOpen(false);
        // Предполагаемый путь для формы управления справочником
        navigate('/dictionaries/work-types');
    };

    const handleCreateOrder = () => {
        navigate('/orders/new');
    };

    // Логика закрытия меню при клике вне его (оставлена без изменений)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <nav className="navigation">
            <div className="nav-brand">
                <img src={logo} alt="CGP" className="nav-logo" />
                <Link to="/">CGP</Link>
            </div>

            <div className="nav-actions">
                {!isMaster && (<button className="create-order-btn" onClick={handleCreateOrder}>
                    <span className="button-text-desktop">+ Создать заказ</span>
                    <span className="button-icon-mobile">+</span>
                </button>)}
            </div>

            <div className="nav-user" ref={menuRef}>
                <span>{user?.firstName}</span>
                <span className="user-role">({user?.roles.map(r => r.name).join(', ')})</span>

                <button onClick={toggleMenu} className="menu-toggle-btn">
                    ☰
                </button>

                {isMenuOpen && (
                    <div className="dropdown-menu">

                        <div className="menu-item" onClick={handleProfile}>
                            Профиль
                        </div>
                        {isAdmin && (
                            <>

                                <div className="menu-item" onClick={handleReport}>
                                    Отчет
                                </div>
                                <div className="menu-item" onClick={handleUsersAndRoles}>
                                    Пользователи и роли
                                </div>
                                {/* НОВЫЙ ПУНКТ МЕНЮ ДЛЯ ADMIN */}
                                <div className="menu-item" onClick={handleWorkDictionary}>
                                    Справочник работ
                                </div>

                            </>
                        )}
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