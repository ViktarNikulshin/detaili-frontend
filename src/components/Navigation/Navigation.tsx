import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../asserts/fd6cad63-cb26-4d08-bcf6-0c4f7d152eed.jpg';
import {
    FaCalendarAlt,
    FaCalendarDay,
    FaMoneyCheckAlt,
    FaUserClock,
    FaClock,
    FaMoneyBillWave,
    FaChartBar,
    FaFileContract,
    FaExclamationTriangle,
    FaHandshake,
    FaUsersCog,
    FaAddressBook,
    FaTools,
    FaCog,
    FaUser,
    FaSignOutAlt,
    FaBars,
} from 'react-icons/fa';
import './Navigation.css';

interface MenuItem {
    label: string;
    path: string;
    icon: React.ReactNode;
}

const Navigation: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const isAdmin = user?.roles?.some(r => r.name === 'ADMIN');
    const userMenuRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        setIsUserMenuOpen(false);
        logout();
        navigate('/login');
    };

    const handleProfile = () => {
        setIsUserMenuOpen(false);
        navigate('/profile');
    };

    // Закрываем меню пользователя при клике вне его области
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Закрываем сайдбар и меню пользователя по клавише Escape
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSidebarOpen(false);
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const mainMenu: MenuItem[] = [
        { label: 'Календарь', path: '/calendar', icon: <FaCalendarAlt /> },
    ];

    const adminMenu: MenuItem[] = [
        { label: 'Ведение ЗП 🛠️', path: '/reports/salary-log', icon: <FaMoneyCheckAlt /> },
        { label: 'Продуктивность сотрудника', path: '/reports/productivity', icon: <FaUserClock /> },
        { label: 'Табель', path: '/reports/time-sheet', icon: <FaClock /> },
        { label: 'Отчет по 💵', path: '/reports/finance-report', icon: <FaMoneyBillWave /> },
        { label: 'Аналитика по актам', path: '/reports/acts-report', icon: <FaChartBar /> },
        { label: 'Доп. соглашение с арендодателем', path: '/reports/landlord-report', icon: <FaFileContract /> },
        { label: 'Долги', path: '/reports/debts-report', icon: <FaExclamationTriangle /> },
        { label: 'Долги партнёрам', path: '/reports/partner-debts-report', icon: <FaHandshake /> },
        { label: 'Пользователи и роли', path: '/users', icon: <FaUsersCog /> },
        { label: 'Клиентская база', path: '/clients', icon: <FaAddressBook /> },
        { label: 'Платёжный календарь', path: '/reports/payment-calendar', icon: <FaCalendarDay /> },
        { label: 'Справочник работ', path: '/dictionaries/work-types', icon: <FaTools /> },
    ];

    const renderSidebarLink = (item: MenuItem) => (
        <NavLink
            key={item.path}
            to={item.path}
            className="sidebar-menu-item"
            onClick={() => setIsSidebarOpen(false)}
        >
            <span className="sidebar-menu-icon">{item.icon}</span>
            <span>{item.label}</span>
        </NavLink>
    );

    return (
        <>
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <img src={logo} alt="CGP" className="sidebar-logo" />
                    <Link to="/">CGP</Link>
                </div>
                <nav className="sidebar-menu">
                    {mainMenu.map(renderSidebarLink)}
                    {isAdmin && adminMenu.map(renderSidebarLink)}
                </nav>
            </aside>

            {isSidebarOpen && (
                <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
            )}

            <header className="topbar">
                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    aria-label="Открыть меню"
                >
                    <FaBars />
                </button>

                <div className="topbar-user" ref={userMenuRef}>
                    <div className="user-avatar">{user?.firstName?.charAt(0) ?? '?'}</div>
                    <div className="user-info">
                        <span className="user-name">{user?.firstName}</span>
                        <span className="user-role">({user?.roles.map(r => r.name).join(', ')})</span>
                    </div>
                    <button
                        type="button"
                        className={`user-menu-toggle ${isUserMenuOpen ? 'open' : ''}`}
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        aria-label="Меню пользователя"
                        aria-expanded={isUserMenuOpen}
                    >
                        <FaCog />
                    </button>

                    {isUserMenuOpen && (
                        <div className="dropdown-menu">
                            <div className="menu-item" onClick={handleProfile}>
                                <FaUser />
                                <span>Профиль</span>
                            </div>
                            <div className="menu-item logout-menu-item" onClick={handleLogout}>
                                <FaSignOutAlt />
                                <span>Выйти</span>
                            </div>
                        </div>
                    )}
                </div>
            </header>
        </>
    );
};

export default Navigation;
