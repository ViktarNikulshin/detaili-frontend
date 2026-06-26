import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // <-- Добавили useLocation
import { useAuth } from '../../contexts/AuthContext';
import logo from '../asserts/fd6cad63-cb26-4d08-bcf6-0c4f7d152eed.jpg'
import './Navigation.css'

const Navigation: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // <-- Получаем объект текущего местоположения

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isNotMaster = !!user?.roles?.some(role => role.name === 'ADMIN' || role.name === 'MANAGER');
    const isAdmin = user?.roles?.some(r => r.name === 'ADMIN');

    // Проверяем, находится ли пользователь именно на странице календаря
    const isCalendarPage = location.pathname === '/calendar';

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

    const handleMasterSalary = () => {
        setIsMenuOpen(false);
        navigate('/reports/salary-log');
    }

    const handleTimesheet = () => {
        setIsMenuOpen(false);
        navigate('/reports/time-sheet');
    }

    const handleCalendar = () => {
        setIsMenuOpen(false);
        navigate('/calendar');
    }

    const handleFinanceReport = () => {
        setIsMenuOpen(false);
        navigate('/reports/finance-report');
    }
    const handleActsReport = () => {
        setIsMenuOpen(false);
        navigate('/reports/acts-report');
    }
    const handleLandlordReport = () => {
        setIsMenuOpen(false);
        navigate('/reports/landlord-report');
    }

    const handleReport = () => {
        setIsMenuOpen(false);
        navigate('/reports/masters');
    }

    const handleUsersAndRoles = () => {
        setIsMenuOpen(false);
        navigate('/users');
    };

    const handleWorkDictionary = () => {
        setIsMenuOpen(false);
        navigate('/dictionaries/work-types');
    };

    const handleCreateOrder = () => {
        navigate('/orders/new');
    };

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

            {/* --- ИЗМЕНЕНО УСЛОВИЕ ОТОБРАЖЕНИЯ --- */}
            <div className="nav-actions">
                {isNotMaster && isCalendarPage && ( // Показываем, если Админ И страница календаря
                    <button className="create-order-btn" onClick={handleCreateOrder}>
                        <span className="button-text-desktop">+ Создать заказ</span>
                        <span className="button-icon-mobile">+</span>
                    </button>
                )}
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
                        <div className="menu-item" onClick={handleCalendar}>
                            Календарь
                        </div>
                        {isAdmin && (
                            <>
                                <div className="menu-item" onClick={handleMasterSalary}>
                                    Ведение ЗП 🛠️
                                </div>
                                <div className="menu-item" onClick={handleTimesheet}>
                                    Табель
                                </div>
                                <div className="menu-item" onClick={handleFinanceReport}>
                                    Отчет по 💵
                                </div>
                                <div className="menu-item" onClick={handleActsReport}>
                                    Аналитика по актам
                                </div>
                                <div className="menu-item" onClick={handleLandlordReport}>
                                    Доп. соглашение с арендодателем
                                </div>
                                {/*<div className="menu-item" onClick={handleReport}>*/}
                                {/*    Отчет*/}
                                {/*</div>*/}
                                <div className="menu-item" onClick={handleUsersAndRoles}>
                                    Пользователи и роли
                                </div>
                                {/*<div className="menu-item" onClick={handleWorkDictionary}>*/}
                                {/*    Справочник работ*/}
                                {/*</div>*/}
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