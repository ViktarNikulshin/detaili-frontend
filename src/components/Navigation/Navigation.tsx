import React, { useState, useRef, useEffect } from 'react'; // <-- Импортируем useRef и useEffect
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

    // 1. Создаем ref для контейнера меню
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

    const handleReport = () => {
        setIsMenuOpen(false);
        alert("Переход к странице отчетов (в разработке).");
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

    // 2. Логика закрытия меню при клике вне его
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Если меню открыто И клик был вне элемента, на который ссылается menuRef
            if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        // Добавляем обработчик события при монтировании/открытии
        document.addEventListener('mousedown', handleClickOutside);

        // Очищаем обработчик события при размонтировании/закрытии
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]); // Зависимость от isMenuOpen гарантирует, что хук переподключается при изменении состояния

    return (
        <nav className="navigation">
            <div className="nav-brand">
                <Link to="/">AutoService</Link>
            </div>

            <div className="nav-actions">
                {isMaster && (<button className="create-order-btn" onClick={handleCreateOrder}>
                    <span className="button-text-desktop">+ Создать заказ</span>
                    <span className="button-icon-mobile">+</span>
                </button>)}
            </div>

            {/* 3. Оборачиваем навигационный блок в div с ref */}
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