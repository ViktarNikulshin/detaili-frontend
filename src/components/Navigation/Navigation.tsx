import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../asserts/a593d73d858fdafbbe4065de23f69533.jpg'
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

    const handleCreateOrder = () => {
        navigate('/orders/new');
    };

    const toggleMenu = () => {
        setIsMenuOpen(prev => !prev);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <nav className="navigation">
            <div className="nav-brand">
                <img src={logo} alt="Crystal Car Logo" className="nav-logo" />
                <Link to="/">CRYSTAL CAR</Link>
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
                        {isAdmin && (
                            <>
                                <div className="menu-item" onClick={handleReport}>
                                    Отчет
                                </div>
                                <div className="menu-item" onClick={handleUsersAndRoles}>
                                    Пользователи и роли
                                </div>
                            </>
                        )}
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